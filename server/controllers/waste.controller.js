const prisma = require('../utils/db');
const { createNotification } = require('../utils/notification');

const getWasteLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { startDate, endDate, category, filterUserId } = req.query;

    const whereClause = {};

    // RBAC: RESTAURANT can only see their own waste logs
    if (userRole === 'RESTAURANT') {
      whereClause.userId = userId;
    } else if (filterUserId) {
      // Admin/NGO can filter by a specific user if requested
      whereClause.userId = filterUserId;
    }

    // Date range filter
    if (startDate || endDate) {
      whereClause.loggedAt = {};
      if (startDate) {
        whereClause.loggedAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.loggedAt.lte = new Date(endDate);
      }
    }

    // Food category filter
    if (category) {
      whereClause.foodItem = {
        category: category
      };
    }

    const logs = await prisma.wasteLog.findMany({
      where: whereClause,
      include: {
        foodItem: {
          include: {
            user: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { loggedAt: 'desc' }
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error('Get waste logs error:', error);
    res.status(500).json({ message: 'Server error retrieving waste logs' });
  }
};

const addWasteLog = async (req, res) => {
  try {
    const userId = req.user.id;
    const { foodItemId, quantityWasted, reason } = req.body;

    if (!foodItemId || quantityWasted === undefined || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const qtyWasted = parseFloat(quantityWasted);
    if (isNaN(qtyWasted) || qtyWasted <= 0) {
      return res.status(400).json({ message: 'Quantity wasted must be greater than zero' });
    }

    // Find food item inventory
    const inventory = await prisma.inventory.findFirst({
      where: { foodItemId },
      include: { foodItem: true }
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory record not found for this food item' });
    }

    // Check authorization: must own the food item (unless ADMIN)
    if (inventory.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this food item' });
    }

    // Validate that we don't waste more than current stock
    if (inventory.currentStock < qtyWasted) {
      return res.status(400).json({ 
        message: `Insufficient stock. Current stock is ${inventory.currentStock} ${inventory.foodItem.unit}, but tried to log ${qtyWasted} as waste.` 
      });
    }

    // Perform transaction: deduct stock, add waste log
    const log = await prisma.$transaction(async (tx) => {
      const newStock = inventory.currentStock - qtyWasted;

      // Update Inventory
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { currentStock: newStock }
      });

      // Synchronize with FoodItem quantity
      await tx.foodItem.update({
        where: { id: foodItemId },
        data: { quantity: newStock }
      });

      // Create Waste Log
      const wasteLog = await tx.wasteLog.create({
        data: {
          foodItemId,
          quantityWasted: qtyWasted,
          reason,
          userId
        },
        include: {
          foodItem: true
        }
      });

      return wasteLog;
    });

    // Check for low stock alert asynchronously
    const finalStock = inventory.currentStock - qtyWasted;
    if (finalStock <= inventory.minStockAlert) {
      createNotification(
        userId,
        'Low Stock Alert!',
        `Your inventory of ${inventory.foodItem.name} has fallen to ${finalStock} ${inventory.foodItem.unit} (threshold: ${inventory.minStockAlert}).`,
        'WARNING'
      );
    }

    res.status(201).json(log);
  } catch (error) {
    console.error('Add waste log error:', error);
    res.status(500).json({ message: 'Server error saving waste log' });
  }
};

const updateWasteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { quantityWasted, reason } = req.body;

    const existingLog = await prisma.wasteLog.findUnique({
      where: { id },
      include: { foodItem: true }
    });

    if (!existingLog) {
      return res.status(404).json({ message: 'Waste log not found' });
    }

    // Auth check
    if (existingLog.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You cannot modify this log' });
    }

    const updateData = {};
    if (reason) updateData.reason = reason;

    if (quantityWasted !== undefined) {
      const newQtyWasted = parseFloat(quantityWasted);
      if (isNaN(newQtyWasted) || newQtyWasted <= 0) {
        return res.status(400).json({ message: 'Quantity wasted must be greater than zero' });
      }

      // Find the inventory
      const inventory = await prisma.inventory.findFirst({
        where: { foodItemId: existingLog.foodItemId }
      });

      if (!inventory) {
        return res.status(404).json({ message: 'Inventory record not found' });
      }

      // Calculate difference in waste
      const wasteDiff = newQtyWasted - existingLog.quantityWasted;

      // Check if we have enough stock to support this increase in waste
      if (inventory.currentStock < wasteDiff) {
        return res.status(400).json({
          message: `Cannot increase waste log. Insufficient stock in inventory (current stock: ${inventory.currentStock}).`
        });
      }

      updateData.quantityWasted = newQtyWasted;

      const log = await prisma.$transaction(async (tx) => {
        const finalStock = inventory.currentStock - wasteDiff;

        // Update Inventory
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { currentStock: finalStock }
        });

        // Synchronize FoodItem
        await tx.foodItem.update({
          where: { id: existingLog.foodItemId },
          data: { quantity: finalStock }
        });

        // Update Waste Log
        return await tx.wasteLog.update({
          where: { id },
          data: updateData,
          include: { foodItem: true }
        });
      });

      return res.status(200).json(log);
    }

    // If only reason is updated
    const updated = await prisma.wasteLog.update({
      where: { id },
      data: updateData,
      include: { foodItem: true }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Update waste log error:', error);
    res.status(500).json({ message: 'Server error updating waste log' });
  }
};

const deleteWasteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingLog = await prisma.wasteLog.findUnique({
      where: { id }
    });

    if (!existingLog) {
      return res.status(404).json({ message: 'Waste log not found' });
    }

    if (existingLog.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You cannot delete this log' });
    }

    // Revert inventory stock
    await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findFirst({
        where: { foodItemId: existingLog.foodItemId }
      });

      if (inventory) {
        const restoredStock = inventory.currentStock + existingLog.quantityWasted;
        
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { currentStock: restoredStock }
        });

        await tx.foodItem.update({
          where: { id: existingLog.foodItemId },
          data: { quantity: restoredStock }
        });
      }

      await tx.wasteLog.delete({
        where: { id }
      });
    });

    res.status(200).json({ message: 'Waste log deleted and stock restored' });
  } catch (error) {
    console.error('Delete waste log error:', error);
    res.status(500).json({ message: 'Server error deleting waste log' });
  }
};

module.exports = {
  getWasteLogs,
  addWasteLog,
  updateWasteLog,
  deleteWasteLog
};

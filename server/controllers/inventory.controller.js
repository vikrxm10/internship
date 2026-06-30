const prisma = require('../utils/db');

const getInventory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let inventories;

    if (userRole === 'ADMIN') {
      inventories = await prisma.inventory.findMany({
        include: {
          foodItem: {
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          }
        },
        orderBy: { lastUpdated: 'desc' }
      });
    } else {
      inventories = await prisma.inventory.findMany({
        where: { userId },
        include: {
          foodItem: true
        },
        orderBy: { lastUpdated: 'desc' }
      });
    }

    res.status(200).json(inventories);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error retrieving inventory' });
  }
};

const addInventoryItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, category, quantity, unit, expiryDate, minStockAlert } = req.body;

    if (!name || !category || quantity === undefined || !unit || !expiryDate) {
      return res.status(400).json({ message: 'Missing required food item fields' });
    }

    const qty = parseFloat(quantity);
    const minAlert = minStockAlert !== undefined ? parseFloat(minStockAlert) : 0;

    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ message: 'Quantity must be a positive number' });
    }

    // Run in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const foodItem = await tx.foodItem.create({
        data: {
          name,
          category,
          quantity: qty,
          unit,
          expiryDate: new Date(expiryDate),
          userId
        }
      });

      const inventory = await tx.inventory.create({
        data: {
          foodItemId: foodItem.id,
          currentStock: qty,
          minStockAlert: minAlert,
          userId
        },
        include: {
          foodItem: true
        }
      });

      return inventory;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Add inventory error:', error);
    res.status(500).json({ message: 'Server error creating inventory item' });
  }
};

const updateInventoryStock = async (req, res) => {
  try {
    const { id } = req.params; // Inventory ID
    const userId = req.user.id;
    const userRole = req.user.role;
    const { currentStock, minStockAlert } = req.body;

    if (currentStock === undefined && minStockAlert === undefined) {
      return res.status(400).json({ message: 'Provide currentStock or minStockAlert to update' });
    }

    // Find inventory
    const inventory = await prisma.inventory.findUnique({
      where: { id },
      include: { foodItem: true }
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Authorization: only the owner or an Admin can update
    if (inventory.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this inventory item' });
    }

    const updateData = {};
    if (currentStock !== undefined) {
      const stock = parseFloat(currentStock);
      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({ message: 'Stock must be a positive number' });
      }
      updateData.currentStock = stock;
    }

    if (minStockAlert !== undefined) {
      const alertVal = parseFloat(minStockAlert);
      if (isNaN(alertVal) || alertVal < 0) {
        return res.status(400).json({ message: 'Alert level must be a positive number' });
      }
      updateData.minStockAlert = alertVal;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedInventory = await tx.inventory.update({
        where: { id },
        data: updateData,
        include: { foodItem: true }
      });

      // Synchronize with FoodItem quantity
      if (currentStock !== undefined) {
        await tx.foodItem.update({
          where: { id: updatedInventory.foodItemId },
          data: { quantity: parseFloat(currentStock) }
        });
      }

      return updatedInventory;
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ message: 'Server error updating inventory item' });
  }
};

const getInventoryAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // We consider:
    // 1. Low stock: currentStock <= minStockAlert
    // 2. Expiry alert: expiryDate <= 3 days from now
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    let lowStockItems;
    let expiringItems;

    if (userRole === 'ADMIN') {
      // Find all low stock
      lowStockItems = await prisma.inventory.findMany({
        where: {
          currentStock: {
            lte: prisma.inventory.fields.minStockAlert
          }
        },
        include: {
          foodItem: { include: { user: { select: { name: true } } } }
        }
      });

      // Find all expiring items
      expiringItems = await prisma.inventory.findMany({
        where: {
          foodItem: {
            expiryDate: {
              lte: threeDaysFromNow
            }
          }
        },
        include: {
          foodItem: { include: { user: { select: { name: true } } } }
        }
      });
    } else {
      // Find low stock for this user
      const allUserItems = await prisma.inventory.findMany({
        where: { userId },
        include: { foodItem: true }
      });

      lowStockItems = allUserItems.filter(item => item.currentStock <= item.minStockAlert);
      
      expiringItems = await prisma.inventory.findMany({
        where: {
          userId,
          foodItem: {
            expiryDate: {
              lte: threeDaysFromNow
            }
          }
        },
        include: {
          foodItem: true
        }
      });
    }

    res.status(200).json({
      lowStock: lowStockItems,
      expiringSoon: expiringItems
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Server error retrieving alerts' });
  }
};

module.exports = {
  getInventory,
  addInventoryItem,
  updateInventoryStock,
  getInventoryAlerts
};

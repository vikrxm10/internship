const prisma = require('../utils/db');
const { sendDonationNotification } = require('../utils/email');
const { createNotification, notifyAllNGOs, notifyAllAdmins } = require('../utils/notification');

const getDonations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let donations;

    if (userRole === 'ADMIN') {
      donations = await prisma.donation.findMany({
        include: {
          foodItem: true,
          donor: { select: { name: true, email: true, location: true } },
          recipient: { select: { name: true, email: true, location: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (userRole === 'RESTAURANT') {
      donations = await prisma.donation.findMany({
        where: { donorId: userId },
        include: {
          foodItem: true,
          recipient: { select: { name: true, email: true, location: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (userRole === 'NGO') {
      // NGO sees donations they have accepted, OR general pending donations
      donations = await prisma.donation.findMany({
        where: {
          OR: [
            { recipientId: userId },
            { status: 'PENDING' }
          ]
        },
        include: {
          foodItem: true,
          donor: { select: { name: true, email: true, location: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.status(200).json(donations);
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Server error retrieving donations' });
  }
};

const scheduleDonation = async (req, res) => {
  try {
    const donorId = req.user.id;
    const { foodItemId, quantityToDonate, pickupLocation, pickupLat, pickupLng, scheduledAt } = req.body;

    if (!foodItemId || !pickupLocation || pickupLat === undefined || pickupLng === undefined || !scheduledAt) {
      return res.status(400).json({ message: 'Missing required donation fields' });
    }

    const inventory = await prisma.inventory.findFirst({
      where: { foodItemId },
      include: { foodItem: true }
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    if (inventory.userId !== donorId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this inventory item' });
    }

    // Determine quantity to donate (default to current stock if not specified)
    const qtyToDonate = quantityToDonate ? parseFloat(quantityToDonate) : inventory.currentStock;

    if (isNaN(qtyToDonate) || qtyToDonate <= 0) {
      return res.status(400).json({ message: 'Invalid quantity to donate' });
    }

    if (inventory.currentStock < qtyToDonate) {
      return res.status(400).json({ 
        message: `Insufficient stock to donate. Available: ${inventory.currentStock}, requested: ${qtyToDonate}` 
      });
    }

    const donation = await prisma.$transaction(async (tx) => {
      // Deduct quantity from inventory
      const updatedStock = inventory.currentStock - qtyToDonate;
      
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { currentStock: updatedStock }
      });

      // Synchronize with FoodItem
      await tx.foodItem.update({
        where: { id: foodItemId },
        data: { quantity: updatedStock }
      });

      // Create a copy or refer to FoodItem? Since the schema has Donation pointing to foodItemId,
      // it is cleaner if we split the foodItem or just link to it. If we link to it directly,
      // the donation quantity is represented by the deducted amount. Let's make sure the donation record
      // stores the fact that we donated a specific amount.
      // Wait, let's look at the database schema for Donation:
      // Donation: id, foodItemId, donorId, recipientId, status, pickupLocation, pickupLat, pickupLng, scheduledAt, createdAt.
      // Since Donation doesn't have a quantity field itself in the prompt schema, we can assume that the
      // FoodItem quantity or state represents the donation, or we can just deduct from inventory and create the donation.
      // Wait, if Donation doesn't have a quantity, we can create a sub-food item representing the donation if we want,
      // or we can just update the main FoodItem quantity and assume the whole FoodItem is donated, OR we can add a quantity
      // to Donation. Let's look at the prompt schema:
      // User, FoodItem, WasteLog, Donation, Inventory.
      // Since FoodItem has name, category, quantity, unit, expiryDate, userId, createdAt.
      // If a Restaurant schedules a donation, they can donate the whole food item, or we can split the food item.
      // Let's split it: create a new FoodItem representing the donated portion, and link the Donation to it!
      // This is extremely elegant and preserves the schema perfectly while allowing partial donations!
      // Let's implement this!

      // Always create a new food item representing the donated portion.
      // This ensures the donation record preserves the correct quantity (qtyToDonate)
      // while the original inventory item's quantity can be successfully reduced to 0 or its remaining stock.
      const donatedFoodItem = await tx.foodItem.create({
        data: {
          name: inventory.foodItem.name,
          category: inventory.foodItem.category,
          quantity: qtyToDonate,
          unit: inventory.foodItem.unit,
          expiryDate: inventory.foodItem.expiryDate,
          userId: donorId
        }
      });

      const newDonation = await tx.donation.create({
        data: {
          foodItemId: donatedFoodItem.id,
          donorId,
          status: 'PENDING',
          pickupLocation,
          pickupLat: parseFloat(pickupLat),
          pickupLng: parseFloat(pickupLng),
          scheduledAt: new Date(scheduledAt)
        },
        include: {
          foodItem: true,
          donor: { select: { name: true, email: true } }
        }
      });

      return newDonation;
    });

    // Trigger in-app notifications asynchronously
    notifyAllNGOs(
      'New Donation Available!',
      `${donation.donor.name} has scheduled a donation of ${donation.foodItem.quantity} ${donation.foodItem.unit} of ${donation.foodItem.name}.`,
      'DONATION'
    );
    notifyAllAdmins(
      'New Donation Scheduled',
      `${donation.donor.name} scheduled a donation of ${donation.foodItem.quantity} ${donation.foodItem.unit} of ${donation.foodItem.name}.`,
      'INFO'
    );

    res.status(201).json(donation);
  } catch (error) {
    console.error('Schedule donation error:', error);
    res.status(500).json({ message: 'Server error scheduling donation' });
  }
};

const updateDonationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PENDING | ACCEPTED | COMPLETED | CANCELLED
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!status || !['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const donation = await prisma.donation.findUnique({
      where: { id },
      include: {
        foodItem: true,
        donor: true,
        recipient: true
      }
    });

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const newStatus = status.toUpperCase();

    // Check permissions & rules for transition
    if (newStatus === 'ACCEPTED') {
      if (userRole !== 'NGO' && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Only NGOs or Admins can accept donations' });
      }
      if (donation.status !== 'PENDING') {
        return res.status(400).json({ message: `Cannot accept donation in ${donation.status} status` });
      }
    } else if (newStatus === 'COMPLETED') {
      // Completed by NGO (recipient) or Admin, or donor
      if (donation.status !== 'ACCEPTED') {
        return res.status(400).json({ message: 'Donation must be ACCEPTED before it can be COMPLETED' });
      }
      if (donation.recipientId !== userId && donation.donorId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: You are not a party to this donation' });
      }
    } else if (newStatus === 'CANCELLED') {
      if (donation.donorId !== userId && donation.recipientId !== userId && userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: You cannot cancel this donation' });
      }
      if (donation.status === 'COMPLETED' || donation.status === 'CANCELLED') {
        return res.status(400).json({ message: `Donation already ${donation.status.toLowerCase()}` });
      }
    }

    const updatedDonation = await prisma.$transaction(async (tx) => {
      const dataUpdate = { status: newStatus };

      if (newStatus === 'ACCEPTED') {
        dataUpdate.recipientId = userId;
      }

      const updated = await tx.donation.update({
        where: { id },
        data: dataUpdate,
        include: {
          foodItem: true,
          donor: { select: { id: true, name: true, email: true } },
          recipient: { select: { id: true, name: true, email: true } }
        }
      });

      // Handle stock replenishment upon cancellation
      if (newStatus === 'CANCELLED') {
        // Look up if there's an inventory record for this donor + food item name
        const inventory = await tx.inventory.findFirst({
          where: {
            userId: donation.donorId,
            foodItem: {
              name: donation.foodItem.name
            }
          }
        });

        if (inventory) {
          const restoredStock = inventory.currentStock + donation.foodItem.quantity;
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { currentStock: restoredStock }
          });
          await tx.foodItem.update({
            where: { id: inventory.foodItemId },
            data: { quantity: restoredStock }
          });
        }
      }

      return updated;
    });

    // Send transactional emails asynchronously
    if (newStatus === 'ACCEPTED') {
      sendDonationNotification(updatedDonation, updatedDonation.recipient, updatedDonation.donor, 'ACCEPTED');
      
      // Trigger in-app notifications
      createNotification(
        updatedDonation.donorId,
        'Donation Accepted!',
        `${updatedDonation.recipient.name} has accepted your donation of ${updatedDonation.foodItem.name}.`,
        'SUCCESS'
      );
      notifyAllAdmins(
        'Donation Accepted',
        `${updatedDonation.recipient.name} accepted ${updatedDonation.donor.name}'s donation of ${updatedDonation.foodItem.name}.`,
        'SUCCESS'
      );
    } else if (newStatus === 'COMPLETED') {
      sendDonationNotification(updatedDonation, updatedDonation.recipient, updatedDonation.donor, 'COMPLETED');

      // Trigger in-app notifications
      createNotification(
        updatedDonation.donorId,
        'Donation Completed!',
        `Your donation of ${updatedDonation.foodItem.name} has been marked as completed. Thank you!`,
        'SUCCESS'
      );
      createNotification(
        updatedDonation.recipientId,
        'Donation Completed!',
        `Donation of ${updatedDonation.foodItem.name} from ${updatedDonation.donor.name} has been completed.`,
        'SUCCESS'
      );
      notifyAllAdmins(
        'Donation Completed',
        `Donation of ${updatedDonation.foodItem.name} from ${updatedDonation.donor.name} to ${updatedDonation.recipient.name} has been completed.`,
        'SUCCESS'
      );
    } else if (newStatus === 'CANCELLED') {
      const cancelMsg = `Donation of ${updatedDonation.foodItem.name} has been cancelled.`;
      createNotification(updatedDonation.donorId, 'Donation Cancelled', cancelMsg, 'WARNING');
      if (updatedDonation.recipientId) {
        createNotification(updatedDonation.recipientId, 'Donation Cancelled', cancelMsg, 'WARNING');
      }
      notifyAllAdmins('Donation Cancelled', cancelMsg, 'WARNING');
    }

    res.status(200).json(updatedDonation);
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(500).json({ message: 'Server error updating donation status' });
  }
};

const getAvailableDonations = async (req, res) => {
  try {
    const available = await prisma.donation.findMany({
      where: {
        status: 'PENDING',
        recipientId: null
      },
      include: {
        foodItem: true,
        donor: { select: { name: true, email: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(available);
  } catch (error) {
    console.error('Get available donations error:', error);
    res.status(500).json({ message: 'Server error retrieving available donations' });
  }
};

module.exports = {
  getDonations,
  scheduleDonation,
  updateDonationStatus,
  getAvailableDonations
};

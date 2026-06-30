const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@foodrescue.org' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@foodrescue.org',
      password: hashedPassword,
      role: 'ADMIN',
      location: 'Downtown Office, New York, NY'
    }
  });

  const restaurant1 = await prisma.user.upsert({
    where: { email: 'bistro@foodrescue.org' },
    update: {},
    create: {
      name: 'Green Bistro',
      email: 'bistro@foodrescue.org',
      password: hashedPassword,
      role: 'RESTAURANT',
      location: '123 Gourmet Ave, New York, NY'
    }
  });

  const restaurant2 = await prisma.user.upsert({
    where: { email: 'bakery@foodrescue.org' },
    update: {},
    create: {
      name: 'Daily Bakery & Cafe',
      email: 'bakery@foodrescue.org',
      password: hashedPassword,
      role: 'RESTAURANT',
      location: '456 Pastry Lane, New York, NY'
    }
  });

  const ngo1 = await prisma.user.upsert({
    where: { email: 'rescue@foodrescue.org' },
    update: {},
    create: {
      name: 'Food Rescue Alliance',
      email: 'rescue@foodrescue.org',
      password: hashedPassword,
      role: 'NGO',
      location: '789 Solidarity Blvd, New York, NY'
    }
  });

  const ngo2 = await prisma.user.upsert({
    where: { email: 'kitchen@foodrescue.org' },
    update: {},
    create: {
      name: 'Hope Community Kitchen',
      email: 'kitchen@foodrescue.org',
      password: hashedPassword,
      role: 'NGO',
      location: '101 Compassion Way, New York, NY'
    }
  });

  console.log('Users seeded:', {
    admin: admin.email,
    restaurant1: restaurant1.email,
    restaurant2: restaurant2.email,
    ngo1: ngo1.email,
    ngo2: ngo2.email
  });

  // 2. Create food items & inventories for Green Bistro
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const foodItemsData = [
    { name: 'Organic Spinach', category: 'Produce', quantity: 15, unit: 'kg', expiryDate: tomorrow },
    { name: 'Whole Wheat Sourdough', category: 'Bakery', quantity: 20, unit: 'loaves', expiryDate: tomorrow },
    { name: 'Whole Milk 1 Gallon', category: 'Dairy', quantity: 10, unit: 'bottles', expiryDate: threeDaysFromNow },
    { name: 'Grilled Chicken Breast', category: 'Meat', quantity: 18, unit: 'portions', expiryDate: fiveDaysFromNow }
  ];

  for (const itemData of foodItemsData) {
    const item = await prisma.foodItem.create({
      data: {
        name: itemData.name,
        category: itemData.category,
        quantity: itemData.quantity,
        unit: itemData.unit,
        expiryDate: itemData.expiryDate,
        userId: restaurant1.id
      }
    });

    await prisma.inventory.create({
      data: {
        foodItemId: item.id,
        currentStock: itemData.quantity,
        minStockAlert: 5,
        userId: restaurant1.id
      }
    });
  }

  // 3. Create food items & inventories for Daily Bakery & Cafe (one low stock, one expired)
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 1);

  const bakeryItemsData = [
    { name: 'Butter Croissants', category: 'Bakery', quantity: 3, unit: 'items', expiryDate: tomorrow, minStockAlert: 10 },
    { name: 'Blueberry Muffins', category: 'Bakery', quantity: 12, unit: 'items', expiryDate: expiredDate, minStockAlert: 2 }
  ];

  for (const itemData of bakeryItemsData) {
    const item = await prisma.foodItem.create({
      data: {
        name: itemData.name,
        category: itemData.category,
        quantity: itemData.quantity,
        unit: itemData.unit,
        expiryDate: itemData.expiryDate,
        userId: restaurant2.id
      }
    });

    await prisma.inventory.create({
      data: {
        foodItemId: item.id,
        currentStock: itemData.quantity,
        minStockAlert: itemData.minStockAlert,
        userId: restaurant2.id
      }
    });
  }

  console.log('Food Items & Inventory seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

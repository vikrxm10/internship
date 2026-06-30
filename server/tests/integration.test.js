const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock Email Utility to prevent open handles during tests
jest.mock('../utils/email', () => ({
  sendDonationNotification: jest.fn().mockResolvedValue({ messageId: 'mock-email' })
}));

// Mock Prisma Client
jest.mock('../utils/db', () => {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inventory: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    foodItem: {
      create: jest.fn(),
      update: jest.fn(),
    },
    wasteLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    donation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(require('../utils/db'))),
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn()
  };
});

const prisma = require('../utils/db');
const app = require('express')();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Load routes
const authRoutes = require('../routes/auth.routes');
const inventoryRoutes = require('../routes/inventory.routes');
const wasteRoutes = require('../routes/waste.routes');
const donationRoutes = require('../routes/donation.routes');
const analyticsRoutes = require('../routes/analytics.routes');
const adminRoutes = require('../routes/admin.routes');
const notificationRoutes = require('../routes/notification.routes');

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

describe('EcoRescue End-to-End API Integration Simulation', () => {
  let token;
  const mockUser = {
    id: 'user-id-123',
    name: 'Green Bistro',
    email: 'bistro@foodrescue.org',
    role: 'RESTAURANT',
    location: '123 Gourmet St'
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret';
    token = jwt.sign(
      { id: mockUser.id, email: mockUser.email, role: mockUser.role },
      process.env.JWT_SECRET
    );
  });

  describe('Auth Route Integration', () => {
    it('GET /api/auth/me should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/me should return user info if authenticated', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('bistro@foodrescue.org');
    });
  });

  describe('Inventory Route Integration', () => {
    it('GET /api/inventory should list user stock items', async () => {
      const mockInventory = [
        {
          id: 'inv-1',
          currentStock: 10,
          minStockAlert: 2,
          foodItem: { name: 'Apples', category: 'Produce', unit: 'kg' }
        }
      ];
      prisma.inventory.findMany.mockResolvedValue(mockInventory);

      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].foodItem.name).toBe('Apples');
    });
  });

  describe('Waste Log Route Integration', () => {
    it('POST /api/waste should record log and adjust stock levels', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        currentStock: 15,
        userId: mockUser.id,
        foodItem: { name: 'Apples', unit: 'kg' }
      };
      
      const mockWasteLog = {
        id: 'log-1',
        foodItemId: 'food-1',
        quantityWasted: 5,
        reason: 'Expired'
      };

      prisma.inventory.findFirst.mockResolvedValue(mockInventoryItem);
      prisma.inventory.update.mockResolvedValue({ ...mockInventoryItem, currentStock: 10 });
      prisma.wasteLog.create.mockResolvedValue(mockWasteLog);

      const res = await request(app)
        .post('/api/waste')
        .set('Authorization', `Bearer ${token}`)
        .send({
          foodItemId: 'food-1',
          quantityWasted: 5,
          reason: 'Expired'
        });

      expect(res.status).toBe(201);
      expect(res.body.quantityWasted).toBe(5);
      expect(res.body.reason).toBe('Expired');
    });
  });

  describe('Donation Route Integration', () => {
    it('POST /api/donations should schedule a new food donation', async () => {
      const mockInventoryItem = {
        id: 'inv-1',
        currentStock: 20,
        userId: mockUser.id,
        foodItem: { name: 'Apples', unit: 'kg', category: 'Produce', expiryDate: new Date() }
      };

      const mockDonation = {
        id: 'don-1',
        foodItemId: 'food-1',
        donorId: mockUser.id,
        status: 'PENDING',
        pickupLocation: '123 Gourmet St',
        foodItem: {
          id: 'food-1',
          name: 'Apples',
          quantity: 10,
          unit: 'kg'
        },
        donor: {
          name: 'Green Bistro',
          email: 'bistro@foodrescue.org'
        }
      };

      prisma.inventory.findFirst.mockResolvedValue(mockInventoryItem);
      prisma.inventory.update.mockResolvedValue({ ...mockInventoryItem, currentStock: 10 });
      prisma.foodItem.create.mockResolvedValue({ id: 'food-2', name: 'Apples', quantity: 10 });
      prisma.donation.create.mockResolvedValue(mockDonation);

      const res = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          foodItemId: 'food-1',
          quantityToDonate: 10,
          pickupLocation: '123 Gourmet St',
          pickupLat: 40.7128,
          pickupLng: -74.0060,
          scheduledAt: new Date()
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.pickupLocation).toBe('123 Gourmet St');
    });

    it('GET /api/donations should list donations', async () => {
      const mockDonations = [{ id: 'don-1', status: 'PENDING' }];
      prisma.donation.findMany.mockResolvedValue(mockDonations);

      const res = await request(app)
        .get('/api/donations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockDonations);
    });

    it('GET /api/donations/available should list available donations for NGO/ADMIN', async () => {
      const ngoToken = jwt.sign(
        { id: 'ngo-1', email: 'ngo@test.com', role: 'NGO' },
        process.env.JWT_SECRET
      );
      const mockAvailable = [{ id: 'don-2', status: 'PENDING' }];
      prisma.donation.findMany.mockResolvedValue(mockAvailable);

      const res = await request(app)
        .get('/api/donations/available')
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockAvailable);
    });

    it('PUT /api/donations/:id/status should update status', async () => {
      const ngoToken = jwt.sign(
        { id: 'ngo-1', email: 'ngo@test.com', role: 'NGO' },
        process.env.JWT_SECRET
      );
      const mockUpdatedDonation = {
        id: 'don-1',
        status: 'ACCEPTED',
        donorId: mockUser.id,
        recipientId: 'ngo-1',
        foodItem: { name: 'Apples' },
        donor: { name: 'Green Bistro', email: 'bistro@foodrescue.org' },
        recipient: { name: 'Helping Hands NGO', email: 'ngo@test.com' }
      };
      prisma.donation.findUnique.mockResolvedValue({ id: 'don-1', status: 'PENDING', donorId: mockUser.id });
      prisma.donation.update.mockResolvedValue(mockUpdatedDonation);

      const res = await request(app)
        .put('/api/donations/don-1/status')
        .set('Authorization', `Bearer ${ngoToken}`)
        .send({ status: 'ACCEPTED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');
    });
  });

  describe('Notification Route Integration', () => {
    it('GET /api/notifications should list notifications', async () => {
      const mockNotifs = [{ id: 'notif-1', title: 'Alert', isRead: false }];
      prisma.notification.findMany.mockResolvedValue(mockNotifs);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockNotifs);
    });
  });

  describe('Analytics Route Integration', () => {
    it('GET /api/analytics/waste-summary should return stats', async () => {
      prisma.wasteLog.findMany.mockResolvedValue([
        { id: 'log-1', quantityWasted: 5, loggedAt: new Date(), foodItem: { category: 'Produce' } }
      ]);
      prisma.$queryRaw.mockResolvedValue([{ totalQuantity: 10 }]);
      prisma.wasteLog.groupBy.mockResolvedValue([]);
      
      const res = await request(app)
        .get('/api/analytics/waste-summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Admin Route Integration', () => {
    it('GET /api/admin/users should return all users for ADMIN', async () => {
      const adminToken = jwt.sign(
        { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' },
        process.env.JWT_SECRET
      );
      const mockUsers = [{ id: 'user-1', name: 'User One' }];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockUsers);
    });
  });
});

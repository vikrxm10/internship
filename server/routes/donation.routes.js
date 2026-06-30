const express = require('express');
const router = express.Router();
const {
  getDonations,
  scheduleDonation,
  updateDonationStatus,
  getAvailableDonations
} = require('../controllers/donation.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getDonations);
router.get('/available', requireRole(['NGO', 'ADMIN']), getAvailableDonations);
router.post('/', requireRole(['RESTAURANT', 'ADMIN']), scheduleDonation);
router.put('/:id/status', updateDonationStatus);

module.exports = router;

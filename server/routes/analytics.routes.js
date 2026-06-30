const express = require('express');
const router = express.Router();
const {
  getWasteSummary,
  getDonationStats,
  getTopWasted
} = require('../controllers/analytics.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/waste-summary', getWasteSummary);
router.get('/donation-stats', getDonationStats);
router.get('/top-wasted', getTopWasted);

module.exports = router;

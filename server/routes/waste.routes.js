const express = require('express');
const router = express.Router();
const {
  getWasteLogs,
  addWasteLog,
  updateWasteLog,
  deleteWasteLog
} = require('../controllers/waste.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getWasteLogs);
router.post('/', requireRole(['RESTAURANT', 'ADMIN']), addWasteLog);
router.put('/:id', requireRole(['RESTAURANT', 'ADMIN']), updateWasteLog);
router.delete('/:id', requireRole(['RESTAURANT', 'ADMIN']), deleteWasteLog);

module.exports = router;

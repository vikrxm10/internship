const express = require('express');
const router = express.Router();
const { 
  getInventory, 
  addInventoryItem, 
  updateInventoryStock, 
  getInventoryAlerts 
} = require('../controllers/inventory.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', getInventory);
router.post('/', requireRole(['RESTAURANT', 'ADMIN']), addInventoryItem);
router.put('/:id', requireRole(['RESTAURANT', 'ADMIN']), updateInventoryStock);
router.get('/alerts', getInventoryAlerts);

module.exports = router;

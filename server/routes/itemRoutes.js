const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { itemCreateLimiter, itemSearchLimiter } = require('../middleware/rateLimiter');
const { verifyAdminToken } = require('../middleware/authMiddleware');

console.log('✅ Item routes module loaded');
console.log('Item controller methods available:', Object.keys(itemController));

// Public routes
console.log('Registering GET /missing route');
router.get('/missing', itemSearchLimiter, itemController.getAllMissingItems);
console.log('Registering GET /missing/:id route');
router.get('/missing/:id', itemSearchLimiter, itemController.getMissingItemById);

// Protected routes
console.log('Registering POST /missing route');
router.post('/missing', auth, itemCreateLimiter, upload.single('image'), itemController.createMissingItem);
console.log('Registering GET /my-items route');
router.get('/my-items', auth, itemSearchLimiter, itemController.getUserMissingItems);
console.log('Registering PUT /missing/:id route');
router.put('/missing/:id', auth, itemCreateLimiter, itemController.updateMissingItem);
console.log('Registering DELETE /missing/:id route');
router.delete('/missing/:id', auth, itemCreateLimiter, itemController.deleteMissingItem);

// Fix database issues
router.get('/fix-post-types', verifyAdminToken, itemController.fixPostTypes);

module.exports = router;

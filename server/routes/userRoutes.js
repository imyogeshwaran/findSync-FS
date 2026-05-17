const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { verifyAdminToken } = require('../middleware/authMiddleware');

console.log('✅ User routes module loaded');
console.log('User controller methods available:', Object.keys(userController));

// Public routes
router.post('/sync', userController.syncUser);
console.log('Registering POST /sync route');

// Protected routes
router.get('/profile', auth, userController.getUserProfile);
console.log('Registering GET /profile route');
router.get('/all', verifyAdminToken, userController.getAllUsers);
console.log('Registering GET /all route');
router.post('/update-mobile', auth, userController.updateMobileNumber);
console.log('Registering POST /update-mobile route');
router.post('/change-password', auth, userController.changePassword);
console.log('Registering POST /change-password route');

module.exports = router;

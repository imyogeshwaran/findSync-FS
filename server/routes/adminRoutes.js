const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdminToken, auditLog } = require('../middleware/authMiddleware');

console.log('✅ Admin routes module loaded');
console.log('Admin controller methods available:', Object.keys(adminController));

// Admin login (no auth required)
router.post('/login', auditLog('ADMIN_LOGIN_ATTEMPT'), adminController.login);

// Protected routes - require admin token with role validation
router.get('/dashboard/stats', auditLog('ADMIN_DASHBOARD_ACCESS'), verifyAdminToken, adminController.getDashboardStats);
router.get('/users', auditLog('ADMIN_VIEW_USERS'), verifyAdminToken, adminController.getAllUsers);
router.get('/items', auditLog('ADMIN_VIEW_ITEMS'), verifyAdminToken, adminController.getAllItems);
router.delete('/users/:userId', auditLog('ADMIN_DELETE_USER'), verifyAdminToken, adminController.deleteUser);
router.delete('/items/:itemId', auditLog('ADMIN_DELETE_ITEM'), verifyAdminToken, adminController.deleteItem);

// Post approval routes
router.get('/posts/pending', auditLog('ADMIN_VIEW_PENDING'), verifyAdminToken, adminController.getPendingPosts);
router.get('/posts/approved', auditLog('ADMIN_VIEW_APPROVED'), verifyAdminToken, adminController.getApprovedPosts);
router.get('/posts/rejected', auditLog('ADMIN_VIEW_REJECTED'), verifyAdminToken, adminController.getRejectedPosts);
router.put('/posts/:itemId/approve', auditLog('ADMIN_APPROVE_POST'), verifyAdminToken, adminController.approvePost);
router.put('/posts/:itemId/reject', auditLog('ADMIN_REJECT_POST'), verifyAdminToken, adminController.rejectPost);

// Conversation management routes
console.log('Registering conversation routes...');
router.get('/conversations', auditLog('ADMIN_VIEW_CONVERSATIONS'), verifyAdminToken, adminController.getAllConversations);
console.log('Registered GET /conversations route');
router.get('/conversations/:contactId/messages', auditLog('ADMIN_VIEW_CONVERSATION_MESSAGES'), verifyAdminToken, adminController.getConversationMessages);
console.log('Registered GET /conversations/:contactId/messages route');
router.delete('/conversations/:contactId/messages/:messageId', auditLog('ADMIN_DELETE_MESSAGE'), verifyAdminToken, adminController.adminDeleteMessage);
console.log('Registered DELETE /conversations/:contactId/messages/:messageId route');

module.exports = router;

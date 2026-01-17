const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const auth = require('../middleware/auth');

// Create a new notification/contact
router.post('/', auth, contactController.createContact);

// Get notification count (specific route - must be before generic GET /)
router.get('/count', auth, contactController.getNotificationCount);

// Get conversation history with a specific user about a specific item (specific route - must be before generic GET /)
router.get('/history', auth, contactController.getConversationHistory);

// Get all conversations for logged-in user (specific route - must be before generic GET /)
router.get('/conversations', auth, contactController.getUserConversations);

// Get all notifications for logged-in user (generic route - MUST BE LAST)
router.get('/', auth, contactController.getNotifications);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getChatHistory, sendMessage, editMessage, deleteMessage } = require('../controllers/chatController');
const auth = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');

// Protect all chat routes
router.use(auth);

// Get chat history for a contact
router.get('/:contactId', getChatHistory);

// Send a message in a conversation
router.post('/:contactId/messages', messageLimiter, sendMessage);

// Edit a message
router.put('/:contactId/messages/:messageId', messageLimiter, editMessage);

// Delete a message
router.delete('/:contactId/messages/:messageId', messageLimiter, deleteMessage);

module.exports = router;
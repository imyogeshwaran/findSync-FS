const db = require('../config/database');

// Get chat history for a contact/notification
exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { contactId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!contactId) return res.status(400).json({ error: 'Contact ID is required' });

    // First verify the user is part of this contact/conversation
    const [contactRows] = await db.query(
      `SELECT * FROM Contacts WHERE contact_id = ? AND (sender_id = ? OR receiver_id = ?)`,
      [contactId, userId, userId]
    );

    if (!contactRows || !contactRows.length) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    const contact = contactRows[0];

    // Get the initial message from Contacts table and all follow-up messages from Messages table
    // First, get the initial message from Contacts
    const initialMessage = {
      message_id: -contact.contact_id, // Use negative contact_id as pseudo-ID for initial message
      contact_id: contact.contact_id,
      sender_id: contact.sender_id,
      receiver_id: contact.receiver_id,
      message: contact.message,
      sent_at: contact.contact_date,
      read_at: null,
      sender_name: null,
      receiver_name: null,
      sender_email: null,
      receiver_email: null,
      is_sender: contact.sender_id === userId,
      is_deleted: false,
      deletion_type: null,
      is_initial_message: true // Flag to indicate this is from Contacts table
    };

    // Get all follow-up messages from Messages table
    const [followUpMessages] = await db.query(
      `SELECT m.*, 
              u_sender.name as sender_name, 
              u_sender.email as sender_email,
              u_receiver.name as receiver_name,
              u_receiver.email as receiver_email,
              (m.sender_id = ?) as is_sender
       FROM Messages m
       LEFT JOIN Users u_sender ON m.sender_id = u_sender.user_id
       LEFT JOIN Users u_receiver ON m.receiver_id = u_receiver.user_id
       WHERE m.contact_id = ?
       ORDER BY m.sent_at ASC`,
      [userId, contactId]
    );

    // Merge both initial message and follow-up messages
    const messages = [initialMessage, ...(followUpMessages || [])];

    // Mark unread messages as read if user is receiver
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `UPDATE Messages 
       SET read_at = ? 
       WHERE contact_id = ? AND receiver_id = ? AND read_at IS NULL`,
      [now, contactId, userId]
    );

    res.json({
      success: true,
      contact,
      messages,
      isOwner: contact.receiver_id === userId
    });
  } catch (err) {
    console.error('Error fetching chat history:', err);
    res.status(500).json({ error: 'Failed to fetch chat history', details: err.message });
  }
};

// Send a reply in an existing conversation
exports.sendMessage = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { contactId } = req.params;
    const { message } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!contactId) return res.status(400).json({ error: 'Contact ID is required' });
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Verify the user is part of this contact/conversation
    const [contactRows] = await db.query(
      `SELECT * FROM Contacts WHERE contact_id = ? AND (sender_id = ? OR receiver_id = ?)`,
      [contactId, userId, userId]
    );

    if (!contactRows || !contactRows.length) {
      return res.status(403).json({ error: 'Not authorized to reply to this conversation' });
    }

    const contact = contactRows[0];
    
    // The receiver of the new message is whichever user is not the sender
    const receiverId = contact.sender_id === userId ? contact.receiver_id : contact.sender_id;

    // Insert the message
    const [result] = await db.query(
      `INSERT INTO Messages (contact_id, sender_id, receiver_id, message) 
       VALUES (?, ?, ?, ?)`,
      [contactId, userId, receiverId, message]
    );

    // Get the inserted message with user details
    const [messageRows] = await db.query(
      `SELECT m.*, 
              u_sender.name as sender_name, 
              u_sender.email as sender_email,
              u_receiver.name as receiver_name,
              u_receiver.email as receiver_email,
              (m.sender_id = ?) as is_sender
       FROM Messages m
       LEFT JOIN Users u_sender ON m.sender_id = u_sender.user_id
       LEFT JOIN Users u_receiver ON m.receiver_id = u_receiver.user_id
       WHERE m.message_id = ?`,
      [userId, result.insertId]
    );

    res.json({
      success: true,
      message: messageRows[0]
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
};

// Edit a message
exports.editMessage = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { contactId, messageId } = req.params;
    const { message } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!contactId) return res.status(400).json({ error: 'Contact ID is required' });
    if (!messageId) return res.status(400).json({ error: 'Message ID is required' });
    if (!message) return res.status(400).json({ error: 'Message content is required' });

    // Verify the user is part of this contact/conversation
    const [contactRows] = await db.query(
      `SELECT * FROM Contacts WHERE contact_id = ? AND (sender_id = ? OR receiver_id = ?)`,
      [contactId, userId, userId]
    );

    if (!contactRows || !contactRows.length) {
      return res.status(403).json({ error: 'Not authorized to edit messages in this conversation' });
    }

    // Verify the user is the sender of this message
    const [messageRows] = await db.query(
      `SELECT * FROM Messages WHERE message_id = ? AND contact_id = ?`,
      [messageId, contactId]
    );

    if (!messageRows || !messageRows.length) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const messageRecord = messageRows[0];
    if (messageRecord.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }

    // Update the message
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `UPDATE Messages 
       SET message = ?, edited_at = ? 
       WHERE message_id = ?`,
      [message.trim(), now, messageId]
    );

    // Get the updated message with user details
    const [updatedMessage] = await db.query(
      `SELECT m.*, 
              u_sender.name as sender_name, 
              u_sender.email as sender_email,
              u_receiver.name as receiver_name,
              u_receiver.email as receiver_email,
              (m.sender_id = ?) as is_sender
       FROM Messages m
       LEFT JOIN Users u_sender ON m.sender_id = u_sender.user_id
       LEFT JOIN Users u_receiver ON m.receiver_id = u_receiver.user_id
       WHERE m.message_id = ?`,
      [userId, messageId]
    );

    res.json({
      success: true,
      message: updatedMessage[0]
    });
  } catch (err) {
    console.error('Error editing message:', err);
    res.status(500).json({ error: 'Failed to edit message', details: err.message });
  }
};

// Delete a message (soft delete)
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { contactId, messageId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!contactId) return res.status(400).json({ error: 'Contact ID is required' });
    if (!messageId) return res.status(400).json({ error: 'Message ID is required' });

    // Verify the user is part of this contact/conversation
    const [contactRows] = await db.query(
      `SELECT * FROM Contacts WHERE contact_id = ? AND (sender_id = ? OR receiver_id = ?)`,
      [contactId, userId, userId]
    );

    if (!contactRows || !contactRows.length) {
      return res.status(403).json({ error: 'Not authorized to delete messages in this conversation' });
    }

    // Verify the user is the sender of this message
    const [messageRows] = await db.query(
      `SELECT * FROM Messages WHERE message_id = ? AND contact_id = ?`,
      [messageId, contactId]
    );

    if (!messageRows || !messageRows.length) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const messageRecord = messageRows[0];
    if (messageRecord.sender_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // Soft delete the message
    await db.query(
      `UPDATE Messages 
       SET is_deleted = TRUE,
           deletion_type = 'user'
       WHERE message_id = ?`,
      [messageId]
    );

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message', details: err.message });
  }
};
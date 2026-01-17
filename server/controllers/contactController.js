const db = require('../config/database');

// Create a contact/notification for an item owner or specific receiver (for replies)
exports.createContact = async (req, res) => {
  try {
    const senderId = req.user && req.user.id;
    const { item_id, message, receiver_id } = req.body;

    if (!senderId) return res.status(401).json({ error: 'Unauthorized' });
    if (!item_id || !message) return res.status(400).json({ error: 'item_id and message are required' });

    let receiverId = receiver_id; // Check if receiver_id was explicitly provided (for replies)
    
    // If no receiver_id specified, find the item owner (for initial contact)
    if (!receiverId) {
      const [itemRows] = await db.query(`SELECT i.item_id, i.user_id as owner_id FROM Items i WHERE i.item_id = ?`, [item_id]);
      const item = itemRows && itemRows.length ? itemRows[0] : null;
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      receiverId = item.owner_id;
    }
    
    if (!receiverId) return res.status(400).json({ error: 'Item owner or receiver not found' });
    if (senderId === receiverId) return res.status(400).json({ error: 'Cannot send message to yourself' });

    // Insert into Contacts table - this creates a permanent record
    const [result] = await db.query(
      `INSERT INTO Contacts (sender_id, receiver_id, item_id, message) VALUES (?, ?, ?, ?)`,
      [senderId, receiverId, item_id, message]
    );

    console.log(`📨 Message saved: senderId=${senderId}, receiverId=${receiverId}, itemId=${item_id}, contactId=${result.insertId}`);

    res.json({ success: true, contact_id: result.insertId });
  } catch (err) {
    console.error('Error creating contact:', err.message);
    res.status(500).json({ error: 'Failed to create contact', details: err.message });
  }
};

// Get notifications for the logged-in user (contacts where they are receiver)
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query(
      `SELECT c.contact_id, c.sender_id, c.receiver_id, c.item_id, c.message, c.contact_date, 
              u.name as sender_name, u.email as sender_email,
              i.item_name, i.post_type
       FROM Contacts c
       LEFT JOIN Users u ON c.sender_id = u.user_id
       LEFT JOIN Items i ON c.item_id = i.item_id
       WHERE c.receiver_id = ?
       ORDER BY c.contact_date DESC`,
      [userId]
    );

    res.json({ success: true, notifications: rows });
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
};

// Get unread notification count
exports.getNotificationCount = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query(
      `SELECT COUNT(*) as unread_count FROM Contacts WHERE receiver_id = ?`,
      [userId]
    );

    const count = rows[0].unread_count || 0;
    res.json({ success: true, unread_count: count });
  } catch (err) {
    console.error('Error fetching notification count:', err.message);
    res.status(500).json({ error: 'Failed to fetch notification count', details: err.message });
  }
};

// Get all contacts/conversations for a specific user
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get all unique conversations (both sent and received)
    const [rows] = await db.query(
      `SELECT DISTINCT 
              IF(sender_id = ?, receiver_id, sender_id) as other_user_id,
              IF(sender_id = ?, 'received', 'sent') as direction,
              MAX(contact_date) as last_message_date,
              COUNT(*) as message_count
       FROM Contacts
       WHERE sender_id = ? OR receiver_id = ?
       GROUP BY IF(sender_id = ?, receiver_id, sender_id)
       ORDER BY last_message_date DESC`,
      [userId, userId, userId, userId, userId]
    );

    // Get user details for each conversation
    const conversations = await Promise.all(rows.map(async (row) => {
      const [userRows] = await db.query('SELECT user_id, name, email FROM Users WHERE user_id = ?', [row.other_user_id]);
      return {
        ...row,
        user_name: userRows[0]?.name || 'Unknown',
        user_email: userRows[0]?.email || 'Unknown'
      };
    }));

    res.json({ success: true, conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
  }
};

// Get conversation history between current user and another user for a specific item
exports.getConversationHistory = async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    const { otherUserId, itemId } = req.query;
    
    console.log('🔍 getConversationHistory called with:', { userId, otherUserId, itemId, path: req.path, query: req.query });
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!otherUserId || !itemId) return res.status(400).json({ error: 'otherUserId and itemId are required' });

    // Get all messages between two users about a specific item (in chronological order)
    const [messages] = await db.query(
      `SELECT c.contact_id, c.sender_id, c.receiver_id, c.item_id, c.message, c.contact_date,
              u_sender.name as sender_name, u_sender.email as sender_email
       FROM Contacts c
       LEFT JOIN Users u_sender ON c.sender_id = u_sender.user_id
       WHERE c.item_id = ?
         AND ((c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?))
       ORDER BY c.contact_date ASC`,
      [itemId, userId, otherUserId, otherUserId, userId]
    );

    console.log(`📜 Retrieved conversation history: ${messages.length} messages between user ${userId} and ${otherUserId} about item ${itemId}`);

    res.json({ success: true, messages: messages || [] });
  } catch (err) {
    console.error('Error fetching conversation history:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversation history', details: err.message });
  }
};

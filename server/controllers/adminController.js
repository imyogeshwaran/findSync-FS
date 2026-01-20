const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Admin login
exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!password || (!username && !email)) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    // Query admin by username or email
    let query = 'SELECT admin_id, username, email, password_hash, created_at FROM admin WHERE ';
    let params = [];

    if (username) {
      query += 'username = ?';
      params.push(username);
    } else {
      query += 'email = ?';
      params.push(email);
    }

    const [admins] = await db.query(query, params);

    if (!admins || admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];

    // Compare password with hash
    const passwordMatches = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        role: 'admin'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      admin: {
        admin_id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        created_at: admin.created_at
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get admin dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('Fetching dashboard stats...');
    
    // Get total users
    const [usersCount] = await db.query('SELECT COUNT(*) as count FROM Users');
    
    // Get total items
    const [itemsCount] = await db.query('SELECT COUNT(*) as count FROM Items');
    
    // Get recent users
    const [recentUsers] = await db.query(
      'SELECT user_id, name, email, created_at FROM Users ORDER BY created_at DESC LIMIT 5'
    );
    
    // Get recent items with all details for modal display
    let recentItems = [];
    try {
      const [items] = await db.query(
        `SELECT 
          i.item_id, 
          i.item_name, 
          i.description,
          i.category,
          i.post_type,
          i.location,
          i.image_url,
          i.status, 
          i.posted_at,
          i.phone,
          i.user_id,
          u.name as user_name
        FROM Items i
        LEFT JOIN Users u ON i.user_id = u.user_id
        ORDER BY i.posted_at DESC LIMIT 5`
      );
      recentItems = items || [];
    } catch (itemErr) {
      console.warn('Could not fetch items with all columns:', itemErr.message);
      // Fallback: try without potentially missing columns
      try {
        const [items] = await db.query(
          `SELECT 
            i.item_id, 
            i.item_name, 
            i.description,
            i.category,
            i.post_type,
            i.location,
            i.image_url,
            i.posted_at,
            i.user_id,
            u.name as user_name
          FROM Items i
          LEFT JOIN Users u ON i.user_id = u.user_id
          ORDER BY i.posted_at DESC LIMIT 5`
        );
        recentItems = items || [];
      } catch (fallbackErr) {
        console.error('Failed to fetch items even with fallback:', fallbackErr.message);
        recentItems = [];
      }
    }

    console.log('Dashboard stats fetched successfully');
    return res.json({
      stats: {
        totalUsers: usersCount[0].count,
        totalItems: itemsCount[0].count,
        recentUsers: recentUsers || [],
        recentItems: recentItems || []
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    console.error('Error details:', error.message, error.code);
    return res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT user_id, name, email, mobile, created_at FROM Users');
    return res.json({ users: users || [] });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      error: 'Failed to fetch users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all items
exports.getAllItems = async (req, res) => {
  try {
    console.log('Fetching all items...');
    
    // Fetch all item details including description, category, post_type, location, image_url and user name
    let items = [];
    try {
      const [result] = await db.query(
        `SELECT 
          i.item_id, 
          i.item_name, 
          i.description, 
          i.category, 
          i.post_type, 
          i.location, 
          i.image_url, 
          i.status, 
          i.user_id, 
          i.posted_at,
          i.phone,
          u.name as user_name
        FROM Items i
        LEFT JOIN Users u ON i.user_id = u.user_id`
      );
      items = result || [];
    } catch (err) {
      console.warn('Error fetching items with all columns:', err.message);
      // Fallback: try without potentially missing columns
      try {
        const [result] = await db.query(
          `SELECT 
            i.item_id, 
            i.item_name, 
            i.description, 
            i.category, 
            i.post_type, 
            i.location, 
            i.image_url, 
            i.user_id, 
            i.posted_at,
            u.name as user_name
          FROM Items i
          LEFT JOIN Users u ON i.user_id = u.user_id`
        );
        items = result || [];
      } catch (fallbackErr) {
        console.error('Failed to fetch items even with fallback:', fallbackErr.message);
        throw fallbackErr;
      }
    }
    
    console.log('Fetched', items.length, 'items with full details');
    return res.json({ items: items || [] });
  } catch (error) {
    console.error('Get items error:', error);
    console.error('Error details:', error.message, error.code);
    return res.status(500).json({
      error: 'Failed to fetch items',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await db.query('DELETE FROM Users WHERE user_id = ?', [userId]);
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      error: 'Failed to delete user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    await db.query('DELETE FROM Items WHERE item_id = ?', [itemId]);
    return res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    return res.status(500).json({
      error: 'Failed to delete item',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get pending posts for approval
exports.getPendingPosts = async (req, res) => {
  try {
    console.log('Fetching pending posts...');
    
    // First check if approval_status column exists
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Items' AND COLUMN_NAME = 'approval_status'`
    );
    
    if (columns.length === 0) {
      console.warn('approval_status column does not exist, adding it...');
      try {
        await db.query(`ALTER TABLE Items ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'`);
        console.log('✅ approval_status column added successfully');
      } catch (alterErr) {
        if (!alterErr.message.includes('Duplicate column')) {
          throw alterErr;
        }
      }
    }
    
    const [items] = await db.query(
      `SELECT item_id, item_name, post_type, category, location, posted_at, approval_status, 
              user_id, description, phone FROM Items WHERE approval_status = 'pending' ORDER BY posted_at DESC`
    );
    console.log('Found', items.length, 'pending posts');
    return res.json({ items: items || [] });
  } catch (error) {
    console.error('Get pending posts error:', error);
    console.error('Error details:', error.message, error.code);
    return res.status(500).json({
      error: 'Failed to fetch pending posts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get approved posts
exports.getApprovedPosts = async (req, res) => {
  try {
    console.log('Fetching approved posts...');
    
    // First check if approval_status column exists
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Items' AND COLUMN_NAME = 'approval_status'`
    );
    
    if (columns.length === 0) {
      console.warn('approval_status column does not exist, adding it...');
      try {
        await db.query(`ALTER TABLE Items ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'`);
        console.log('✅ approval_status column added successfully');
      } catch (alterErr) {
        if (!alterErr.message.includes('Duplicate column')) {
          throw alterErr;
        }
      }
    }
    
    const [items] = await db.query(
      `SELECT item_id, item_name, post_type, category, location, posted_at, approval_status, 
              user_id, description, phone FROM Items WHERE approval_status = 'approved' ORDER BY posted_at DESC`
    );
    console.log('Found', items.length, 'approved posts');
    return res.json({ items: items || [] });
  } catch (error) {
    console.error('Get approved posts error:', error);
    console.error('Error details:', error.message, error.code);
    return res.status(500).json({
      error: 'Failed to fetch approved posts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get rejected posts
exports.getRejectedPosts = async (req, res) => {
  try {
    console.log('Fetching rejected posts...');
    
    // First check if approval_status column exists
    const [columns] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Items' AND COLUMN_NAME = 'approval_status'`
    );
    
    if (columns.length === 0) {
      console.warn('approval_status column does not exist, adding it...');
      try {
        await db.query(`ALTER TABLE Items ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'`);
        console.log('✅ approval_status column added successfully');
      } catch (alterErr) {
        if (!alterErr.message.includes('Duplicate column')) {
          throw alterErr;
        }
      }
    }
    
    const [items] = await db.query(
      `SELECT item_id, item_name, post_type, category, location, posted_at, approval_status, 
              user_id, description, phone FROM Items WHERE approval_status = 'rejected' ORDER BY posted_at DESC`
    );
    console.log('Found', items.length, 'rejected posts');
    return res.json({ items: items || [] });
  } catch (error) {
    console.error('Get rejected posts error:', error);
    console.error('Error details:', error.message, error.code);
    return res.status(500).json({
      error: 'Failed to fetch rejected posts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Approve a post
exports.approvePost = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    await db.query('UPDATE Items SET approval_status = ? WHERE item_id = ?', ['approved', itemId]);
    return res.json({ success: true, message: 'Post approved successfully' });
  } catch (error) {
    console.error('Approve post error:', error);
    return res.status(500).json({
      error: 'Failed to approve post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Reject a post
exports.rejectPost = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    await db.query('UPDATE Items SET approval_status = ? WHERE item_id = ?', ['rejected', itemId]);
    return res.json({ success: true, message: 'Post rejected successfully' });
  } catch (error) {
    console.error('Reject post error:', error);
    return res.status(500).json({
      error: 'Failed to reject post',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all conversations (admin view)
exports.getAllConversations = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.admin_id;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

    // Group conversations by user pairs (sender_id, receiver_id)
    // This ensures all messages between two users appear in a single conversation
    const [conversations] = await db.query(
      `SELECT 
        MIN(c.contact_id) as contact_id,
        c.sender_id,
        c.receiver_id,
        u_sender.name as sender_name,
        u_sender.email as sender_email,
        u_receiver.name as receiver_name,
        u_receiver.email as receiver_email,
        GROUP_CONCAT(DISTINCT i.item_name SEPARATOR ', ') as item_names,
        COUNT(DISTINCT c.item_id) as item_count,
        MAX(COALESCE(m.sent_at, c.contact_date)) as last_message_at,
        COUNT(DISTINCT CASE WHEN m.is_deleted = FALSE THEN m.message_id ELSE NULL END) + 
        COUNT(DISTINCT CASE WHEN c.message IS NOT NULL THEN c.contact_id ELSE NULL END) as message_count
       FROM Contacts c
       LEFT JOIN Users u_sender ON c.sender_id = u_sender.user_id
       LEFT JOIN Users u_receiver ON c.receiver_id = u_receiver.user_id
       LEFT JOIN Items i ON c.item_id = i.item_id
       LEFT JOIN Messages m ON c.contact_id = m.contact_id
       GROUP BY c.sender_id, c.receiver_id
       ORDER BY last_message_at DESC`
    );

    res.json({
      success: true,
      conversations: conversations || []
    });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations', details: err.message });
  }
};

// Get all messages in a conversation (admin view)
exports.getConversationMessages = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.admin_id;
    const { contactId } = req.params;

    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    if (!contactId) return res.status(400).json({ error: 'Contact ID is required' });

    // Get the reference contact to identify the user pair
    const [contactRows] = await db.query(
      `SELECT * FROM Contacts WHERE contact_id = ?`,
      [contactId]
    );

    if (!contactRows || !contactRows.length) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const referenceContact = contactRows[0];
    const senderId = referenceContact.sender_id;
    const receiverId = referenceContact.receiver_id;

    // Get ALL initial messages between these two users (from all their Contacts) with user info
    const [allContacts] = await db.query(
      `SELECT c.*,
              u_sender.name as sender_name,
              u_sender.email as sender_email,
              u_receiver.name as receiver_name,
              u_receiver.email as receiver_email
       FROM Contacts c
       LEFT JOIN Users u_sender ON c.sender_id = u_sender.user_id
       LEFT JOIN Users u_receiver ON c.receiver_id = u_receiver.user_id
       WHERE (c.sender_id = ? AND c.receiver_id = ?) OR (c.sender_id = ? AND c.receiver_id = ?)
       ORDER BY c.contact_date ASC`,
      [senderId, receiverId, receiverId, senderId]
    );

    // Fetch user details separately to ensure we have names for all users in the conversation
    const [userDetails] = await db.query(
      `SELECT user_id, name, email FROM Users WHERE user_id IN (?, ?)`,
      [senderId, receiverId]
    );

    const userMap = {};
    userDetails.forEach(user => {
      userMap[user.user_id] = { name: user.name, email: user.email };
    });

    // Convert all initial contact messages with proper sender info
    const initialMessages = allContacts.map(contact => {
      const senderInfo = userMap[contact.sender_id] || { name: contact.sender_name, email: contact.sender_email };
      const receiverInfo = userMap[contact.receiver_id] || { name: contact.receiver_name, email: contact.receiver_email };
      
      return {
        message_id: -contact.contact_id,
        contact_id: contact.contact_id,
        sender_id: contact.sender_id,
        receiver_id: contact.receiver_id,
        message: contact.message,
        sent_at: contact.contact_date,
        read_at: null,
        sender_name: senderInfo.name || senderInfo.email || 'Unknown',
        sender_email: senderInfo.email,
        receiver_name: receiverInfo.name || receiverInfo.email || 'Unknown',
        receiver_email: receiverInfo.email,
        deleted_by_name: null,
        deleted_by_email: null,
        is_deleted: false,
        deletion_type: null,
        is_initial_message: true,
        item_id: contact.item_id
      };
    });

    // Get ALL messages between these two users (from all their contact threads)
    const contactIds = allContacts.map(c => c.contact_id);
    let allFollowUpMessages = [];
    
    if (contactIds.length > 0) {
      const [followUpMessages] = await db.query(
        `SELECT m.*, 
                u_sender.name as sender_name, 
                u_sender.email as sender_email,
                u_receiver.name as receiver_name,
                u_receiver.email as receiver_email,
                u_deleted.name as deleted_by_name,
                u_deleted.email as deleted_by_email
         FROM Messages m
         LEFT JOIN Users u_sender ON m.sender_id = u_sender.user_id
         LEFT JOIN Users u_receiver ON m.receiver_id = u_receiver.user_id
         LEFT JOIN Users u_deleted ON m.deleted_by = u_deleted.user_id
         WHERE m.contact_id IN (${contactIds.join(',')})
         ORDER BY m.sent_at ASC`
      );
      allFollowUpMessages = followUpMessages || [];
    }

    // Merge and sort ALL messages chronologically
    const messages = [...initialMessages, ...allFollowUpMessages].sort((a, b) => {
      return new Date(a.sent_at) - new Date(b.sent_at);
    });

    res.json({
      success: true,
      messages: messages,
      conversation: {
        sender_id: senderId,
        receiver_id: receiverId,
        contact_id: contactId,
        item_count: allContacts.length
      }
    });
  } catch (err) {
    console.error('Error fetching conversation messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
};

// Admin delete message
exports.adminDeleteMessage = async (req, res) => {
  try {
    const adminId = req.admin && req.admin.admin_id;
    const { contactId, messageId } = req.params;

    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    if (!contactId) return res.status(400).json({ error: 'Contact ID is required' });
    if (!messageId) return res.status(400).json({ error: 'Message ID is required' });

    // Verify conversation exists
    const [contactRows] = await db.query(
      `SELECT * FROM Contacts WHERE contact_id = ?`,
      [contactId]
    );

    if (!contactRows || !contactRows.length) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if this is an initial message (negative ID means it's from Contacts table)
    if (parseInt(messageId) < 0) {
      // This is an initial message from Contacts table
      // We'll mark it as deleted in a logical way by updating the contact message to show it's deleted
      const actualContactId = Math.abs(parseInt(messageId));
      
      const [contact] = await db.query(
        `SELECT * FROM Contacts WHERE contact_id = ?`,
        [actualContactId]
      );

      if (!contact || !contact.length) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // For initial messages, we'll clear the message content and mark it as deleted
      // We can't actually delete the contact record as it's needed for conversation structure
      await db.query(
        `UPDATE Contacts 
         SET message = '[Message deleted by admin]'
         WHERE contact_id = ?`,
        [actualContactId]
      );

      return res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    }

    // For follow-up messages (positive IDs), check in Messages table
    const [messageRows] = await db.query(
      `SELECT * FROM Messages WHERE message_id = ? AND contact_id = ?`,
      [messageId, contactId]
    );

    if (!messageRows || !messageRows.length) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Admin delete the message
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      `UPDATE Messages 
       SET is_deleted = TRUE, 
           deletion_type = 'admin'
       WHERE message_id = ?`,
      [messageId]
    );

    res.json({
      success: true,
      message: 'Message deleted by admin successfully'
    });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Failed to delete message', details: err.message });
  }
};

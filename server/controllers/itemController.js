const db = require('../config/database');
const fs = require('fs');
const path = require('path');

// Create a new missing item with proper post_type handling
exports.createMissingItem = async (req, res) => {
  try {
    let { item_name, description, location, category, phone, post_type, finder_name } = req.body;
    let image_url = null;

    if (req.file) {
      try {
        const filename = req.file.filename;
        image_url = `/uploads/${filename}`;
      } catch (err) {
        console.error('Error processing uploaded file:', err.message);
        image_url = null;
      }
    }

    let userId = req.user && req.user.id;
    const firebaseUid = req.user && req.user.firebase_uid;
    const tokenName = req.user && (req.user.name || req.user.displayName || null);

    if ((!userId || userId === null) && firebaseUid) {
      try {
        const [users] = await db.query('SELECT user_id, name FROM Users WHERE firebase_uid = ?', [firebaseUid]);
        if (users && users.length > 0) {
          userId = users[0].user_id;
          finder_name = users[0].name || tokenName || finder_name;
        } else {
          const [r] = await db.query(
            'INSERT INTO Users (firebase_uid, email, name) VALUES (?, ?, ?)',
            [firebaseUid, req.user.email || null, tokenName || null]
          );
          userId = r.insertId;
          finder_name = tokenName || finder_name;
        }
      } catch (err) {
        console.error('Error resolving user from firebase_uid:', err.message);
      }
    } else if (userId) {
      try {
        const [users] = await db.query('SELECT name FROM Users WHERE user_id = ?', [userId]);
        if (users && users.length > 0 && users[0].name) {
          finder_name = users[0].name;
        }
      } catch (err) {
        console.error('Error getting user name:', err.message);
      }
    }

    const missingFields = [];
    if (!item_name) missingFields.push('item name');
    if (!location) missingFields.push('location');
    if (!phone) missingFields.push('mobile number');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `${missingFields.join(', ')} ${missingFields.length > 1 ? 'are' : 'is'} required`
      });
    }

    const validPostType = (post_type === 'found' || post_type === 'lost') ? post_type : 'lost';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user id could not be resolved' });
    }

    try {
      const [users] = await db.query('SELECT user_id FROM Users WHERE user_id = ?', [userId]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'Unauthorized: invalid user id' });
      }
    } catch (userCheckErr) {
      console.error('Error checking if user exists:', userCheckErr.message);
      return res.status(500).json({ error: 'Failed to verify user' });
    }

    let includeFinder = false;
    try {
      const [foundCols] = await db.query("SHOW COLUMNS FROM Items LIKE 'finder_name'");
      includeFinder = foundCols && foundCols.length > 0;
    } catch (colErr) {
      console.warn('Could not check for finder_name column:', colErr.message);
    }

    let result;
    let userName = 'Unknown';
    if (includeFinder) {
      try {
        const [userResult] = await db.query('SELECT name FROM Users WHERE user_id = ?', [userId]);
        if (userResult && userResult.length > 0 && userResult[0].name) {
          userName = userResult[0].name;
        }
      } catch (err) {
        console.error('Error getting user name:', err.message);
      }

      if ((userName === 'Unknown' || !userName) && tokenName) {
        try {
          await db.query('UPDATE Users SET name = ? WHERE user_id = ?', [tokenName, userId]);
          userName = tokenName;
        } catch (updateErr) {
          console.error('Failed to update Users.name from tokenName:', updateErr.message);
        }
      }
    }

    const resolvedFinderName = includeFinder
      ? (userName !== 'Unknown' ? userName : (tokenName || finder_name || 'Anonymous'))
      : undefined;

    try {
      if (includeFinder) {
        [result] = await db.query(
          `INSERT INTO Items (user_id, item_name, finder_name, description, location, image_url, category, post_type, phone, approval_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
          [userId, item_name, resolvedFinderName, description, location, image_url, category || 'Others', validPostType, phone]
        );
      } else {
        [result] = await db.query(
          `INSERT INTO Items (user_id, item_name, description, location, image_url, category, post_type, phone, approval_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
          [userId, item_name, description, location, image_url, category || 'Others', validPostType, phone]
        );
      }
    } catch (dbErr) {
      console.error('Database insertion error:', dbErr.message);
      return res.status(500).json({ error: 'Failed to create item' });
    }

    const newItemData = {
      id: result.insertId,
      item_name,
      description,
      location,
      image_url,
      category: category || 'Others',
      post_type: validPostType,
      finder_name: resolvedFinderName,
      phone,
      posted_at: new Date().toISOString()
    };

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('new_item', newItemData);
      }
    } catch (socketError) {
      console.error('Error emitting Socket.IO event:', socketError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Missing item created successfully',
      item: {
        id: result.insertId,
        user_id: userId,
        item_name,
        finder_name: resolvedFinderName,
        description,
        location,
        image_url,
        category: category || 'Others',
        post_type: validPostType,
        phone
      }
    });
  } catch (error) {
    console.error('Error creating missing item:', error.message);
    return res.status(500).json({ error: 'Failed to create missing item', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Check database schema to see post_type definition
async function checkPostTypeEnum() {
  try {
    const [columns] = await db.query(
      `SHOW COLUMNS FROM Items WHERE Field = 'post_type'`
    );

    if (process.env.NODE_ENV !== 'production' && columns.length > 0) {
      console.log('post_type column type:', columns[0].Type);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error('Error checking post_type definition:', error.message);
  }
}

// Call the check function when server starts
checkPostTypeEnum();

// Get all missing items
exports.getAllMissingItems = async (req, res) => {
  try {
    let items = [];

    try {
      const [result] = await db.query(
        `SELECT 
          i.item_id,
          i.user_id,
          i.item_name,
          i.description,
          i.category,
          i.post_type,
          i.location,
          i.image_url,
          i.phone,
          i.posted_at,
          u.name as owner_name,
          u.email as owner_email
         FROM Items i 
         LEFT JOIN Users u ON i.user_id = u.user_id 
         WHERE i.approval_status = 'approved'
         ORDER BY i.posted_at DESC`
      );
      items = result || [];
    } catch (queryErr) {
      console.warn('Error with approval_status filter:', queryErr.message);
      try {
        const [result] = await db.query(
          `SELECT 
            i.item_id,
            i.user_id,
            i.item_name,
            i.description,
            i.category,
            i.post_type,
            i.location,
            i.image_url,
            i.phone,
            i.posted_at,
            u.name as owner_name,
            u.email as owner_email
           FROM Items i 
           LEFT JOIN Users u ON i.user_id = u.user_id 
           ORDER BY i.posted_at DESC`
        );
        items = result || [];
      } catch (fallbackErr) {
        console.error('Fallback query failed:', fallbackErr.message);
        items = [];
      }
    }

    const transformedItems = items.map(item => {
      let formattedDate = 'N/A';
      if (item.posted_at) {
        const date = new Date(item.posted_at);
        if (!isNaN(date.getTime())) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = date.toLocaleString('en-US', { month: 'short' }).toLowerCase();
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
        }
      }

      let normalizedCategory = item.category || 'Others';
      const categoryMap = {
        'electronic_gadget': 'Electronic Gadget',
        'electronics': 'Electronic Gadget',
        'electronics gadgets': 'Electronic Gadget',
        'electronics gadget': 'Electronic Gadget',
        'electronic gadget': 'Electronic Gadget',
        'accessory': 'Accessories',
        'accessories': 'Accessories',
        'doc': 'Documents',
        'document': 'Documents',
        'documents': 'Documents',
        'other': 'Others',
        'others': 'Others'
      };
      normalizedCategory = categoryMap[normalizedCategory.toLowerCase()] || normalizedCategory;

      return {
        id: item.item_id,
        title: item.item_name,
        description: item.description,
        location: item.location,
        category: normalizedCategory,
        image: item.image_url,
        date: formattedDate,
        ownerName: item.owner_name,
        ownerPhone: item.phone,
        ownerLocation: item.location,
        post_type: item.post_type
      };
    });

    res.json({ success: true, items: transformedItems });
  } catch (error) {
    console.error('Unexpected error in getAllMissingItems:', error.message);
    res.json({ success: true, items: [] });
  }
};

// Get missing items by user
exports.getUserMissingItems = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [items] = await db.query(
      `SELECT * FROM Items 
       WHERE user_id = ? AND post_type = 'lost'
       ORDER BY posted_at DESC`,
      [userId]
    );
    
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error getting user missing items:', error);
    res.status(500).json({ error: 'Failed to get user missing items' });
  }
};

// Get single missing item
exports.getMissingItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [items] = await db.query(
      `SELECT i.*, u.user_id as owner_id, u.name as owner_name, u.email as owner_email, u.firebase_uid 
       FROM Items i 
       JOIN Users u ON i.user_id = u.user_id 
       WHERE i.item_id = ? AND i.post_type = 'lost'`,
      [id]
    );
    
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ success: true, item: items[0] });
  } catch (error) {
    console.error('Error getting missing item:', error);
    res.status(500).json({ error: 'Failed to get missing item' });
  }
};

// Manual fix endpoint to fix all post_type values
exports.fixPostTypes = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Post type handling has been simplified - no manual fixes needed',
      fixed_items_count: 0
    });
  } catch (error) {
    console.error('Error fixing post_type values:', error);
    res.status(500).json({ error: 'Failed to fix post_type values', details: error.message });
  }
};

// Update missing item
exports.updateMissingItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, mobile, image_url, category, status } = req.body;
    const userId = req.user.id;
    
    // Check if item exists and belongs to user
    const [items] = await db.query(
      'SELECT * FROM Items WHERE item_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (items.length === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }
    
    await db.query(
      `UPDATE Items 
       SET item_name = ?, description = ?, location = ?, phone = ?, image_url = ?, category = ?, status = ?
       WHERE item_id = ? AND user_id = ?`,
      [name, description, location, mobile, image_url, category, status || 'open', id, userId]
    );
    
    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating missing item:', error);
    res.status(500).json({ error: 'Failed to update missing item' });
  }
};

// Delete missing item
exports.deleteMissingItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const [result] = await db.query(
      'DELETE FROM Items WHERE item_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }
    
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting missing item:', error);
    res.status(500).json({ error: 'Failed to delete missing item' });
  }
};

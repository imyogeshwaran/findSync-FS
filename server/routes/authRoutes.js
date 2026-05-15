const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const userController = require('../controllers/userController');
const bcrypt = require('bcrypt');
require('dotenv').config();

// ==================== ADMIN LOGIN ENDPOINT ====================
// Dedicated endpoint for admin authentication with role validation
router.post('/admin/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!password || (!username && !email)) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    // Query admin table first - admins have separate table
    let query = 'SELECT admin_id, username, email, password_hash, created_at FROM admin WHERE ';
    let params = [];

    if (username) {
      query += 'LOWER(username) = LOWER(?)';
      params.push(username);
    } else {
      query += 'LOWER(email) = LOWER(?)';
      params.push(email);
    }

    const [admins] = await db.query(query, params);

    if (!admins || admins.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const admin = admins[0];

    // Compare password with hash
    const passwordMatches = admin.password_hash ? await bcrypt.compare(password, admin.password_hash) : false;
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Generate JWT token with admin role
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(
      {
        admin_id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        role: 'admin' // Crucial: Include role in token
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Log successful admin login (for audit trail)
    console.log(`[ADMIN LOGIN SUCCESS] Admin ID: ${admin.admin_id}, Email: ${admin.email}, Timestamp: ${new Date().toISOString()}`);

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
    console.error('[ADMIN LOGIN ERROR]', error);
    return res.status(500).json({
      error: 'Admin login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ==================== USER SIGNUP ENDPOINT ====================
router.post('/signup', async (req, res) => {
  try {
    console.log('auth/signup called with body:', req.body);
    // Accept `mobile` or `phone` from different clients
    const { firebase_uid, name, email, mobile, phone, password } = req.body;
    const normalizedMobile = mobile || phone || null;

    if (!firebase_uid || !email || !password) {
      return res.status(400).json({ error: 'Firebase UID, email, and password are required for manual signup' });
    }

    // Check if user already exists - use LOWER() for case-insensitive email comparison
    const [existingUsers] = await db.query(
      'SELECT user_id, email, firebase_uid FROM Users WHERE LOWER(email) = LOWER(?) OR firebase_uid = ?',
      [email, firebase_uid]
    );
    
    if (existingUsers && existingUsers.length > 0) {
      const matchedUser = existingUsers[0];
      console.log('User exists, updating profile:', {
        attemptedEmail: email.toLowerCase(),
        existingEmail: matchedUser.email.toLowerCase(),
        emailMatch: email.toLowerCase() === matchedUser.email.toLowerCase(),
        attemptedFirebaseUid: firebase_uid,
        matchedUserId: matchedUser.user_id
      });

      // Update the user's information
      const updateSql = `
        UPDATE Users 
        SET 
          name = COALESCE(?, name),
          mobile = COALESCE(?, mobile),
          password = COALESCE(?, password),
          role = COALESCE(role, 'user')
        WHERE user_id = ?
      `;
      
      try {
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        await db.query(updateSql, [name, normalizedMobile, hashedPassword, matchedUser.user_id]);
        console.log('Updated user profile successfully');

        // Generate JWT for the existing user
        // Re-query user to include mobile and any updated fields
        const [rows] = await db.query('SELECT user_id, firebase_uid, name, email, mobile FROM Users WHERE user_id = ?', [matchedUser.user_id]);
        const updated = rows && rows[0] ? rows[0] : matchedUser;

        const token = jwt.sign(
          {
            id: updated.user_id,
            firebase_uid: updated.firebase_uid,
            email: updated.email,
            name: updated.name,
            role: 'user'
          },
          process.env.JWT_SECRET || 'dev-secret',
          { expiresIn: '7d' }
        );

        return res.json({
          success: true,
          message: 'User profile updated successfully',
          token,
          user: {
            id: updated.user_id,
            firebase_uid: updated.firebase_uid,
            email: updated.email,
            name: updated.name,
            mobile: updated.mobile || null
          }
        });
      } catch (updateError) {
        console.error('Failed to update user profile:', updateError);
        return res.status(500).json({
          error: 'Failed to update user profile',
          details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
        });
      }
    }

    // Use a direct INSERT with known columns - simpler and more reliable
    const insertSql = `
      INSERT INTO Users (
        firebase_uid, name, email, mobile, phone, password, role
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?
      )`;
    const hashedForInsert = password ? await bcrypt.hash(password, 10) : null;
    const values = [
      firebase_uid,
      name || null,
      email,
      normalizedMobile,  // try mobile column
      normalizedMobile,  // also update phone column for compatibility
      hashedForInsert,
      'user'  // Default role for new users
    ];

    console.log('Executing INSERT with SQL:', insertSql);
    console.log('Values:', values);

    let userId;
    
    try {
      const [result] = await db.query(insertSql, values);
      console.log('INSERT successful, insertId:', result.insertId);
      userId = result.insertId;
    } catch (dbError) {
      console.error('Database error during INSERT:', dbError);
      // Try fallback without mobile/phone if the first attempt fails
      if (dbError.code === 'ER_BAD_FIELD_ERROR') {
        console.log('Retrying INSERT without mobile/phone columns...');
        const fallbackSql = `
          INSERT INTO Users (
            firebase_uid, name, email, password, role
          ) VALUES (
            ?, ?, ?, ?, ?
          )`;
  const hashedFallback = password ? await bcrypt.hash(password, 10) : null;
  const fallbackValues = [firebase_uid, name || null, email, hashedFallback, 'user'];
        
        try {
          const [fallbackResult] = await db.query(fallbackSql, fallbackValues);
          console.log('Fallback INSERT successful, insertId:', fallbackResult.insertId);
          userId = fallbackResult.insertId;
        } catch (fallbackError) {
          console.error('Fallback INSERT also failed:', fallbackError);
          return res.status(500).json({
            error: 'Database error while creating user',
            details: process.env.NODE_ENV === 'development' ? fallbackError.message : undefined
          });
        }
      } else {
        return res.status(500).json({
          error: 'Database error while creating user',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
    }

    // Generate JWT (use fallback secret in dev if missing)
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign(
      {
        id: userId,
        firebase_uid,
        email,
        name,
        role: 'user'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Read back inserted user to include mobile
    const [insertedRows] = await db.query('SELECT user_id, firebase_uid, name, email, mobile FROM Users WHERE user_id = ?', [userId]);
    const inserted = insertedRows && insertedRows[0] ? insertedRows[0] : { user_id: userId, firebase_uid, name, email };

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: inserted.user_id,
        firebase_uid: inserted.firebase_uid,
        email: inserted.email,
        name: inserted.name,
        mobile: inserted.mobile || null
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ 
      error: 'Failed to create user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route for handling Google/Firebase authentication
// This endpoint will ensure the user exists in the database and return a JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password, firebase_uid, name, id_token } = req.body;

    // Check if this is a regular login (email + password) or Firebase auth
    const isRegularLogin = email && password;
    const isFirebaseLogin = firebase_uid && id_token;

    if (!isRegularLogin && !isFirebaseLogin) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    // Ensure user exists in Users table and get their DB user_id
    let userId = null;
    let userName = name;
    let userFirebaseUid = firebase_uid;
    let userRole = 'user'; // Default role for regular users

    try {
      // For regular login, check email and password
      if (isRegularLogin) {
        const [users] = await db.query(
          'SELECT user_id, firebase_uid, name, email, mobile, password, role FROM Users WHERE LOWER(email) = LOWER(?)',
          [email]
        );

        if (!users || users.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];
        
        // SECURITY: Prevent admin role from using user login endpoint
        if (user.role === 'admin') {
          console.warn(`[SECURITY] Attempted admin user login via regular endpoint. Email: ${email}`);
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare hashed password
        const passwordMatches = user.password ? await bcrypt.compare(password, user.password) : false;
        if (!passwordMatches) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Keep existing user data - don't overwrite with nulls
        userId = user.user_id;
        userFirebaseUid = user.firebase_uid;
        userName = user.name;  // Keep existing name
        userEmail = user.email;
        userMobile = user.mobile;
        userRole = user.role || 'user';
      } else {
        // For Firebase login, find user by firebase_uid or email
        const [existingUsers] = await db.query(
          'SELECT user_id, firebase_uid, name, email, role FROM Users WHERE firebase_uid = ? OR LOWER(email) = LOWER(?)',
          [firebase_uid, email]
        );
    
        if (existingUsers && existingUsers.length > 0) {
          const user = existingUsers[0];
          userId = user.user_id;
          userRole = user.role || 'user';
          
          // Only update if the new values are non-null and different from existing
          let updateFields = [];
          let updateValues = [];
          
          if (name && name !== 'User' && name !== user.name) {
            updateFields.push('name = ?');
            updateValues.push(name);
          }
          if (email && email !== user.email) {
            updateFields.push('email = ?');
            updateValues.push(email);
          }
          if (firebase_uid && firebase_uid !== user.firebase_uid) {
            updateFields.push('firebase_uid = ?');
            updateValues.push(firebase_uid);
          }

          if (updateFields.length > 0) {
            console.log('Updating existing user info (preserving data):', {
              oldName: user.name,
              newName: name,
              oldEmail: user.email,
              newEmail: email,
              oldFirebaseUid: user.firebase_uid,
              newFirebaseUid: firebase_uid
            });

            updateValues.push(userId);
            await db.query(
              `UPDATE Users SET ${updateFields.join(', ')} WHERE user_id = ?`,
              updateValues
            );
          }
        } else {
          // Insert new user for Firebase auth with default 'user' role
          const [result] = await db.query(
            'INSERT INTO Users (firebase_uid, name, email, role) VALUES (?, ?, ?, ?)',
            [firebase_uid, name, email, 'user']
          );
          userId = result.insertId;
          userRole = 'user';
        }
      }

      // Issue JWT including the DB user id, name, and role
      const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
      const token = jwt.sign(
        {
          id: userId,
          firebase_uid: userFirebaseUid,
          email,
          name: userName,
          role: userRole  // Include role in token for frontend logic
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Re-read user to include mobile and authoritative name/email/role
      try {
        const [uRows] = await db.query('SELECT user_id, firebase_uid, name, email, mobile, role FROM Users WHERE user_id = ?', [userId]);
        const u = uRows && uRows[0] ? uRows[0] : null;
        res.json({
          token,
          user: {
            id: u ? u.user_id : userId,
            firebase_uid: u ? u.firebase_uid : userFirebaseUid,
            email: u ? u.email : email,
            name: u ? u.name : userName,
            mobile: u ? u.mobile || null : null,
            role: u ? u.role : userRole
          }
        });
      } catch (readErr) {
        console.warn('Could not re-query user after login:', readErr.message);
        res.json({ token, user: { id: userId, firebase_uid: userFirebaseUid, email, name: userName, role: userRole } });
      }
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      res.status(500).json({ error: 'Database operation failed', details: process.env.NODE_ENV === 'development' ? dbError.message : undefined });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Backwards-compatible sync endpoint (some frontends call /api/auth/sync)
router.post('/sync', userController.syncUser);

// ==================== PASSWORD RESET WITH OTP ====================
const otpService = require('../services/otpService');

// Send OTP to email for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('📬 [FORGOT-PASSWORD ROUTE] Request received');
    console.log('='.repeat(60));
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📧 Email Provided:', email ? 'YES' : 'NO');
    if (email) console.log('   Value:', email);

    if (!email) {
      console.warn('❌ Email validation failed - Email is required');
      return res.status(400).json({ error: 'Email is required' });
    }

    // Step 1: Validate email format
    console.log('\n📋 Step 1 - Email format validation');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('❌ Invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }
    console.log('✓ Email format is valid');

    // Step 2: Check if user exists
    console.log('\n👤 Step 2 - Checking if user exists in database');
    const [users] = await db.query(
      'SELECT user_id, name FROM Users WHERE LOWER(email) = LOWER(?)',
      [email]
    );
    
    console.log('  - Users found:', users ? users.length : 0);
    if (users && users.length > 0) {
      console.log('  ✓ User exists in database');
      console.log('    - User ID:', users[0].user_id);
      console.log('    - Name:', users[0].name || 'Not set');
    } else {
      console.warn('  ⚠️  User not found for email:', email);
      // For security, don't reveal if email exists
      console.log('  📌 Sending generic success response (security measure)');
      return res.json({ 
        success: true, 
        message: 'If this email is registered, you will receive an OTP shortly' 
      });
    }

    // Step 3: Send OTP
    console.log('\n🚀 Step 3 - Sending OTP via otpService');
    const result = await otpService.sendOTP(email);
    
    console.log('📤 OTP Send Result:', JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('✅ FORGOT-PASSWORD ROUTE COMPLETED');
    console.log('='.repeat(60) + '\n');
    
    return res.json(result);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR IN FORGOT-PASSWORD ROUTE');
    console.error('='.repeat(60));
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Full Error:', error);
    console.error('='.repeat(60) + '\n');
    
    return res.status(200).json({ 
      success: false,
      error: 'Failed to send OTP',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later',
      message: process.env.NODE_ENV === 'development' ? 'Check server console for detailed error' : 'If email is registered, OTP will be sent'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🔐 [VERIFY-OTP ROUTE] Request received');
    console.log('='.repeat(60));
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📧 Email Provided:', email ? 'YES' : 'NO');
    console.log('🔐 OTP Provided:', otp ? 'YES (length: ' + otp.length + ')' : 'NO');

    if (!email || !otp) {
      console.warn('❌ Validation failed - Email and OTP are required');
      console.warn('  - Email:', email ? 'provided' : 'MISSING');
      console.warn('  - OTP:', otp ? 'provided' : 'MISSING');
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    console.log('✓ All required fields present');
    console.log('\n🚀 Calling otpService.verifyOTP...');
    
    const result = await otpService.verifyOTP(email, otp);
    
    console.log('📤 Verification Result:', JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFY-OTP ROUTE COMPLETED');
    console.log('='.repeat(60) + '\n');
    
    return res.json(result);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR IN VERIFY-OTP ROUTE');
    console.error('='.repeat(60));
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    
    return res.status(400).json({ 
      error: error.message || 'Failed to verify OTP',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Reset password with verified OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🔑 [RESET-PASSWORD ROUTE] Request received');
    console.log('='.repeat(60));
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📧 Email Provided:', email ? 'YES' : 'NO');
    console.log('🔐 Password Provided:', newPassword ? 'YES (length: ' + newPassword.length + ')' : 'NO');

    if (!email || !newPassword) {
      console.warn('❌ Validation failed - Email and new password are required');
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      console.warn('❌ Password validation failed - Password too short');
      console.warn('  - Length provided:', newPassword.length, '(minimum required: 6)');
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    console.log('✓ All validations passed');
    console.log('\n🚀 Calling otpService.resetPassword...');
    
    const result = await otpService.resetPassword(email, newPassword);
    
    console.log('📤 Reset Result:', JSON.stringify(result, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('✅ RESET-PASSWORD ROUTE COMPLETED');
    console.log('='.repeat(60) + '\n');
    
    return res.json(result);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ ERROR IN RESET-PASSWORD ROUTE');
    console.error('='.repeat(60));
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    
    return res.status(400).json({ 
      error: error.message || 'Failed to reset password',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;


const db = require('../config/database');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

// Configure email sending
let transporter = null;
const initializeTransporter = () => {
  if (transporter) return transporter;
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD
    }
  });
  
  return transporter;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendOTP = async (email) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 [OTP SEND] Starting OTP generation and sending process');
    console.log('📧 Target Email:', email);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    // Step 1: Generate OTP
    const otp = generateOTP();
    console.log('✓ Step 1 - OTP Generated:', otp);

    // Step 2: Calculate expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
    console.log('✓ Step 2 - Expiration Time Set:', expiresAt.toISOString(), '(10 minutes from now)');

    // Step 3: Store OTP in database
    try {
      const [dbResult] = await db.query(
        'INSERT INTO password_reset_otp (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?',
        [email, otp, expiresAt, otp, expiresAt]
      );
      console.log('✓ Step 3 - OTP Stored in Database');
      console.log('  - Query Result:', JSON.stringify(dbResult));
    } catch (dbError) {
      console.error('❌ Step 3 - Database Error:', dbError.message);
      throw new Error('Failed to store OTP in database: ' + dbError.message);
    }

    // Step 4: Check Gmail credentials
    console.log('\n🔐 [CREDENTIALS CHECK]');
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_PASSWORD;
    
    console.log('  - GMAIL_USER configured:', !!gmailUser ? '✓ YES' : '❌ NO');
    if (gmailUser) console.log('    Value:', gmailUser);
    console.log('  - GMAIL_PASSWORD configured:', !!gmailPassword ? '✓ YES' : '❌ NO');
    if (gmailPassword) console.log('    Length:', gmailPassword.length, 'characters');

    // Step 5: Validate credentials before attempting to send
    if (!gmailUser || !gmailPassword) {
      console.warn('\n⚠️  [WARNING] Gmail credentials incomplete!');
      console.warn('  Missing:', [!gmailUser ? 'GMAIL_USER' : '', !gmailPassword ? 'GMAIL_PASSWORD' : ''].filter(Boolean).join(', '));
      console.log('  ℹ️  OTP saved to database but will NOT be sent via email');
      console.log(`  ℹ️  📌 For testing, use OTP: ${otp}`);
      return {
        success: false,
        message: 'OTP generated but email credentials not configured. Check server logs.',
        details: 'Gmail credentials are missing. Check GMAIL_USER and GMAIL_PASSWORD in .env file',
        otp // Return OTP for development/testing
      };
    }

    // Step 6: Initialize and verify transporter
    console.log('\n📨 [EMAIL TRANSPORTER SETUP]');
    let mail;
    try {
      mail = initializeTransporter();
      console.log('✓ Email transporter initialized');
    } catch (transportError) {
      console.error('❌ Failed to initialize transporter:', transportError.message);
      throw new Error('Failed to initialize email transporter: ' + transportError.message);
    }

    // Step 7: Prepare email content
    console.log('\n📝 [EMAIL PREPARATION]');
    const mailOptions = {
      from: gmailUser,
      to: email,
      subject: 'FindSync - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Password Reset Request</h2>
          <p>Your One-Time Password (OTP) for resetting your FindSync password is:</p>
          <div style="font-size: 32px; margin: 20px 0; letter-spacing: 5px; font-weight: bold; color: #007bff;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes only.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
          <hr/>
          <p style="color: #666; font-size: 12px;">FindSync Team</p>
        </div>
      `,
      text: `Your FindSync password reset OTP is: ${otp}\n\nThis code is valid for 10 minutes only.\n\nIf you didn't request this, please ignore.`
    };
    console.log('✓ Email content prepared');
    console.log('  - From:', mailOptions.from);
    console.log('  - To:', mailOptions.to);
    console.log('  - Subject:', mailOptions.subject);

    // Step 8: Send email
    console.log('\n🚀 [EMAIL SENDING]');
    let sendResult;
    try {
      sendResult = await mail.sendMail(mailOptions);
      console.log('✅ SUCCESS - Email sent successfully!');
      console.log('  - Message ID:', sendResult.messageId);
      console.log('  - Response:', sendResult.response);
      console.log('\n' + '='.repeat(60));
      console.log('✅ OTP SEND COMPLETED SUCCESSFULLY');
      console.log('='.repeat(60) + '\n');

      return {
        success: true,
        message: 'OTP sent successfully to ' + email
      };
    } catch (sendError) {
      console.error('❌ FAILED - Error sending email:', sendError.message);
      console.error('Full Error:', sendError);
      
      // Provide detailed diagnostics
      if (sendError.code === 'EAUTH') {
        console.error('\n🔐 [AUTH ERROR] Invalid Gmail credentials!');
        console.error('  Solution: Verify Gmail credentials in .env file');
        console.error('  Note: Gmail App Passwords require 2FA to be enabled');
      } else if (sendError.code === 'ESOCKET') {
        console.error('\n🌐 [NETWORK ERROR] Cannot connect to Gmail server!');
        console.error('  Solution: Check internet connection and firewall settings');
      }
      
      throw new Error('Failed to send OTP email: ' + sendError.message);
    }
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ OTP SEND FAILED - Critical Error');
    console.error('='.repeat(60));
    console.error('Error Message:', error.message || error);
    console.error('Error Details:', error);
    console.error('Gmail Configuration Check:');
    console.error('  - GMAIL_USER exists:', !!process.env.GMAIL_USER);
    console.error('  - GMAIL_PASSWORD exists:', !!process.env.GMAIL_PASSWORD);
    console.error('  - NODE_ENV:', process.env.NODE_ENV);
    console.error('='.repeat(60) + '\n');
    
    throw error;
  }
};

// Verify OTP
const verifyOTP = async (email, otp) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 [OTP VERIFY] Starting OTP verification process');
    console.log('📧 Email:', email);
    console.log('🔐 OTP Length:', otp.length, 'characters');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    // Step 1: Fetch OTP from database
    console.log('\n📊 Step 1 - Fetching OTP from database...');
    const [results] = await db.query(
      'SELECT otp, expires_at, verified FROM password_reset_otp WHERE email = ?',
      [email]
    );
    console.log('  - Query Result Count:', results ? results.length : 0);

    if (!results || results.length === 0) {
      console.error('❌ No OTP found for email:', email);
      throw new Error('No OTP found for this email');
    }

    const record = results[0];
    console.log('✓ OTP record found');
    console.log('  - Stored OTP Length:', record.otp.length);
    console.log('  - Expires At:', record.expires_at);
    console.log('  - Already Verified:', record.verified ? 'YES' : 'NO');

    // Step 2: Check if OTP is expired
    console.log('\n⏱️  Step 2 - Checking OTP expiration...');
    const now = new Date();
    const expiresAt = new Date(record.expires_at);
    const isExpired = now > expiresAt;
    console.log('  - Current Time:', now.toISOString());
    console.log('  - Expires At:', expiresAt.toISOString());
    console.log('  - Time Remaining:', Math.max(0, (expiresAt - now) / 1000), 'seconds');
    console.log('  - Is Expired:', isExpired ? '❌ YES' : '✓ NO');

    if (isExpired) {
      console.error('❌ OTP has expired');
      throw new Error('OTP has expired. Please request a new one.');
    }

    // Step 3: Verify OTP matches
    console.log('\n🔐 Step 3 - Verifying OTP value...');
    const otpMatches = record.otp === otp;
    console.log('  - Submitted OTP:', otp);
    console.log('  - Stored OTP:   ', record.otp);
    console.log('  - Match Result:', otpMatches ? '✓ MATCH' : '❌ NO MATCH');

    if (!otpMatches) {
      console.error('❌ Invalid OTP');
      throw new Error('Invalid OTP. Please check and try again.');
    }

    // Step 4: Mark OTP as verified
    console.log('\n✅ Step 4 - Marking OTP as verified...');
    await db.query(
      'UPDATE password_reset_otp SET verified = 1 WHERE email = ?',
      [email]
    );
    console.log('✓ OTP marked as verified in database');

    console.log('\n' + '='.repeat(60));
    console.log('✅ OTP VERIFICATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60) + '\n');

    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ OTP VERIFICATION FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('='.repeat(60) + '\n');
    throw error;
  }
};

// Reset password with verified OTP (Updates both Database AND Firebase Auth)
const resetPassword = async (email, newPassword) => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 [PASSWORD RESET] Starting password reset process');
    console.log('📧 Email:', email);
    console.log('🔐 New Password Length:', newPassword.length, 'characters');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('='.repeat(60));

    // Step 1: Check if OTP was verified
    console.log('\n📊 Step 1 - Checking OTP verification status...');
    const [results] = await db.query(
      'SELECT verified FROM password_reset_otp WHERE email = ?',
      [email]
    );

    if (!results || results.length === 0) {
      console.error('❌ No OTP record found for email:', email);
      throw new Error('OTP not verified for this email. Please verify OTP first.');
    }

    if (!results[0].verified) {
      console.error('❌ OTP not verified for this email');
      throw new Error('OTP not verified. Please verify OTP first.');
    }

    console.log('✓ OTP is verified');

    // Step 2: Check if user exists and get Firebase UID
    console.log('\n👤 Step 2 - Checking if user exists and fetching Firebase UID...');
    const [users] = await db.query(
      'SELECT user_id, firebase_uid FROM Users WHERE LOWER(email) = LOWER(?)',
      [email]
    );

    if (!users || users.length === 0) {
      console.error('❌ User not found for email:', email);
      throw new Error('User not found. Please check email and try again.');
    }

    const userId = users[0].user_id;
    const firebaseUid = users[0].firebase_uid;
    console.log('✓ User found');
    console.log('  - User ID:', userId);
    console.log('  - Firebase UID:', firebaseUid ? '✓ FOUND' : '⚠️  NOT SET');

    // Step 3: Hash new password for database
    console.log('\n🔐 Step 3 - Hashing new password...');
    const bcrypt = require('bcrypt');
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log('✓ Password hashed successfully');
      console.log('  - Hash Length:', hashedPassword.length, 'characters');
    } catch (hashError) {
      console.error('❌ Error hashing password:', hashError.message);
      throw new Error('Failed to hash password: ' + hashError.message);
    }

    // Step 4: Update password in Firebase Auth (if Firebase UID exists)
    console.log('\n🔥 Step 4 - Updating password in Firebase Auth...');
    let firebaseUpdateSuccess = false;
    if (firebaseUid) {
      try {
        const firebaseAdmin = require('../config/firebaseAdmin');
        console.log('  - Attempting to initialize Firebase Admin...');
        firebaseAdmin.initializeFirebaseAdmin();
        
        console.log('  - Updating Firebase Auth for UID:', firebaseUid);
        const updateResult = await firebaseAdmin.updateUserPassword(firebaseUid, newPassword);
        console.log('✓ Firebase Auth password updated successfully');
        firebaseUpdateSuccess = true;
      } catch (firebaseError) {
        console.warn('⚠️  Warning - Firebase Auth update failed');
        console.warn('   Error:', firebaseError.message);
        console.warn('   The password WILL be updated in the database, but not in Firebase Auth');
        console.warn('   Recommendation: Check Firebase setup in .env');
        // Don't throw - continue with database update as fallback
      }
    } else {
      console.warn('⚠️  Warning - No Firebase UID found for this user');
      console.warn('   Password will only be updated in database');
    }

    // Step 5: Update password in database
    console.log('\n💾 Step 5 - Updating password in database...');
    try {
      const [updateResult] = await db.query(
        'UPDATE Users SET password = ? WHERE LOWER(email) = LOWER(?)',
        [hashedPassword, email]
      );
      console.log('✓ Password updated in database');
      console.log('  - Affected Rows:', updateResult.affectedRows);
      console.log('  - Changed Rows:', updateResult.changedRows);
    } catch (updateError) {
      console.error('❌ Error updating password in database:', updateError.message);
      throw new Error('Failed to update password in database: ' + updateError.message);
    }

    // Step 6: Delete OTP record
    console.log('\n🧹 Step 6 - Cleaning up OTP record...');
    try {
      const [deleteResult] = await db.query('DELETE FROM password_reset_otp WHERE email = ?', [email]);
      console.log('✓ OTP record deleted');
      console.log('  - Affected Rows:', deleteResult.affectedRows);
    } catch (deleteError) {
      console.error('⚠️  Warning - Error deleting OTP record:', deleteError.message);
      // Non-critical, continue
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ PASSWORD RESET COMPLETED SUCCESSFULLY');
    if (firebaseUpdateSuccess) {
      console.log('   Password updated in BOTH Firebase Auth and Database ✓');
    } else if (firebaseUid) {
      console.log('   Password updated in Database only ⚠️');
      console.log('   (Firebase Auth update failed - see above for details)');
    } else {
      console.log('   Password updated in Database only');
      console.log('   (No Firebase UID found)');
    }
    console.log('='.repeat(60) + '\n');

    return { 
      success: true, 
      message: 'Password reset successfully. You can now log in with your new password.',
      details: {
        databaseUpdated: true,
        firebaseUpdated: firebaseUpdateSuccess
      }
    };
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ PASSWORD RESET FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('='.repeat(60) + '\n');
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  resetPassword
};

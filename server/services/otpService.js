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
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    // Store OTP in database
    await db.query(
      'INSERT INTO password_reset_otp (email, otp, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE otp = ?, expires_at = ?',
      [email, otp, expiresAt, otp, expiresAt]
    );

    console.log(`\n📧 OTP for ${email}: ${otp} (valid for 10 minutes)\n`);

    // In development mode, don't actually send email
    if (process.env.NODE_ENV === 'development' || !process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
      console.warn('⚠️  Development Mode: OTP not sent via email');
      console.warn(`📌 For testing, use OTP: ${otp}`);
      return {
        success: true,
        message: 'OTP generated (development mode - check console/logs)',
        otp // Return OTP for development
      };
    }

    // Production: Send email with OTP
    const mail = initializeTransporter();
    const mailOptions = {
      from: process.env.GMAIL_USER,
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
      `
    };

    await mail.sendMail(mailOptions);
    console.log('✓ Email sent successfully to:', email);

    return {
      success: true,
      message: 'OTP sent successfully'
    };
  } catch (error) {
    console.error('Error sending OTP:', error.message || error);
    console.error('Gmail config:', {
      user: process.env.GMAIL_USER,
      hasPassword: !!process.env.GMAIL_PASSWORD
    });
    throw new Error('Failed to send OTP email: ' + error.message);
  }
};

// Verify OTP
const verifyOTP = async (email, otp) => {
  try {
    const [results] = await db.query(
      'SELECT otp, expires_at FROM password_reset_otp WHERE email = ?',
      [email]
    );

    if (!results || results.length === 0) {
      throw new Error('No OTP found for this email');
    }

    const record = results[0];

    // Check if OTP is expired
    if (new Date() > new Date(record.expires_at)) {
      throw new Error('OTP has expired');
    }

    // Check if OTP matches
    if (record.otp !== otp) {
      throw new Error('Invalid OTP');
    }

    // Mark OTP as verified
    await db.query(
      'UPDATE password_reset_otp SET verified = 1 WHERE email = ?',
      [email]
    );

    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

// Reset password with verified OTP
const resetPassword = async (email, newPassword) => {
  try {
    const [results] = await db.query(
      'SELECT verified FROM password_reset_otp WHERE email = ?',
      [email]
    );

    if (!results || results.length === 0 || !results[0].verified) {
      throw new Error('OTP not verified for this email');
    }

    // Check if email exists in users table
    const [users] = await db.query('SELECT user_id FROM Users WHERE LOWER(email) = LOWER(?)', [email]);

    if (!users || users.length === 0) {
      throw new Error('User not found');
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE Users SET password = ? WHERE LOWER(email) = LOWER(?)',
      [hashedPassword, email]
    );

    // Delete OTP record
    await db.query('DELETE FROM password_reset_otp WHERE email = ?', [email]);

    return { success: true, message: 'Password reset successfully' };
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  verifyOTP,
  resetPassword
};

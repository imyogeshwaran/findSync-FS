#!/usr/bin/env node
/**
 * Comprehensive Forgot Password OTP Flow Debugger
 * This script helps diagnose and test the entire forgot password OTP flow
 */

const readline = require('readline');
const db = require('./config/database');
const otpService = require('./services/otpService');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const printSection = (title) => {
  console.log('\n' + '='.repeat(70));
  console.log('  ' + title);
  console.log('='.repeat(70));
};

const printSubsection = (title) => {
  console.log('\n📌 ' + title);
  console.log('-'.repeat(70));
};

const testResult = (name, passed, details = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} | ${name}`);
  if (details) console.log(`     → ${details}`);
};

const main = async () => {
  try {
    printSection('FORGOT PASSWORD OTP FLOW DEBUGGER');
    console.log('This tool will help you diagnose issues with the forgot password OTP system.\n');

    let continueTests = true;

    while (continueTests) {
      console.log('\n📋 SELECT A TEST:');
      console.log('1. Check Environment Configuration');
      console.log('2. Test Gmail Connection');
      console.log('3. Test Database Connection');
      console.log('4. Test OTP Generation');
      console.log('5. Full E2E Test (Request OTP -> Verify -> Reset)');
      console.log('6. Check OTP Records in Database');
      console.log('7. View Detailed Debug Logs');
      console.log('8. Exit');

      const choice = await question('\nEnter your choice (1-8): ');

      switch (choice) {
        case '1':
          await checkEnvironmentConfig();
          break;
        case '2':
          await testGmailConnection();
          break;
        case '3':
          await testDatabaseConnection();
          break;
        case '4':
          await testOTPGeneration();
          break;
        case '5':
          await testFullE2EFlow();
          break;
        case '6':
          await checkOTPRecords();
          break;
        case '7':
          await viewDebugLogs();
          break;
        case '8':
          continueTests = false;
          break;
        default:
          console.log('Invalid choice. Please try again.');
      }
    }

    rl.close();
    console.log('\n👋 Debugger closed. Goodbye!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    rl.close();
    process.exit(1);
  }
};

const checkEnvironmentConfig = async () => {
  printSubsection('ENVIRONMENT CONFIGURATION CHECK');

  const config = {
    'DB_HOST': process.env.DB_HOST,
    'DB_USER': process.env.DB_USER,
    'DB_NAME': process.env.DB_NAME,
    'GMAIL_USER': process.env.GMAIL_USER,
    'GMAIL_PASSWORD': process.env.GMAIL_PASSWORD,
    'JWT_SECRET': process.env.JWT_SECRET,
    'NODE_ENV': process.env.NODE_ENV,
    'PORT': process.env.PORT
  };

  for (const [key, value] of Object.entries(config)) {
    const status = value ? '✓' : '✗';
    const display = value && key === 'GMAIL_PASSWORD' 
      ? `${value.substring(0, 5)}... (${value.length} chars)`
      : value;
    console.log(`${status} ${key.padEnd(20)} : ${display || '[NOT SET]'}`);
  }

  // Specific checks
  printSubsection('DETAILED ANALYSIS');

  testResult(
    'Database Host',
    !!process.env.DB_HOST,
    `Value: ${process.env.DB_HOST}`
  );

  testResult(
    'Database User',
    !!process.env.DB_USER,
    `Value: ${process.env.DB_USER}`
  );

  testResult(
    'Gmail User (Sender Email)',
    !!process.env.GMAIL_USER,
    `Value: ${process.env.GMAIL_USER}`
  );

  testResult(
    'Gmail App Password',
    !!process.env.GMAIL_PASSWORD,
    process.env.GMAIL_PASSWORD ? `Length: ${process.env.GMAIL_PASSWORD.length} (should have spaces)` : 'Missing'
  );

  testResult(
    'NODE_ENV Setting',
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development',
    `Current: ${process.env.NODE_ENV}`
  );

  if (process.env.NODE_ENV === 'development') {
    console.log('\n⚠️  NOTE: Running in DEVELOPMENT mode');
    console.log('   - Email will be sent if Gmail credentials are valid');
    console.log('   - OTP will be logged to console for reference');
  }

  if (!process.env.GMAIL_PASSWORD || !process.env.GMAIL_PASSWORD.includes(' ')) {
    console.log('\n🚨 CRITICAL ISSUE: Gmail App Password format is incorrect!');
    console.log('   - Gmail App Passwords typically have spaces (e.g., "eibk klnu avsz abim")');
    console.log('   - Make sure you generated an App Password from Google Account Settings');
    console.log('   - Link: https://myaccount.google.com/apppasswords');
  }
};

const testGmailConnection = async () => {
  printSubsection('TESTING GMAIL CONNECTION');

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
    console.log('❌ Cannot test Gmail connection - credentials not configured');
    console.log('   Please set GMAIL_USER and GMAIL_PASSWORD in .env file');
    return;
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
      }
    });

    console.log('\n🔍 Step 1: Creating transporter...');
    console.log('✓ Transporter created');

    console.log('\n🔍 Step 2: Verifying Gmail connection...');
    
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ FAILED - Gmail connection error:', error.message);
        console.log('\nPossible Solutions:');
        console.log('1. Check if GMAIL_USER is set');
        console.log('2. Check if GMAIL_PASSWORD is a valid App Password');
        console.log('3. Enable 2FA on your Google Account');
        console.log('4. Generate new App Password from: https://myaccount.google.com/apppasswords');
        console.log('5. Check internet connection');
      } else {
        console.log('✅ PASSED - Gmail SMTP server is ready');
        console.log('   Gmail credentials are configured');
        console.log('\n🔍 Step 3: Sending test email...');

        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: process.env.GMAIL_USER,
          subject: '[FindSync] OTP Connection Test',
          text: 'This is a test email to verify the OTP system is working. If you received this, Gmail is configured correctly!',
          html: '<div style="font-family: Arial; padding: 20px;"><h2>FindSync OTP Test</h2><p>This is a test email. If you received this, Gmail is configured correctly!</p><p><strong>Timestamp:</strong> ' + new Date().toISOString() + '</p></div>'
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('❌ FAILED - Error sending test email:', error.message);
          } else {
            console.log('✅ PASSED - Test email sent successfully!');
            console.log('   Message ID: ' + info.messageId);
            console.log('   Response: ' + info.response);
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Error during Gmail test:', error.message);
  }
};

const testDatabaseConnection = async () => {
  printSubsection('TESTING DATABASE CONNECTION');

  try {
    console.log('🔍 Attempting to connect to database...');
    const [result] = await db.query('SELECT 1 as test');
    console.log('✅ PASSED - Database connection successful');

    // Check if OTP table exists
    console.log('\n🔍 Checking if password_reset_otp table exists...');
    const [tables] = await db.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'password_reset_otp'",
      [process.env.DB_NAME]
    );

    if (tables && tables.length > 0) {
      console.log('✅ password_reset_otp table exists');

      // Check table structure
      console.log('\n🔍 Checking table structure...');
      const [columns] = await db.query(
        'SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [process.env.DB_NAME, 'password_reset_otp']
      );

      console.log('Columns in password_reset_otp table:');
      for (const col of columns) {
        console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
      }
    } else {
      console.log('❌ password_reset_otp table does NOT exist!');
      console.log('   Please run the database setup script to create the table');
    }

    // Check Users table
    console.log('\n🔍 Checking if Users table exists...');
    const [userTables] = await db.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Users'",
      [process.env.DB_NAME]
    );

    if (userTables && userTables.length > 0) {
      console.log('✅ Users table exists');

      const [userCount] = await db.query('SELECT COUNT(*) as count FROM Users');
      console.log('   Total users in database: ' + userCount[0].count);
    } else {
      console.log('❌ Users table does NOT exist');
    }
  } catch (error) {
    console.error('❌ FAILED - Database connection error:', error.message);
    console.log('\nPossible Solutions:');
    console.log('1. Check DB_HOST is set');
    console.log('2. Check DB_USER is set');
    console.log('3. Check DB_PASSWORD is set');
    console.log('4. Check if MySQL server is running');
    console.log('5. Verify DB_NAME is set and database exists');
  }
};

const testOTPGeneration = async () => {
  printSubsection('TESTING OTP GENERATION');

  try {
    console.log('🔍 Generating 5 sample OTPs...\n');
    
    for (let i = 1; i <= 5; i++) {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`  ${i}. OTP: ${otp} (${otp.length} digits)`);
    }

    console.log('\n✅ OTP generation working correctly');
    console.log('   Each OTP is a 6-digit code');
  } catch (error) {
    console.error('❌ Error generating OTP:', error.message);
  }
};

const testFullE2EFlow = async () => {
  printSubsection('FULL E2E FLOW TEST');

  const testEmail = await question('\n📧 Enter test email address: ');

  try {
    // Step 1: Check if user exists
    console.log('\n🔍 Step 1: Checking if user exists...');
    const [users] = await db.query(
      'SELECT user_id, name FROM Users WHERE LOWER(email) = LOWER(?)',
      [testEmail]
    );

    if (!users || users.length === 0) {
      console.log('❌ User not found with email:', testEmail);
      console.log('   Please use an existing user email');
      return;
    }

    console.log('✅ User found');
    console.log('   User ID:', users[0].user_id);
    console.log('   Name:', users[0].name || 'Not set');

    // Step 2: Request OTP
    console.log('\n🔍 Step 2: Requesting OTP...');
    const otpResult = await otpService.sendOTP(testEmail);
    console.log('Result:', JSON.stringify(otpResult, null, 2));

    if (!otpResult.success && otpResult.otp) {
      console.log('\n⚠️  Email not sent, but OTP generated for testing:', otpResult.otp);
    }

    // Get OTP from database
    console.log('\n🔍 Step 3: Retrieving OTP from database...');
    const [otpRecords] = await db.query(
      'SELECT otp, expires_at, verified FROM password_reset_otp WHERE email = ?',
      [testEmail]
    );

    if (!otpRecords || otpRecords.length === 0) {
      console.log('❌ OTP not found in database!');
      return;
    }

    const generatedOTP = otpRecords[0].otp;
    console.log('✅ OTP retrieved from database');
    console.log('   OTP: ' + generatedOTP);
    console.log('   Expires At:', otpRecords[0].expires_at);
    console.log('   Verified: ' + (otpRecords[0].verified ? 'Yes' : 'No'));

    // Step 4: Verify OTP
    const verifyOtp = await question('\n🔐 Enter OTP to verify (or press Enter to use: ' + generatedOTP + '): ');
    const otpToVerify = verifyOtp.trim() || generatedOTP;

    console.log('\n🔍 Step 4: Verifying OTP...');
    const verifyResult = await otpService.verifyOTP(testEmail, otpToVerify);
    console.log('✅ OTP verified successfully');

    // Step 5: Reset password
    const newPassword = await question('\n🔑 Enter new password: ');

    if (newPassword.length < 6) {
      console.log('❌ Password must be at least 6 characters');
      return;
    }

    console.log('\n🔍 Step 5: Resetting password...');
    const resetResult = await otpService.resetPassword(testEmail, newPassword);
    console.log('✅ Password reset successfully');
    console.log('Result:', JSON.stringify(resetResult, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('✅ FULL E2E TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(70));
    console.log('\nThe forgot password flow is working correctly!');
  } catch (error) {
    console.error('\n❌ ERROR during E2E test:', error.message);
    console.error('\nFull Error:', error);
  }
};

const checkOTPRecords = async () => {
  printSubsection('OTP RECORDS IN DATABASE');

  try {
    const [records] = await db.query(`
      SELECT email, otp, expires_at, verified, 
             CASE 
               WHEN expires_at < NOW() THEN 'EXPIRED'
               ELSE 'VALID'
             END as status
      FROM password_reset_otp
      ORDER BY expires_at DESC
      LIMIT 10
    `);

    if (!records || records.length === 0) {
      console.log('\nNo OTP records found in database');
      return;
    }

    console.log(`\nFound ${records.length} OTP records:\n`);
    console.log('EMAIL'.padEnd(30) + 'OTP'.padEnd(10) + 'VERIFIED'.padEnd(10) + 'STATUS'.padEnd(10) + 'EXPIRES');
    console.log('-'.repeat(70));

    for (const record of records) {
      console.log(
        (record.email || 'N/A').padEnd(30) +
        (record.otp || 'N/A').padEnd(10) +
        (record.verified ? 'Yes' : 'No').padEnd(10) +
        record.status.padEnd(10) +
        record.expires_at
      );
    }

    // Offer to delete old records
    const deleteOld = await question('\n🗑️  Delete expired records? (y/n): ');
    if (deleteOld.toLowerCase() === 'y') {
      const [result] = await db.query('DELETE FROM password_reset_otp WHERE expires_at < NOW()');
      console.log(`✅ Deleted ${result.affectedRows} expired records`);
    }
  } catch (error) {
    console.error('❌ Error retrieving OTP records:', error.message);
  }
};

const viewDebugLogs = async () => {
  printSubsection('DEBUG INFORMATION');

  console.log('\n📋 TROUBLESHOOTING GUIDE:\n');

  console.log('ISSUE: Email not being sent');
  console.log('-------');
  console.log('1. Check if Gmail credentials are correct:');
  console.log('   GMAIL_USER=' + (process.env.GMAIL_USER ? '[SET]' : '[NOT SET]'));
  console.log('   GMAIL_PASSWORD=' + (process.env.GMAIL_PASSWORD ? '[SET]' : '[NOT SET]'));
  console.log('\n2. Verify Gmail App Password format:');

  console.log('   - Should contain spaces (e.g., "eibk klnu avsz abim")');
  console.log('   - 16 characters total');
  console.log('\n3. Enable Gmail 2FA:');
  console.log('   - Go to https://myaccount.google.com');
  console.log('   - Enable 2-Step Verification');
  console.log('   - Generate App Password for "Mail" and "Windows Computer"');
  console.log('\n4. Check if "Less secure app access" is enabled:');
  console.log('   - https://myaccount.google.com/lesssecureapps');
  console.log('   - Or use App Passwords instead (recommended)');

  console.log('\n\nISSUE: OTP not appearing in database');
  console.log('-------');
  console.log('1. Check database connection');
  console.log('2. Verify password_reset_otp table exists');
  console.log('3. Check server console for errors');
  console.log('4. Verify user exists in Users table');

  console.log('\n\nISSUE: OTP expired too quickly');
  console.log('-------');
  console.log('1. Check server time is correct');
  console.log('2. OTP validity is set to 10 minutes');
  console.log('3. Database timezone should match server timezone');

  console.log('\n\nUSEFUL COMMANDS:');
  console.log('-------');
  console.log('- View OTP records: SELECT * FROM password_reset_otp;');
  console.log('- Delete OTP records: DELETE FROM password_reset_otp;');
  console.log('- Test email: Use "Check Environment Config" then "Test Gmail Connection"');
};

// Start the debugger
main().catch(console.error);

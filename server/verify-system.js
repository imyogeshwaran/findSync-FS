const fs = require('fs');
const path = require('path');
const db = require('./config/database');
require('dotenv').config();

const checks = [];
let passCount = 0;
let failCount = 0;

const check = (name, condition, warning = false) => {
  if (condition) {
    console.log(`${warning ? '⚠️' : '✅'} ${name}`);
    if (!warning) passCount++;
  } else {
    console.log(`❌ ${name}`);
    failCount++;
  }
  checks.push({ name, passed: condition, warning });
};

const main = async () => {
  console.log('\n═══════════════════════════════════════════════');
  console.log('  FindSync - System Verification');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Environment checks
  console.log('📋 Environment Configuration:\n');
  
  check('NODE_ENV set', process.env.NODE_ENV !== undefined);
  check('Port configured', process.env.PORT !== undefined);
  check('Database host configured', process.env.DB_HOST !== undefined);
  check('Database name configured', process.env.DB_NAME !== undefined);
  check('JWT Secret configured', process.env.JWT_SECRET !== undefined);

  // 2. File structure checks
  console.log('\n📁 File Structure:\n');
  
  const files = [
    'routes/authRoutes.js',
    'services/otpService.js',
    'config/database.js',
    '../client/src/components/UserLoginForm.jsx',
    '../client/src/services/api.js'
  ];

  files.forEach(file => {
    const fullPath = path.join(__dirname, file);
    const exists = fs.existsSync(fullPath);
    check(`File: ${file}`, exists);
  });

  // 3. Database checks
  console.log('\n🗄️  Database:\n');
  
  try {
    const [result] = await db.query('SELECT 1 as test');
    check('Database connection', result && result[0]);

    // Check if Users table exists
    const [users] = await db.query('SHOW TABLES LIKE "Users"');
    check('Users table exists', users && users.length > 0);

    // Check if password_reset_otp table exists
    const [otpTable] = await db.query('SHOW TABLES LIKE "password_reset_otp"');
    check('OTP table exists', otpTable && otpTable.length > 0);

    if (otpTable && otpTable.length > 0) {
      // Check OTP table structure
      const [columns] = await db.query('DESCRIBE password_reset_otp');
      const requiredCols = ['email', 'otp', 'expires_at', 'verified'];
      const hasAllCols = requiredCols.every(col => 
        columns.some(c => c.Field === col)
      );
      check('OTP table structure valid', hasAllCols);
    }

  } catch (error) {
    check('Database connection', false);
    console.log(`   Error: ${error.message}`);
  }

  // 4. Package checks
  console.log('\n📦 Dependencies:\n');
  
  try {
    require('nodemailer');
    check('nodemailer installed', true);
  } catch {
    check('nodemailer installed', false);
  }

  try {
    require('express');
    check('express installed', true);
  } catch {
    check('express installed', false);
  }

  try {
    require('mysql2/promise');
    check('mysql2 installed', true);
  } catch {
    check('mysql2 installed', false);
  }

  // 5. Feature checks
  console.log('\n🔧 Features:\n');
  
  try {
    const otpService = require('./services/otpService');
    check('OTP Service exports', 
      otpService.generateOTP && 
      otpService.sendOTP && 
      otpService.verifyOTP &&
      otpService.resetPassword
    );
  } catch (error) {
    check('OTP Service exports', false);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  ✅ Passed: ${passCount}  |  ❌ Failed: ${failCount}`);
  console.log('═══════════════════════════════════════════════\n');

  if (failCount === 0) {
    console.log('🎉 All checks passed! System is ready.\n');
    console.log('📌 Quick Start:');
    console.log('   1. Start backend: npm start');
    console.log('   2. Start frontend: cd ../client && npm run dev');
    console.log('   3. Visit: http://localhost:5174\n');
  } else {
    console.log('⚠️  Some checks failed. See above for details.\n');
    console.log('📌 Fix the issues and run this script again.\n');
  }

  process.exit(failCount > 0 ? 1 : 0);
};

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

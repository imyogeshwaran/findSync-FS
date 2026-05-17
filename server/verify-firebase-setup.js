#!/usr/bin/env node
/**
 * Verify Firebase Password Reset Setup
 * This script checks if the Firebase integration is properly configured
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { getAuth } = require('./config/firebaseAdmin');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  section: (title) => {
    console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(70)}${colors.reset}\n`);
  },
  success: (msg, detail = '') => {
    console.log(`${colors.green}✓ ${msg}${colors.reset}${detail ? ` ${detail}` : ''}`);
  },
  error: (msg, detail = '') => {
    console.log(`${colors.red}✗ ${msg}${colors.reset}${detail ? ` ${detail}` : ''}`);
  },
  warn: (msg, detail = '') => {
    console.log(`${colors.yellow}⚠ ${msg}${colors.reset}${detail ? ` ${detail}` : ''}`);
  },
  info: (msg, detail = '') => {
    console.log(`${colors.magenta}ℹ ${msg}${colors.reset}${detail ? ` ${detail}` : ''}`);
  }
};

const checkEnvironment = () => {
  log.section('ENVIRONMENT CONFIGURATION CHECK');

  const checks = [
    {
      name: 'FIREBASE_SERVICE_ACCOUNT_FILE',
      value: process.env.FIREBASE_SERVICE_ACCOUNT_FILE,
      type: 'file'
    },
    {
      name: 'FIREBASE_PROJECT_ID',
      value: process.env.FIREBASE_PROJECT_ID,
      type: 'variable'
    },
    {
      name: 'FIREBASE_CLIENT_EMAIL',
      value: process.env.FIREBASE_CLIENT_EMAIL,
      type: 'variable'
    },
    {
      name: 'FIREBASE_PRIVATE_KEY',
      value: process.env.FIREBASE_PRIVATE_KEY ? '[SET]' : undefined,
      type: 'variable'
    },
    {
      name: 'GOOGLE_APPLICATION_CREDENTIALS',
      value: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      type: 'file'
    }
  ];

  let firebaseConfigured = false;

  for (const check of checks) {
    if (check.value) {
      if (check.type === 'file') {
        if (fs.existsSync(check.value)) {
          log.success(`${check.name}`, `${check.value}`);
          firebaseConfigured = true;
        } else {
          log.warn(`${check.name}`, `File not found: ${check.value}`);
        }
      } else {
        log.success(`${check.name}`, `[CONFIGURED]`);
        firebaseConfigured = true;
      }
    }
  }

  if (!firebaseConfigured) {
    log.error('NO FIREBASE CONFIGURATION FOUND', '');
    log.info('Set one of these in .env file:', '');
    console.log(`  1. FIREBASE_SERVICE_ACCOUNT_FILE=./config/serviceAccount.json`);
    console.log(`  2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY`);
    console.log(`  3. GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json\n`);
    return false;
  }

  return true;
};

const checkServiceAccountFile = () => {
  log.section('SERVICE ACCOUNT FILE CHECK');

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  
  if (!filePath) {
    log.info('Skipping - No service account file path specified');
    return true;
  }

  if (!fs.existsSync(filePath)) {
    log.error('Service account file not found', filePath);
    return false;
  }

  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
    
    const missing = requiredFields.filter(field => !content[field]);
    
    if (missing.length > 0) {
      log.error('Service account file is invalid', `Missing fields: ${missing.join(', ')}`);
      return false;
    }

    log.success('Service account file is valid', `Project: ${content.project_id}`);
    return true;
  } catch (error) {
    log.error('Failed to parse service account file', error.message);
    return false;
  }
};

const checkDatabaseSetup = async () => {
  log.section('DATABASE SETUP CHECK');

  try {
    const db = require('./config/database');

    // Check if password_reset_otp table exists
    const [tables] = await db.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'password_reset_otp'",
      [process.env.DB_NAME]
    );

    if (tables && tables.length > 0) {
      log.success('password_reset_otp table exists');

      // Check table structure
      const [columns] = await db.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [process.env.DB_NAME, 'password_reset_otp']
      );

      const requiredColumns = ['email', 'otp', 'expires_at', 'verified'];
      const foundColumns = columns.map(c => c.COLUMN_NAME);
      const missing = requiredColumns.filter(col => !foundColumns.includes(col));

      if (missing.length > 0) {
        log.error('Missing table columns', missing.join(', '));
        return false;
      }

      log.success('Table structure is correct');
    } else {
      log.error('password_reset_otp table does not exist');
      log.info('Create it by running: node setup-otp-table.js');
      return false;
    }

    // Check Users table has firebase_uid column
    const [userColumns] = await db.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [process.env.DB_NAME, 'Users', 'firebase_uid']
    );

    if (userColumns && userColumns.length > 0) {
      log.success('Users table has firebase_uid column');
    } else {
      log.warn('Users table does not have firebase_uid column', 'Firebase updates will not work');
      return false;
    }

    return true;
  } catch (error) {
    log.error('Database check failed', error.message);
    return false;
  }
};

const checkFirebaseConnection = async () => {
  log.section('FIREBASE CONNECTION CHECK');

  try {
    const firebaseAdmin = require('./config/firebaseAdmin');
    firebaseAdmin.initializeFirebaseAdmin();
    
    const auth = getAuth();
    
    // Try to get app info
    log.success('Firebase Admin SDK initialized successfully');

    return true;
  } catch (error) {
    log.error('Firebase connection failed', error.message);
    
    if (error.message.includes('FIREBASE')) {
      log.info('Hint: Check Firebase credentials in .env file');
    } else if (error.message.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      log.info('Hint: Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    }

    return false;
  }
};

const main = async () => {
  console.clear();
  console.log(`\n${colors.bright}${colors.magenta}🔥 FIREBASE PASSWORD RESET VERIFICATION${colors.reset}\n`);

  const checks = [
    { name: 'Environment Configuration', fn: checkEnvironment },
    { name: 'Service Account File', fn: checkServiceAccountFile },
    { name: 'Database Setup', fn: checkDatabaseSetup },
    { name: 'Firebase Connection', fn: checkFirebaseConnection }
  ];

  const results = [];

  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, passed: result });
    } catch (error) {
      console.error(`\nUnexpected error in ${check.name}:`, error.message);
      results.push({ name: check.name, passed: false });
    }
  }

  // Summary
  log.section('VERIFICATION SUMMARY');

  const allPassed = results.every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;

  results.forEach(result => {
    if (result.passed) {
      log.success(result.name);
    } else {
      log.error(result.name);
    }
  });

  console.log(`\n${colors.bright}Results: ${passedCount}/${results.length} checks passed${colors.reset}\n`);

  if (allPassed) {
    log.section('✓ ALL CHECKS PASSED - FIREBASE PASSWORD RESET IS READY');
    console.log(`\n${colors.green}${colors.bright}You can now use the forgot password feature!${colors.reset}\n`);
    console.log('Test it by:');
    console.log('  1. Going to the login page');
    console.log('  2. Clicking "Forgot password?"');
    console.log('  3. Entering your email');
    console.log('  4. Following the OTP flow\n');
  } else {
    log.section('✗ SETUP INCOMPLETE');
    console.log(`\n${colors.red}${colors.bright}Fix the errors above before using forgot password${colors.reset}\n`);
    console.log('Need help? Check FIREBASE_PASSWORD_RESET_SETUP.md\n');
  }

  process.exit(allPassed ? 0 : 1);
};

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

const db = require('./config/database');
require('dotenv').config();

const createOTPTable = async () => {
  try {
    console.log('Creating password_reset_otp table...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS password_reset_otp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        otp VARCHAR(10) NOT NULL,
        verified BOOLEAN DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email_otp (email)
      )
    `;

    await db.query(sql);
    console.log('✓ password_reset_otp table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error creating table:', error.message);
    process.exit(1);
  }
};

createOTPTable();

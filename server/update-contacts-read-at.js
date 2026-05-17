const db = require('./config/database');

async function updateContactsReadAt() {
  try {
    console.log('Checking Contacts table for read_at column...');

    const [columns] = await db.query(
      `SELECT COUNT(*) as cnt FROM information_schema.columns 
       WHERE table_schema = ? AND table_name = 'Contacts' AND column_name = 'read_at'`,
      [process.env.DB_NAME]
    );

    if (columns[0].cnt === 0) {
      console.log('Adding read_at column to Contacts...');
      await db.query(`ALTER TABLE Contacts ADD COLUMN read_at TIMESTAMP NULL AFTER contact_date`);
      console.log('✅ Successfully added read_at column to Contacts');
    } else {
      console.log('ℹ️ read_at column already exists on Contacts');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error updating Contacts schema:', err);
    process.exit(1);
  }
}

updateContactsReadAt();

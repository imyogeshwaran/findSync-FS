#!/usr/bin/env node
/**
 * Migration script: Convert all pending posts to approved and set column default to 'approved'
 * Run this once: node migrate-to-auto-approve.js
 */

const db = require('./config/database');

async function migrate() {
  try {
    console.log('🔄 Starting auto-approval migration...\n');

    // Step 1: Modify column default to 'approved'
    console.log('Step 1: Changing column default to \'approved\'...');
    try {
      await db.query(`
        ALTER TABLE Items 
        MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'
      `);
      console.log('✅ Column default changed to \'approved\'');
    } catch (err) {
      console.warn('⚠️ Could not modify column default:', err.message);
    }

    // Step 2: Convert all existing 'pending' rows to 'approved'
    console.log('\nStep 2: Converting existing pending posts to approved...');
    const [result] = await db.query(`
      UPDATE Items 
      SET approval_status = 'approved' 
      WHERE approval_status = 'pending' OR approval_status IS NULL OR approval_status = ''
    `);
    console.log(`✅ Updated ${result.affectedRows} items to 'approved' status`);

    // Step 3: Verify the changes
    console.log('\nStep 3: Verifying changes...');
    const [stats] = await db.query(`
      SELECT 
        approval_status,
        COUNT(*) as count
      FROM Items
      GROUP BY approval_status
    `);
    
    console.log('\n📊 Items by approval_status:');
    stats.forEach(stat => {
      console.log(`  - ${stat.approval_status}: ${stat.count} items`);
    });

    // Check for any remaining 'pending' items
    const [pendingCheck] = await db.query(`
      SELECT COUNT(*) as pending_count 
      FROM Items 
      WHERE approval_status = 'pending'
    `);
    
    if (pendingCheck[0].pending_count === 0) {
      console.log('\n✅ Migration complete! All posts are now auto-approved.');
      console.log('🎉 New posts will be created with approval_status = \'approved\' by default.');
    } else {
      console.log(`\n⚠️ Warning: ${pendingCheck[0].pending_count} pending items still exist.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

migrate();

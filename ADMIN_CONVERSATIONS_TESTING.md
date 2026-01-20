# Admin Message Management Feature - Testing Guide

## Feature Overview
- ✅ Admin can view all conversations between users
- ✅ Admin can view all messages in any conversation
- ✅ Admin can delete user messages (marked as "deleted by system")
- ✅ Users can see "deleted by system" vs "deleted by user" indicators
- ✅ All deletions are tracked in database

## Setup Instructions

### 1. Database Migration
Run the SQL migration to add new columns:

```bash
# Option A: Using MySQL client
mysql -u root -p findSync < server/config/add_admin_message_management.sql

# Option B: Manual execution in MySQL Workbench or phpMyAdmin
```

Or execute this SQL directly:
```sql
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS deleted_by INT;
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS deletion_type ENUM('user', 'admin', 'system') DEFAULT NULL;

ALTER TABLE Messages ADD CONSTRAINT fk_deleted_by 
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id) ON DELETE SET NULL;

UPDATE Messages SET deletion_type = 'user' WHERE is_deleted = TRUE AND deletion_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_contact_id ON Messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_deleted_by ON Messages(deleted_by);
```

### 2. Start Backend Server
```bash
cd server
npm start
# Expected: Server is running on http://localhost:3005
```

### 3. Start Frontend Dev Server
```bash
cd client
npm run dev
# Expected: Vite dev server running (usually http://localhost:5173)
```

## Testing Steps

### Test 1: View All Conversations (Admin)

1. **Login as Admin**
   - Go to admin dashboard
   - Login with admin credentials

2. **Navigate to Conversations Tab**
   - Click on "Conversations" tab in the admin dashboard navigation
   - You should see a list of all conversations with:
     - Sender and Receiver names
     - Item name
     - Message count
     - Last message timestamp

3. **Select a Conversation**
   - Click on any conversation from the list
   - All messages in that conversation should load

### Test 2: View Deletion Source

1. **Send Test Messages (as Regular User)**
   - Login as a regular user
   - Open a chat conversation
   - Send 3 test messages

2. **Delete Message as User**
   - Long-press on your own message
   - Click "Delete"
   - Confirm deletion
   - Message should show: **"Message deleted"**

3. **Admin Deletes Message**
   - Login as admin
   - Go to Conversations tab
   - Select the same conversation
   - Find a message and click "🗑️ Delete (Admin)"
   - Confirm deletion
   - Message should show: **"Message deleted by system"**

4. **Verify in Admin View**
   - Refresh the admin page
   - Go back to the conversation
   - Confirm both deletion types are displayed correctly

5. **Verify in User View**
   - Login as the user
   - Open the same conversation
   - You should see:
     - "Message deleted" for your deletion
     - "Message deleted by system" for admin deletion

### Test 3: Database Verification

Open MySQL client and verify the data:

```sql
-- View messages with deletion info
SELECT 
  message_id,
  message,
  is_deleted,
  deletion_type,
  deleted_by,
  sent_at
FROM Messages
WHERE is_deleted = TRUE
ORDER BY sent_at DESC;

-- View deleted_by user info
SELECT 
  m.message_id,
  m.message,
  m.deletion_type,
  u.name as deleted_by_name,
  u.email as deleted_by_email
FROM Messages m
LEFT JOIN Users u ON m.deleted_by = u.user_id
WHERE m.is_deleted = TRUE;
```

### Test 4: Verify Authorization

**Admin should be able to:**
- ✅ View all conversations
- ✅ View all messages in any conversation
- ✅ Delete any message

**Regular user should:**
- ✅ Only see "Delete (Admin)" button on their own messages (should NOT see it)
- ✅ Only see admin delete option in admin dashboard (not in regular chat)
- ✅ See "deleted by system" indicator for admin-deleted messages

## Feature Walkthrough

### For Regular Users

**Chat Message Actions:**
```
1. Send a message → "Hello"
2. Long-press message for 500ms
3. Context menu appears:
   - ✏️ Edit → Can edit your own messages
   - 🗑️ Delete → Can delete your own messages
4. If deleted by you → Shows "Message deleted"
5. If deleted by admin → Shows "Message deleted by system"
```

### For Admins

**Conversations Tab:**
```
Left Panel:
- List of all conversations
- Shows: Users, Item, Message count, Last message
- Click to select conversation

Right Panel:
- All messages in conversation
- Each message shows sender name
- Red "🗑️ Delete (Admin)" button on each message
- Click to delete (shows confirmation)
- Deleted messages show "Message deleted by system"
```

## Troubleshooting

### Issue: Conversations tab not showing in admin dashboard
**Solution:** 
- Make sure AdminDashboard.jsx imports AdminConversations
- Verify the Conversations tab is in the navigation array
- Clear browser cache and refresh

### Issue: Delete button not appearing in admin conversations
**Solution:**
- Check that adminDeleteMessage function exists in chatController.js
- Verify API endpoint is registered in admin routes
- Check browser console for API errors (F12 > Network tab)

### Issue: Deletion type shows as NULL in database
**Solution:**
- Run the migration: `UPDATE Messages SET deletion_type = 'user' WHERE is_deleted = TRUE AND deletion_type IS NULL;`
- New deletions should properly set deletion_type

### Issue: Foreign key error on deleted_by
**Solution:**
- Ensure Users table exists and has user_id primary key
- Run migration again with proper table order
- Check that no NULL values exist where constraint fails

## API Endpoints Reference

```
GET /admin/conversations
- Returns all conversations with metadata

GET /admin/conversations/:contactId/messages
- Returns all messages in a conversation (including deleted)

DELETE /admin/conversations/:contactId/messages/:messageId
- Deletes a message (marks as deleted, sets deletion_type='admin')
```

## Security Notes

✅ **Admin-only features:** All admin endpoints require admin authentication token
✅ **Message verification:** Backend checks conversation ownership before allowing deletion
✅ **Audit trail:** All deletions are tracked with user_id and deletion_type
✅ **Soft delete:** Original message data is preserved with deletion metadata


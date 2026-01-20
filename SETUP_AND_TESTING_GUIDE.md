# Complete Installation & Testing Guide - Admin Message Management

## 📋 Overview of New Feature

This feature allows:
1. **Admins** to view all user conversations
2. **Admins** to delete any user's messages
3. **All Users** to see who deleted their message:
   - "Message deleted" → User deleted their own message
   - "Message deleted by system" → Admin deleted the message

---

## 🔧 Installation Steps

### Step 1: Update Database Schema

#### Option A: Using MySQL Command Line
```bash
cd server/config
mysql -u root -p findSync < add_admin_message_management.sql
```

#### Option B: Using MySQL Workbench or phpMyAdmin
1. Open MySQL Workbench
2. Connect to your database
3. Open file: `server/config/add_admin_message_management.sql`
4. Execute the script

#### Option C: Manual SQL Execution
```sql
-- Run this in your MySQL client
USE findSync;

-- Add new columns to Messages table
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS deleted_by INT;
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS deletion_type ENUM('user', 'admin', 'system') DEFAULT NULL;

-- Add foreign key constraint
ALTER TABLE Messages ADD CONSTRAINT fk_deleted_by 
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id) ON DELETE SET NULL;

-- Update existing soft-deleted messages to mark as user deletion
UPDATE Messages SET deletion_type = 'user' WHERE is_deleted = TRUE AND deletion_type IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_id ON Messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_deleted_by ON Messages(deleted_by);
```

**Verify it worked:**
```sql
DESC Messages; -- Check columns: deleted_by, deletion_type
SHOW INDEXES FROM Messages; -- Check new indexes
```

### Step 2: Backend Setup

No additional npm packages needed. Just verify existing ones are installed:

```bash
cd server
npm list mysql2 bcrypt jsonwebtoken
# All three should be listed
```

### Step 3: Frontend Setup

No additional npm packages needed.

```bash
cd client
npm list react lucide-react
# Both should be listed
```

### Step 4: Verify File Changes

Check these files exist and have been modified:

```bash
# Backend files
- server/config/add_admin_message_management.sql (NEW)
- server/routes/adminRoutes.js (MODIFIED - 3 new routes)
- server/controllers/adminController.js (MODIFIED - 3 new functions)
- server/controllers/chatController.js (MODIFIED - 1 line)

# Frontend files
- client/src/components/AdminConversations.jsx (NEW)
- client/src/components/AdminDashboard.jsx (MODIFIED)
- client/src/components/ChatBox.jsx (MODIFIED)
- client/src/services/api.js (MODIFIED - 3 new functions)
```

---

## 🚀 Running the Application

### Terminal 1: Start Backend Server
```bash
cd server
npm start
```

**Expected output:**
```
Server is running on http://localhost:3005
Database connected
Listening on port 3005
```

### Terminal 2: Start Frontend Dev Server
```bash
cd client
npm run dev
```

**Expected output:**
```
VITE v4.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

---

## 🧪 Testing the Feature

### Test Scenario 1: Basic User Message Operations

#### Setup
- Open browser to http://localhost:5173
- Login as User A
- Have another browser window with User B logged in
- OR setup test data using same user in 2 windows

#### Test Steps
1. **Send messages**
   - User A sends: "Hello"
   - User A sends: "How are you?"
   - User A sends: "Nice to meet you"

2. **User deletes own message**
   - Long-press middle message (hold mouse for 500ms)
   - Context menu appears with ✏️ Edit and 🗑️ Delete
   - Click Delete
   - Confirm deletion
   - Message should show: **"Message deleted"**

3. **Edit message**
   - Long-press first message
   - Click ✏️ Edit
   - Change text to "Hi there!"
   - Click Save
   - Should show "(edited)" indicator

#### Expected Result ✅
```
Message: "Hello"
Time: 2:45 PM
(edited)

Message: [Message deleted]

Message: "Nice to meet you"
Time: 2:47 PM
```

---

### Test Scenario 2: Admin Message Management

#### Setup
- Have backend running
- User has sent at least 5 messages in a conversation
- User has deleted 1 message

#### Test Steps

1. **Login as Admin**
   - Go to Admin Dashboard (separate URL or button)
   - Login with admin credentials

2. **View Conversations Tab**
   - Click "💬 Conversations" in admin navigation
   - Should see a list of all conversations with:
     - Both user names
     - Item name
     - Message count
     - Last message date

3. **Select a Conversation**
   - Click on the conversation containing the messages from Test Scenario 1
   - Right panel shows all messages
   - Each message has a red "🗑️ Delete (Admin)" button

4. **Admin Deletes a Message**
   - Find one of User A's remaining messages (not already deleted)
   - Click the red "🗑️ Delete (Admin)" button
   - Confirmation dialog: "Are you sure...?"
   - Click OK
   - Message should show: **"Message deleted by system"**

5. **Verify in Admin View**
   - Scroll to see:
     - User-deleted message: "Message deleted"
     - Admin-deleted message: "Message deleted by system"

#### Expected Result ✅
```
Conversation: User A ↔ User B
Item: Lost iPhone (Lost)

Messages: 5 total

[Message from User B]: "I saw an iPhone..."
[🗑️ Delete (Admin)]

[Message]: "Message deleted"
(User A deleted this)

[Message from User A]: "Hello"
[🗑️ Delete (Admin)]

[Message]: "Message deleted by system"
(Admin deleted this)

[Message from User B]: "Let me help"
[🗑️ Delete (Admin)]
```

---

### Test Scenario 3: User Sees Admin Deletion

#### Setup
- User A is logged in a chat
- Admin has just deleted one of User A's messages

#### Test Steps

1. **Open Chat as User A**
   - Go back to regular user interface
   - Open the same conversation
   - Messages should automatically load (or refresh if needed)

2. **Look for Deleted Message**
   - Scroll through messages
   - Find the message that was deleted by admin
   - Should show: **"Message deleted by system"**

3. **Compare with User Deletion**
   - Also visible: "Message deleted" (user's own deletion)
   - Should be clearly different

#### Expected Result ✅
```
Your messages:

"Hello"
2:45 PM

[Message deleted by system]
(grayed out, admin deleted this)

"Nice to meet you"  
2:47 PM

[Message deleted]
(grayed out, you deleted this)
```

---

## 🔍 Database Verification

After testing, verify data in database:

```sql
-- Check that deletion types are recorded
SELECT 
  m.message_id,
  m.sender_id,
  m.message,
  m.is_deleted,
  m.deletion_type,
  m.deleted_by,
  u.name as deleted_by_admin
FROM Messages m
LEFT JOIN Users u ON m.deleted_by = u.user_id
WHERE m.is_deleted = TRUE
ORDER BY m.message_id DESC
LIMIT 10;
```

**Expected output:**
```
message_id | sender_id | message | is_deleted | deletion_type | deleted_by | deleted_by_admin
5023       | 100       | Hello   | 1          | user          | NULL       | NULL
5024       | 100       | Edit me | 1          | admin         | 1          | Admin Name
5025       | 100       | Nice    | 1          | user          | NULL       | NULL
```

---

## 🔐 Security Testing

### Test 1: Verify Admin-Only Access
```bash
# In browser console
fetch('http://localhost:3005/api/admin/conversations', {
  headers: { 'Authorization': 'Bearer invalid-token' }
})
.then(r => r.json())
.then(d => console.log(d))

# Expected: { error: "Unauthorized" }
```

### Test 2: Verify Regular User Cannot Delete Other's Messages
- Regular user logs in
- Opens chat
- Try to long-press on received message (from other user)
- ✅ Context menu should NOT appear
- Only messages you sent show the menu

### Test 3: Verify Regular User Cannot Access Admin Routes
```bash
# In browser console while logged in as regular user
fetch('http://localhost:3005/api/admin/conversations')
.then(r => r.json())
.then(d => console.log(d))

# Expected: { error: "Unauthorized" } or similar
```

---

## 🛠️ Troubleshooting

### Issue: "Conversations" tab not showing in admin dashboard

**Diagnosis:**
1. Check browser console (F12)
2. Look for JavaScript errors

**Solutions:**
```bash
# Solution 1: Clear browser cache
# Ctrl+Shift+Delete (Chrome) or Cmd+Shift+Delete (Mac)
# Select "All time" and clear

# Solution 2: Hard refresh
# Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

# Solution 3: Restart dev server
# Kill frontend (Ctrl+C in terminal)
# cd client && npm run dev
```

### Issue: Delete button not appearing in admin conversations

**Diagnosis:**
1. Check Network tab (F12 > Network)
2. Look for failed API calls

**Solutions:**
```bash
# Check backend is running
curl http://localhost:3005/api/admin/conversations \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check admin token exists
# F12 > Console > localStorage.getItem('adminToken')

# Check for JavaScript errors
# F12 > Console tab
```

### Issue: "deleted by system" not showing after admin delete

**Solutions:**
1. Refresh the page (F5)
2. Hard refresh (Ctrl+F5)
3. Check database:
```sql
SELECT * FROM Messages WHERE message_id = YOUR_MESSAGE_ID;
-- Verify deletion_type is 'admin'
```

### Issue: Foreign key constraint error

**Solutions:**
```sql
-- Check Users table exists
SHOW TABLES LIKE 'Users';

-- Check deleted_by column
DESC Messages;
-- Should show: deleted_by | int(11) | YES

-- Recreate constraint
ALTER TABLE Messages DROP FOREIGN KEY fk_deleted_by;
ALTER TABLE Messages ADD CONSTRAINT fk_deleted_by 
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id) ON DELETE SET NULL;
```

---

## 📊 API Reference

### Get All Conversations
```
GET /admin/conversations

Headers:
  Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "conversations": [
    {
      "contact_id": 1001,
      "sender_id": 100,
      "receiver_id": 101,
      "sender_name": "John",
      "receiver_name": "Jane",
      "item_name": "Lost iPhone",
      "message_count": 5,
      "last_message_at": "2024-01-18T10:30:00Z"
    }
  ]
}
```

### Get Conversation Messages
```
GET /admin/conversations/:contactId/messages

Response:
{
  "success": true,
  "messages": [
    {
      "message_id": 5001,
      "contact_id": 1001,
      "sender_id": 100,
      "sender_name": "John",
      "message": "Hello",
      "is_deleted": false,
      "deletion_type": null,
      "edited_at": null,
      "sent_at": "2024-01-18T10:25:00Z"
    },
    {
      "message_id": 5002,
      "contact_id": 1001,
      "sender_id": 100,
      "message": "Original message",
      "is_deleted": true,
      "deletion_type": "admin",
      "deleted_by": 1,
      "sent_at": "2024-01-18T10:26:00Z"
    }
  ]
}
```

### Delete Message (Admin)
```
DELETE /admin/conversations/:contactId/messages/:messageId

Response:
{
  "success": true,
  "message": "Message deleted by admin successfully"
}
```

---

## ✅ Final Checklist

Before going to production:

- [ ] Database migration has been run
- [ ] Backend server starts without errors
- [ ] Frontend dev server starts without errors
- [ ] Admin can see all conversations
- [ ] Admin can view messages in any conversation
- [ ] Admin can delete messages
- [ ] "Message deleted by system" appears after admin delete
- [ ] Regular users cannot see admin delete button
- [ ] Regular users CAN see "deleted by system" indicator
- [ ] Edit functionality still works
- [ ] User deletes still work and show "Message deleted"
- [ ] Database has proper indexes
- [ ] No JavaScript console errors

---

## 📞 Support

If you encounter any issues:

1. **Check the logs:**
   ```bash
   # Backend console for server errors
   # Browser console (F12) for frontend errors
   # Network tab for API errors
   ```

2. **Verify setup:**
   ```bash
   # Database columns exist
   DESC Messages;
   
   # API endpoints exist
   grep -r "getAllConversations" server/
   
   # Frontend component exists
   ls -la client/src/components/AdminConversations.jsx
   ```

3. **Check the documentation:**
   - `ADMIN_CONVERSATIONS_QUICK_REF.md` - Quick reference
   - `ADMIN_CONVERSATIONS_SUMMARY.md` - Implementation details
   - `ADMIN_CONVERSATIONS_TESTING.md` - Detailed testing guide


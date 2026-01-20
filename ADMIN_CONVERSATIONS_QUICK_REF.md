# Quick Reference - Admin Message Management

## 🚀 Quick Start (5 minutes)

### Step 1: Database Setup
```bash
mysql -u root -p
USE findSync;
-- Copy-paste from: server/config/add_admin_message_management.sql
```

### Step 2: Start Servers
```bash
# Terminal 1
cd server && npm start

# Terminal 2  
cd client && npm run dev
```

### Step 3: Test
1. Login as admin
2. Click "Conversations" tab
3. Select any conversation
4. Click "Delete (Admin)" on any message
5. Message shows "deleted by system"

---

## 🔧 Code Overview

### Database
```
New Columns in Messages table:
- deleted_by (INT) → user_id of admin who deleted
- deletion_type (ENUM) → 'user' or 'admin'
```

### API Endpoints (Admin Only)
```
GET  /admin/conversations
     └─ Returns: All conversations with metadata

GET  /admin/conversations/:contactId/messages
     └─ Returns: All messages in conversation

DELETE /admin/conversations/:contactId/messages/:messageId
     └─ Action: Mark message as deleted by admin
```

### Frontend
```
New Component: AdminConversations.jsx
- Split view: Conversations list | Messages
- Delete button per message
- Shows "deleted by system" status

Updated: AdminDashboard.jsx
- Added Conversations tab
```

---

## 📊 Data Flow

```
User deletes message:
  ChatBox.jsx
    ↓ calls deleteChatMessage()
    ↓
  api.js (DELETE /chats/:contactId/messages/:messageId)
    ↓
  chatController.deleteMessage()
    ↓ Sets: is_deleted=true, deletion_type='user'
  
  ✓ Shows: "Message deleted"
```

```
Admin deletes message:
  AdminConversations.jsx
    ↓ calls adminDeleteMessage()
    ↓
  api.js (DELETE /admin/conversations/:contactId/messages/:messageId)
    ↓
  adminController.adminDeleteMessage()
    ↓ Sets: is_deleted=true, deletion_type='admin', deleted_by=adminId
  
  ✓ Shows: "Message deleted by system"
```

---

## 🔐 Security Checklist

- ✅ Admin endpoints require `verifyAdminToken`
- ✅ Backend verifies conversation ownership
- ✅ Backend verifies message exists before deletion
- ✅ Soft delete preserves audit trail
- ✅ Deleted_by tracks which admin made deletion

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Conversations tab not showing | Clear cache, restart frontend |
| Delete button doesn't work | Check admin token in localStorage |
| "Message deleted by system" not showing | Restart backend, rerun migration |
| Foreign key error | Run migration before testing |
| API 404 errors | Check route is registered in adminRoutes.js |

---

## 📝 Message Deletion States

```javascript
// User deletion
{
  is_deleted: true,
  deletion_type: 'user',
  deleted_by: null,
  message: "Original message text"
}
→ Display: "Message deleted"

// Admin deletion
{
  is_deleted: true,
  deletion_type: 'admin',
  deleted_by: 5,  // Admin user ID
  message: "Original message text"
}
→ Display: "Message deleted by system"
```

---

## 🔍 Debugging

### Check API is working
```bash
# In browser console
fetch('http://localhost:3005/api/admin/conversations', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
})
.then(r => r.json())
.then(d => console.log(d))
```

### Check database
```sql
SELECT message_id, is_deleted, deletion_type, deleted_by 
FROM Messages 
WHERE is_deleted = TRUE;
```

### Check admin token
```javascript
// Browser console
console.log(localStorage.getItem('adminToken'))
console.log(localStorage.getItem('adminEmail'))
```

---

## 📱 UI/UX Details

### Admin Conversations Panel
- Left: Scrollable list of all conversations
- Right: Messages view with delete buttons
- Hover effects on messages and buttons
- Confirmation dialog before deletion
- Success message after deletion

### Message Display
- Own messages (blue background)
- Other's messages (gray background)
- Deleted messages (faded, italic)
- Timestamp for each message
- Sender name above message
- Edit indicator `(edited)` if modified

---

## 🎯 Test Scenarios

### Scenario 1: User deletes own message
1. User sends message
2. Long-press message
3. Click Delete
4. Confirm
5. ✓ Shows "Message deleted"

### Scenario 2: Admin deletes user's message
1. Admin → Conversations tab
2. Select conversation
3. Click "Delete (Admin)" on message
4. Confirm
5. ✓ Shows "Message deleted by system"
6. User sees same message with "deleted by system" text

### Scenario 3: Mixed deletions
1. User deletes message A → Shows "Message deleted"
2. Admin deletes message B → Shows "Message deleted by system"
3. ✓ Both types show correctly

---

## 📚 Files Modified

```
Backend:
  ✏️ server/routes/adminRoutes.js
  ✏️ server/controllers/adminController.js (+150 lines)
  ✏️ server/controllers/chatController.js (1 line updated)
  ✨ server/config/add_admin_message_management.sql (new)

Frontend:
  ✏️ client/src/components/AdminDashboard.jsx (2 lines changed)
  ✏️ client/src/components/ChatBox.jsx (1 section updated)
  ✏️ client/src/services/api.js (3 functions added)
  ✨ client/src/components/AdminConversations.jsx (new, 300 lines)
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Run database migration
- [ ] Test admin login
- [ ] Test conversation viewing
- [ ] Test message deletion
- [ ] Verify "deleted by system" displays
- [ ] Check audit logs in database
- [ ] Test with multiple users
- [ ] Test with multiple conversations
- [ ] Verify admin authorization


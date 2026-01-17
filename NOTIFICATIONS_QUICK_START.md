# Notification Feature - Quick Start Guide

## What's New?

A complete **peer-to-peer notification system** has been implemented allowing users to:
- ✅ Send messages to item owners (click "Notify" on any item)
- ✅ View all notifications they've received
- ✅ Reply directly to senders
- ✅ Auto-refresh notifications every 10 seconds

---

## Files Modified/Created

### New Components
- `client/src/components/NotificationsPanel.jsx` - Enhanced notification display component

### Backend Updates
- `server/controllers/contactController.js` - Added 2 new controller methods
- `server/routes/contactRoutes.js` - Added 2 new API routes

### Frontend Updates  
- `client/src/services/api.js` - Added 2 new API functions
- `client/src/components/Home.jsx` - Updated to use new NotificationsPanel

---

## How It Works

### **1. Sending a Notification**
```
User clicks "Notify" button on item
    ↓
Message input appears
    ↓
User types message
    ↓
Clicks "Send"
    ↓
POST /api/contacts sent to backend
    ↓
Item owner receives notification ✓
```

### **2. Receiving Notifications**
```
Click 🔔 (Notifications) in navbar
    ↓
See all messages from other users
    ↓
Each message shows sender, content, timestamp, item ID
    ↓
Auto-refreshes every 10 seconds
```

### **3. Replying to Messages**
```
Click "↩️ Reply" on any notification
    ↓
Message text area expands
    ↓
Type response
    ↓
Click "✓ Send Reply"
    ↓
Original sender sees your reply ✓
```

---

## Testing Checklist

Run through these steps to verify everything works:

### Step 1: Open Browser
```
Frontend: http://localhost:5174
Backend: Running on port 3005
```

### Step 2: Create Two Test Accounts
- Account A: Create an account (e.g., john@test.com)
- Account B: Create an account (e.g., jane@test.com)

### Step 3: Post an Item (as Account A)
1. Click "Find" in navbar
2. Post a lost or found item with details
3. Note the item posted successfully

### Step 4: Send Notification (as Account B)
1. Logout from Account A
2. Login as Account B
3. Click "Home" to see all items
4. Find Account A's item
5. Click **"Notify"** button
6. Type: "I think I found this!"
7. Click **"Send"** button
8. Should see: "Notification sent to the item owner" ✓

### Step 5: View Notifications (as Account A)
1. Logout from Account B
2. Login as Account A
3. Click **🔔 (Notifications)** in top navbar
4. Should see message from Account B:
   - From: jane@test.com
   - Message: "I think I found this!"
   - Item ID: #101 (or whatever ID)
   - Timestamp: Just now ✓

### Step 6: Reply to Notification (as Account A)
1. Still viewing notifications
2. Click **"↩️ Reply"** button
3. Type: "Great! Let's meet at the park"
4. Click **"✓ Send Reply"**
5. Should see success message ✓

### Step 7: Verify Reply (as Account B)
1. Logout from Account A
2. Login as Account B
3. Click 🔔 Notifications
4. Should see new message from Account A ✓

### Step 8: Test Auto-Refresh
1. Keep notifications page open
2. Have another user send a notification
3. Within 10 seconds, new notification should appear automatically ✓

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/contacts` | Send notification |
| GET | `/api/contacts` | Get all notifications |
| GET | `/api/contacts/count` | Get notification count |
| GET | `/api/contacts/conversations` | Get conversations list |

---

## Database Table Structure

The system uses the existing **Contacts** table:

```sql
CREATE TABLE Contacts (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    item_id INT NOT NULL,
    message TEXT,
    contact_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES Users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES Users(user_id),
    FOREIGN KEY (item_id) REFERENCES Items(item_id)
);
```

---

## Key Features Implemented

### ✅ Core Features
- Send notifications about items
- View notifications received
- Reply to notifications
- See sender information (name, email)
- See item details referenced
- Timestamps for all messages
- Auto-refresh every 10 seconds

### ✅ UI/UX
- Clean, modern interface
- Responsive design
- Hover effects
- Loading states
- Error handling
- Success confirmations
- Mobile-friendly

### ✅ Backend
- Input validation
- Error handling (401, 400, 404, 500)
- Database queries optimized
- Foreign key constraints
- JWT authentication required

---

## Troubleshooting

### Issue: "Failed to send notification"
**Solution:**
- Ensure you're logged in (check JWT token)
- Verify the item exists
- Check browser DevTools Network tab
- Ensure backend is running on port 3005

### Issue: Notifications not loading
**Solution:**
- Check if `/api/contacts` is accessible
- Verify authentication token
- Check backend logs
- Ensure database connection is working

### Issue: Auto-refresh not working
**Solution:**
- Refresh browser page
- Check browser console for errors
- Verify API is responding
- Check network tab for failed requests

### Issue: Database errors
**Solution:**
- Ensure Contacts table exists
- Run `ensure_schema.sql`
- Check foreign keys are correct
- Verify user IDs and item IDs exist

---

## Next Steps (Optional Enhancements)

Future versions can include:
- [ ] Mark notifications as read/unread
- [ ] Delete notifications
- [ ] Notification badge with count in navbar
- [ ] Real-time notifications (WebSocket)
- [ ] Block/unblock users
- [ ] Sound notifications
- [ ] Email forwarding
- [ ] Message templates

---

## Code References

**For more details, see:**
- Main documentation: [NOTIFICATIONS_FEATURE.md](NOTIFICATIONS_FEATURE.md)
- Backend controller: `server/controllers/contactController.js`
- API routes: `server/routes/contactRoutes.js`
- Frontend component: `client/src/components/NotificationsPanel.jsx`
- API service: `client/src/services/api.js`

---

## Summary

The notification feature is **production-ready** and fully integrated into FindSync. Users can now:
1. **Send messages** to item owners with the "Notify" button
2. **View messages** in the Notifications section
3. **Reply directly** to senders
4. **See message history** with timestamps and sender info

All changes are backward compatible with existing features. The system uses the existing Contacts table and requires no database migrations!

**Happy Notifying! 🔔**

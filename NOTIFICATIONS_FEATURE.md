# FindSync Notification Feature - Implementation Guide

## Overview
The notification system allows users to send messages to other users regarding specific items (lost/found posts). When a user clicks "Notify" on an item, they can send a message to the item owner who will receive it as a notification.

## Features Implemented

### 1. **Send Notifications**
- Users can click the "Notify" button on any item card
- Opens an inline message input with a text area
- Message is sent to the item owner
- Confirmation alert after successful send

### 2. **View Notifications**
- Navigate to **Notifications** section from navbar (🔔)
- See all messages received about your items
- Display includes:
  - **Sender name** and email
  - **Message content**
  - **Item ID** being referenced
  - **Timestamp** of when message was sent

### 3. **Reply to Notifications**
- Click "↩️ Reply" button on any notification
- Type your response message
- Send reply which goes back to the original sender
- Cancel reply without sending

### 4. **Auto-Refresh**
- Notifications panel auto-refreshes every 10 seconds
- Always shows the latest messages

## Database Schema

### Contacts Table
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

## API Endpoints

### 1. Create Contact (Send Notification)
**POST** `/api/contacts`

**Request Body:**
```json
{
  "item_id": 101,
  "message": "I saw this item at the market!"
}
```

**Response:**
```json
{
  "success": true,
  "contact_id": 1001
}
```

---

### 2. Get Notifications
**GET** `/api/contacts`

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "contact_id": 1001,
      "sender_id": 5,
      "receiver_id": 3,
      "item_id": 101,
      "message": "I saw this item at the market!",
      "contact_date": "2026-01-17T10:30:00.000Z",
      "sender_name": "John Doe",
      "sender_email": "john@example.com",
      "item_name": "Lost Wallet",
      "post_type": "lost"
    }
  ]
}
```

---

### 3. Get Notification Count
**GET** `/api/contacts/count`

**Response:**
```json
{
  "success": true,
  "unread_count": 5
}
```

---

### 4. Get User Conversations
**GET** `/api/contacts/conversations`

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "other_user_id": 5,
      "direction": "received",
      "last_message_date": "2026-01-17T10:30:00.000Z",
      "message_count": 3,
      "user_name": "John Doe",
      "user_email": "john@example.com"
    }
  ]
}
```

---

## Frontend Components

### 1. **NotificationsPanel.jsx** (New Component)
Located at: `client/src/components/NotificationsPanel.jsx`

**Features:**
- Displays all notifications received
- Shows sender information (name, email)
- Displays message and timestamp
- References item ID
- Reply functionality
- Auto-refresh every 10 seconds
- Responsive styling with hover effects

**Key Props:** None (uses API calls internally)

**Key Functions:**
- `loadNotifications()` - Fetch notifications from API
- `handleReply()` - Send reply message

---

### 2. **Home.jsx Updates**
- Imports `NotificationsPanel` component
- Imports `getNotificationCount` function
- `NotificationsSection()` now uses the new component
- Existing "Notify" button functionality integrated

---

## Backend Implementation

### 1. **contactController.js Updates**

#### `createContact()`
- Validates sender (authenticated user)
- Validates item_id and message
- Finds item owner
- Creates Contacts table entry
- Returns contact_id

#### `getNotifications()`
- Retrieves all notifications for logged-in user
- Includes sender details (name, email)
- Includes item details (item_name, post_type)
- Sorted by latest first
- **NEW**: Added item details to response

#### `getNotificationCount()` (NEW)
- Returns count of all notifications for user
- Used for badge/counter display

#### `getUserConversations()` (NEW)
- Gets unique conversations (grouped by other user)
- Shows conversation count and last message date
- Can be used for conversation list view

---

### 2. **contactRoutes.js Updates**
```javascript
router.post('/', auth, contactController.createContact);
router.get('/', auth, contactController.getNotifications);
router.get('/count', auth, contactController.getNotificationCount);
router.get('/conversations', auth, contactController.getUserConversations);
```

---

## Frontend API Service (api.js)

### New Functions Added:
```javascript
// Send a notification
export const createContact = async (payload) => {
  return apiRequest('/contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Get all notifications
export const getNotifications = async () => {
  return apiRequest('/contacts');
};

// Get notification count
export const getNotificationCount = async () => {
  return apiRequest('/contacts/count');
};

// Get conversations list
export const getUserConversations = async () => {
  return apiRequest('/contacts/conversations');
};
```

---

## User Flow

### Sending a Notification
1. User browses items in **Home** or **Explore**
2. Clicks **"Notify"** button on item
3. Text area appears with placeholder: "Write a message to the owner..."
4. User enters message
5. Clicks **"Send"** button
6. API sends notification to item owner
7. Success alert confirms sending
8. Input clears, button reverts

### Receiving Notifications
1. User logs in and checks **Notifications** (🔔 in navbar)
2. Sees list of all messages from other users
3. Each notification shows:
   - Sender name/email
   - Message content
   - Item ID referenced
   - When message was sent
4. User can click **"↩️ Reply"** to respond
5. Reply appears as new notification to original sender

### Replying to Notifications
1. User sees a notification
2. Clicks **"↩️ Reply"** button
3. Text area expands below notification
4. User types response
5. Clicks **"✓ Send Reply"** or **"Cancel"**
6. Reply sent, notification list refreshes

---

## Styling

### Color Scheme
- **Sender name**: `#a855f7` (purple)
- **Timestamps**: Gray with reduced opacity
- **Message text**: `#e0e0e0` (light gray)
- **Backgrounds**: Gradient blues and purples
- **Buttons**: 
  - Reply: `linear-gradient(135deg, #4f46e5, #a855f7)`
  - Send: `linear-gradient(135deg, #10b981, #059669)`

### Responsive Features
- Auto-responsive based on viewport
- Mobile-friendly padding
- Touch-friendly button sizes
- Text wrapping for long messages

---

## Error Handling

### Frontend
- Validates message not empty
- Shows error alerts for failed sends
- Handles API errors gracefully
- Loading states during async operations

### Backend
- 401: Unauthorized (not logged in)
- 400: Missing required fields (item_id, message)
- 404: Item not found
- 500: Database/server errors

---

## Testing the Feature

### 1. **Create Test Users**
- Create 2 test accounts
- User A creates a "Lost Item" post
- User B will send notification to User A

### 2. **Test Send Notification**
1. Log in as User B
2. Find User A's item
3. Click "Notify" button
4. Type message: "I think I found your item!"
5. Click "Send"
6. Should see success alert

### 3. **Test Receive Notification**
1. Log in as User A
2. Click 🔔 Notifications in navbar
3. Should see message from User B
4. Message should show:
   - "User B" (sender name)
   - "I think I found your item!" (message)
   - Item ID (e.g., "#101")
   - Timestamp

### 4. **Test Reply**
1. User A clicks "↩️ Reply"
2. Types: "Thank you! Can we meet?"
3. Clicks "✓ Send Reply"
4. Log in as User B
5. Check Notifications
6. Should see reply from User A

### 5. **Test Auto-Refresh**
1. Have notifications open
2. Have another user send a notification
3. Within 10 seconds, notification should appear automatically

---

## Future Enhancements

### Phase 2 (Optional)
- [ ] Mark notifications as read/unread
- [ ] Delete notifications
- [ ] Notification badge with count on navbar
- [ ] Real-time notifications using WebSockets
- [ ] Block/unblock users
- [ ] Notification sound alerts
- [ ] Email notifications
- [ ] Search within notifications

### Phase 3 (Advanced)
- [ ] Full messaging/chat system
- [ ] Notification preferences (disable certain types)
- [ ] Notification scheduling
- [ ] Template messages
- [ ] Bulk notifications to multiple users

---

## Important Notes

1. **Authentication Required**: All notification endpoints require JWT authentication
2. **Database Connection**: Ensure Contacts table exists and is properly set up
3. **Auto-Refresh**: Notification panel refreshes every 10 seconds - adjust interval if needed
4. **CORS**: Ensure backend CORS allows requests from frontend port (5174)
5. **Timestamps**: All timestamps use JavaScript's `toLocaleString()` for local display

---

## Troubleshooting

### Notifications not sending?
- Check if user is authenticated (JWT token valid)
- Verify item_id exists in Items table
- Check browser console for API errors
- Ensure backend server is running

### Notifications not loading?
- Check network tab in DevTools
- Verify `/api/contacts` endpoint is accessible
- Check if user has proper authentication
- Check backend logs for errors

### Auto-refresh not working?
- Verify interval is set correctly (10000ms = 10 seconds)
- Check browser console for errors
- Ensure API is responsive

### Database errors?
- Run `ensure_schema.sql` to verify Contacts table structure
- Check MySQL connection in `config/database.js`
- Verify foreign keys are properly set

---

## Contact Information
For questions about this feature, review the code in:
- Backend: `server/controllers/contactController.js`
- Routes: `server/routes/contactRoutes.js`
- Frontend: `client/src/components/NotificationsPanel.jsx`
- API Service: `client/src/services/api.js`

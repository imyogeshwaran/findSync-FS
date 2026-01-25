# Real-Time Chat - Quick Setup (5 Minutes)

## Step 1: Install Dependencies (1 min)

```bash
# In server directory
cd server
npm install socket.io

# In client directory (another terminal)
cd client
npm install socket.io-client
```

## Step 2: Update Database (1 min)

Open MySQL and run:

```sql
-- Add delivery status tracking
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS delivery_status ENUM('pending', 'sent', 'delivered', 'read') DEFAULT 'pending' AFTER `sent_at`;
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL AFTER `delivery_status`;
ALTER TABLE Messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP NULL AFTER `delivered_at`;

-- Add indexes for performance
ALTER TABLE Messages ADD INDEX IF NOT EXISTS idx_delivery_status (delivery_status);
ALTER TABLE Messages ADD INDEX IF NOT EXISTS idx_contact_delivery (contact_id, delivery_status);
```

Or run the SQL file:
```bash
mysql -u root -p findsync < server/config/add_delivery_status.sql
```

## Step 3: Start Server (1 min)

```bash
cd server
npm start
```

You should see:
```
🚀 Server is running on port 3005
📍 API: http://localhost:3005
💚 WebSocket: ws://localhost:3005
```

## Step 4: Start Client (1 min)

In another terminal:
```bash
cd client
npm run dev
```

## Step 5: Update Your Component (1 min)

Find where you use `ChatBox`:

**Before:**
```jsx
import ChatBox from '../components/ChatBox';

<ChatBox contactId={contactId} onClose={handleClose} />
```

**After:**
```jsx
import ChatBoxV2 from '../components/ChatBoxV2';

<ChatBoxV2 
  contactId={contactId} 
  userId={currentUserId}  // Add this
  onClose={handleClose} 
/>
```

Make sure you have access to `currentUserId` (from your auth context).

## That's It! 🎉

Your chat system now has:

✅ **Instant messaging** - Messages appear in real-time  
✅ **Typing indicators** - See when others are typing  
✅ **Offline support** - Messages queue automatically  
✅ **Delivery status** - See if message sent/delivered  
✅ **Connection status** - Green dot = connected  

## Quick Test

1. Open two browser windows
2. Login with different users in each
3. Start a conversation
4. Send a message - it should appear instantly in both windows!

## Common Issues

**"Cannot reach API" error?**
- Make sure server is running on port 3005
- Check that no firewall is blocking WebSocket

**Messages not syncing?**
- Make sure you passed `userId` to ChatBoxV2
- Check browser console for errors
- Verify both users have stable internet

**Need to debug?**
- Open DevTools Console (F12)
- Look for logs with 🔌, 📨, ✏️, 🗑️, etc.
- Check Network tab → WS for WebSocket messages

## Full Documentation

See [REALTIME_MESSAGING_GUIDE.md](REALTIME_MESSAGING_GUIDE.md) for:
- Detailed architecture
- WebSocket events reference
- Advanced configuration
- Performance tuning
- Security considerations

## Troubleshooting

### Still having issues? Check these:

1. **Server logs** - Look for errors on server console
2. **Browser console** - Open DevTools → Console tab
3. **Network tab** - Check WebSocket connection (WS)
4. **Database** - Verify columns were added to Messages table
5. **Dependencies** - Run `npm install` again in both folders

## Need Help?

All WebSocket events are logged to console with emoji prefixes:
- 🔌 = Connection status
- 📨 = Message received
- ✏️ = Message edited
- 🗑️ = Message deleted
- ⏳ = Delivery status change

Watch these logs to understand what's happening!

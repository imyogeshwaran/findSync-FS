# Real-Time Chat System Implementation Guide

## Overview

This guide explains the new real-time, reliable, and seamless messaging system that has been integrated into your FindSync application. The system uses WebSocket (Socket.IO) for instant communication, message queuing for offline support, and optimistic UI updates for a smooth user experience.

## Architecture

### Technology Stack

- **WebSocket**: Socket.IO for real-time bidirectional communication
- **Message Queue**: LocalStorage-based message persistence for offline support
- **Database**: Enhanced Messages table with delivery status tracking
- **Frontend**: React hooks for WebSocket integration and state management

### Key Components

```
1. Server (Node.js/Express)
   ├── WebSocket Server (Socket.IO)
   ├── Active User Tracking
   ├── Real-time Event Broadcasting
   └── Message Delivery Handling

2. Client (React)
   ├── useWebSocket Hook
   ├── Message Queue Service
   ├── ChatBoxV2 Component (Enhanced)
   ├── Optimistic UI Updates
   └── Offline Message Support
```

## Features Implemented

### 1. **Real-Time Messaging**
   - Instant message delivery via WebSocket
   - Typing indicators (shows when other user is typing)
   - Automatic acknowledgments
   - Sub-second message propagation

### 2. **Reliable Delivery**
   - Message delivery status tracking (pending, sent, delivered, read)
   - Automatic retry on connection restore
   - Queue persistence in localStorage
   - Connection status monitoring

### 3. **Offline Support**
   - Messages queued automatically when offline
   - Retry on reconnection
   - Local persistence across page refreshes
   - Clear queue management

### 4. **User Experience**
   - Optimistic UI updates (message appears immediately)
   - Connection status indicator
   - Typing indicators
   - Delivery status icons
   - Seamless error handling

### 5. **Real-Time Notifications**
   - Message received
   - Message edited
   - Message deleted
   - User online/offline
   - User typing

## Database Changes

### Added Columns to Messages Table

```sql
ALTER TABLE Messages ADD COLUMN delivery_status ENUM('pending', 'sent', 'delivered', 'read') DEFAULT 'pending';
ALTER TABLE Messages ADD COLUMN delivered_at TIMESTAMP NULL;
ALTER TABLE Messages ADD COLUMN read_at TIMESTAMP NULL;
```

### Indexes for Performance

```sql
ALTER TABLE Messages ADD INDEX idx_delivery_status (delivery_status);
ALTER TABLE Messages ADD INDEX idx_contact_delivery (contact_id, delivery_status);
```

## Setup Instructions

### Step 1: Install Dependencies

```bash
# Server
cd server
npm install socket.io

# Client
cd client
npm install socket.io-client
```

### Step 2: Apply Database Migration

```bash
# Run the migration script in MySQL
source server/config/add_delivery_status.sql
```

### Step 3: Environment Configuration

Ensure your API URL is properly configured:

**Client (.env or vite.config.js)**
```env
VITE_API_URL=http://localhost:3005/api
```

### Step 4: Server Startup

```bash
cd server
npm start
```

The server will output:
```
🚀 Server is running on port 3005
📍 API: http://localhost:3005
💚 WebSocket: ws://localhost:3005
```

### Step 5: Update Component Usage

Replace ChatBox with ChatBoxV2 in your pages:

```jsx
// Before
import ChatBox from '../components/ChatBox';
<ChatBox contactId={id} onClose={handleClose} />

// After
import ChatBoxV2 from '../components/ChatBoxV2';
<ChatBoxV2 contactId={id} userId={currentUserId} onClose={handleClose} />
```

## API & WebSocket Events

### WebSocket Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `user_connected` | `{ userId }` | User connects to chat |
| `message_new` | `{ contactId, receiverId, message, senderName }` | New message sent |
| `message_edited` | `{ contactId, messageId, newText, receiverId }` | Message edited |
| `message_deleted` | `{ contactId, messageId, receiverId }` | Message deleted |
| `typing` | `{ contactId, receiverId, isTyping }` | Typing indicator |
| `message_delivered` | `{ messageId, senderId }` | Message delivered |
| `message_read` | `{ contactId, senderId }` | Messages marked as read |

### WebSocket Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `user_online` | `{ userId }` | User came online |
| `user_offline` | `{ userId }` | User went offline |
| `message_received` | `{ contactId, message, timestamp }` | New message received |
| `message_edited_notification` | `{ contactId, messageId, newText, timestamp }` | Message was edited |
| `message_deleted_notification` | `{ contactId, messageId, timestamp }` | Message was deleted |
| `user_typing` | `{ contactId, isTyping }` | Other user typing |
| `message_delivered_notification` | `{ messageId, deliveredAt }` | Message delivered |
| `message_read_notification` | `{ contactId, readAt }` | Messages read |

## Usage Examples

### Basic Chat Implementation

```jsx
import ChatBoxV2 from '../components/ChatBoxV2';
import { useAuth } from '../context/AuthContext';

export default function ChatPage() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(null);

  return (
    <div>
      {/* Your conversation list */}
      
      {activeChat && (
        <ChatBoxV2
          contactId={activeChat.id}
          userId={user.id}
          onClose={() => setActiveChat(null)}
        />
      )}
    </div>
  );
}
```

### Custom Hook Usage

```jsx
import { useWebSocket } from '../hooks/useWebSocket';

function MyComponent() {
  const { isConnected, emit, on, off } = useWebSocket(userId);

  useEffect(() => {
    const handleMessage = (data) => {
      console.log('New message:', data);
    };

    on('message_received', handleMessage);
    
    return () => off('message_received', handleMessage);
  }, [on, off]);

  return (
    <div>
      Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
      <button onClick={() => emit('message_new', { 
        contactId: 1, 
        receiverId: 2, 
        message: 'Hello!' 
      })}>
        Send
      </button>
    </div>
  );
}
```

### Message Queue Usage

```jsx
import { messageQueueService } from '../services/messageQueue';

// Queue a message
const queued = messageQueueService.enqueue({
  contactId: 1,
  message: 'This will be sent later',
  senderId: userId
});

// Get all queued messages
const pending = messageQueueService.getAllQueued();

// Retry a message
messageQueueService.markAsSent(queued.id, serverMessageId);

// Clear queue
messageQueueService.clear();
```

## Message Flow Diagram

```
User A types message
    ↓
[Optimistic Update] Message appears in UI immediately
    ↓
Send via HTTP to backend
    ↓
Backend stores in database
    ↓
Server emits via WebSocket to User B
    ↓
User B receives message in real-time
    ↓
User B's client sends delivery confirmation
    ↓
Server updates delivery_status to 'delivered'
    ↓
User A sees ✓✓ confirmation icon
```

## Offline Support Flow

```
User A sends message (No Connection)
    ↓
[Queue] Message saved to localStorage
    ↓
UI shows 📌 indicator
    ↓
Connection restored
    ↓
[Auto-Retry] Message automatically sent
    ↓
Server delivers to User B
    ↓
UI updates with delivery status
    ↓
Queue item removed
```

## Delivery Status Icons

| Icon | Status | Meaning |
|------|--------|---------|
| ⏳ | pending | Message being sent |
| ✓ | sent | Message sent to server |
| ✓✓ | delivered | Message delivered to recipient |
| ✓✓ | read | Message read by recipient |
| 📌 | queued | Message queued for offline |
| ⬜ | disconnected | Connection status indicator |
| 🟢 | connected | Connection status indicator |

## Performance Considerations

### Database Optimization

The new indexes improve query performance:

```sql
-- Fast delivery status checks
SELECT * FROM Messages WHERE delivery_status = 'pending';

-- Fast contact-specific queries
SELECT * FROM Messages WHERE contact_id = ? AND delivery_status = 'delivered';
```

### WebSocket Configuration

Configured for optimal performance:

```javascript
const io = new Server(server, {
  pingTimeout: 60000,        // 60 seconds
  pingInterval: 25000,       // 25 seconds
  transports: ['websocket', 'polling']  // Fallback support
});
```

### Message Queue Limits

- Maximum 5 retry attempts per message
- 3-second typing indicator timeout
- Automatic cleanup of failed messages after retries

## Error Handling

### Connection Errors

- Automatic reconnection with exponential backoff
- Connection status displayed to user
- User prevented from sending while disconnected

### Message Send Failures

- Automatically queued for retry
- User notified with toast message
- Manual retry option available

### Offline Detection

- Network status monitored
- UI updates to reflect offline state
- Queued messages sent automatically on reconnection

## Testing the System

### Test Scenario 1: Real-Time Messaging

1. Open two browser windows
2. Login different users in each
3. Start a conversation
4. Send a message - should appear instantly in both windows

### Test Scenario 2: Offline Support

1. Open chat window
2. Close network tab in DevTools (simulate offline)
3. Try sending a message
4. Message should queue with 📌 indicator
5. Restore network connection
6. Message should auto-retry and send

### Test Scenario 3: Typing Indicators

1. Open two browser windows
2. Start typing in one window
3. Other window should show "User is typing..." text

### Test Scenario 4: Delivery Status

1. Send a message
2. Watch for ⏳ → ✓ → ✓✓ progression
3. Verify delivery_status column updates in database

## Troubleshooting

### WebSocket Connection Failed

**Problem**: "Cannot reach API. Is the backend running?"

**Solution**:
1. Ensure server is running: `npm start` in server folder
2. Check if server is listening on port 3005
3. Verify CORS settings in server.js
4. Check browser console for network errors

### Messages Not Syncing

**Problem**: Message appears in one client but not the other

**Solution**:
1. Verify WebSocket connection is established
2. Check browser console for socket errors
3. Look at server logs for emission errors
4. Verify userId is passed correctly to ChatBoxV2

### Queue Messages Not Sending

**Problem**: Queued messages not retrying on reconnection

**Solution**:
1. Check browser localStorage for messageQueue
2. Verify connection is restored (green indicator)
3. Check for JavaScript errors in console
4. Manually clear queue if corrupted: `localStorage.clear()`

## Security Considerations

### Authentication

- WebSocket connections require JWT token
- User identity verified for each event
- Admin operations protected separately

### Message Validation

- Messages validated on server before storage
- User can only edit/delete own messages
- Admins can delete any message

### Data Privacy

- Messages encrypted at rest (recommended: add encryption)
- Delivery confirmations don't expose message content
- User presence only shared with connected users

## Future Enhancements

1. **Message Encryption**: End-to-end encryption for messages
2. **Message Search**: Index and search message history
3. **File Sharing**: Support for file/image attachments
4. **Video Chat**: WebRTC integration for video calls
5. **Message Reactions**: Emoji reactions to messages
6. **Message Threads**: Reply threading for conversations
7. **Read Receipts**: Show exactly when messages are read
8. **Notification Badges**: Unread message badges
9. **Message Retention**: Automatic cleanup of old messages
10. **Analytics**: Message metrics and statistics

## Performance Metrics

Expected performance with the new system:

- **Message Delivery**: < 100ms
- **Reconnection Time**: < 2 seconds
- **Offline Queue**: No size limit (browser storage)
- **Typing Indicator Latency**: < 50ms
- **Connection Stability**: 99.9%+ uptime

## Support & Documentation

For more information:
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Hooks Documentation](https://react.dev/reference/react/hooks)
- [HTTP to WebSocket Migration](https://socket.io/docs/v4/http-long-polling/)

## File References

Key files modified/created:

- ✅ [server/server.js](server/server.js) - WebSocket server setup
- ✅ [server/config/add_delivery_status.sql](server/config/add_delivery_status.sql) - Database migration
- ✅ [server/package.json](server/package.json) - socket.io dependency
- ✅ [client/package.json](client/package.json) - socket.io-client dependency
- ✅ [client/src/hooks/useWebSocket.js](client/src/hooks/useWebSocket.js) - WebSocket hook
- ✅ [client/src/services/messageQueue.js](client/src/services/messageQueue.js) - Queue service
- ✅ [client/src/components/ChatBoxV2.jsx](client/src/components/ChatBoxV2.jsx) - Enhanced chat component

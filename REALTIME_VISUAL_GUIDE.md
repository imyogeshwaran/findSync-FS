# Real-Time Chat System - Visual Guide & Feature Overview

## 🎨 UI/UX Features

### Connection Status Bar
```
┌─────────────────────────────────────────┐
│ Chat  🟢 Connected                    ✕ │
├─────────────────────────────────────────┤
│                                         │
│  Messages area with real-time updates   │
│                                         │
├─────────────────────────────────────────┤
│ [Type message...] [📤 Send]             │
└─────────────────────────────────────────┘

Status Indicators:
🟢 Green = Connected and ready
⬜ Gray  = Connecting/Disconnected
```

### Message Display with Delivery Status
```
┌─────────────────────────────────────────┐
│ You                                     │
│ Hello there! ✓✓ 2:30 PM                 │
│                                         │
│                      MonkeyD Luffy      │
│                      Hey! How are you?  │
│                      ✓ 2:31 PM          │
│                                         │
│ User is typing... ⌛                     │
└─────────────────────────────────────────┘

Status Icons:
⏳ Pending     (still sending)
✓  Sent       (server received)
✓✓ Delivered  (user received)
📌 Queued     (offline, will send later)
⌛ Typing      (other user typing)
```

### Context Menu (Long Press)
```
┌──────────────┐
│ ✏️  Edit     │
├──────────────┤
│ 🗑️  Delete   │
└──────────────┘

Long Press Duration: 500ms
Shows on sender's own messages only
```

## 📡 Message Flow Diagrams

### Real-Time Send Flow
```
User A Types "Hello"
        │
        ↓
    [Send Button]
        │
        ↓
[Optimistic Update] Message appears immediately in UI
        │
        ↓
WebSocket sends to server
        │
        ├─ Server receives
        │  └─ Update delivery_status = 'sent'
        │
        ├─ Server broadcasts to User B
        │  └─ [Message appears in User B's chat]
        │
        └─ User B's client sends confirmation
           └─ Update delivery_status = 'delivered'
                   ↓
            ✓✓ appears in User A's chat
```

### Offline Queue Flow
```
User A is OFFLINE
        │
        ↓
Sends message "Hello"
        │
        ├─ [Optimistic update] Shows message with 📌
        │
        ├─ [Queue to localStorage]
        │  message = {
        │    id: "temp_123456",
        │    contactId: 1010,
        │    message: "Hello",
        │    status: "pending",
        │    retries: 0
        │  }
        │
        └─ Show toast: "Message queued. Will send when online"
                  │
        [User goes ONLINE]
                  │
                  ├─ [Auto-retry] Send queued message
                  │
                  ├─ [Success] Update delivery_status
                  │
                  └─ Remove from queue
                     📌 disappears, ✓✓ appears
```

### Real-Time Edit Flow
```
User A sends "Hello"
        │
        ├─ ✓✓ Delivered
        │
        └─ [Long press] → [Edit]
                │
                ├─ [Optimistic update] Shows "Hello world" immediately
                │
                └─ WebSocket broadcast to User B
                   └─ User B sees message update
                      Original: "Hello"
                      Updated:  "Hello world" (edited)
```

### Typing Indicator Flow
```
User A starts typing
        │
        ├─ [Emit 'typing' event] isTyping: true
        │  └─ User B receives: "User A is typing..." ⌛
        │
        [User A pauses for 3 seconds]
        │
        ├─ [Emit 'typing' event] isTyping: false
        │  └─ User B stops seeing: "User is typing..."
        │
        └─ Or User A sends message
           └─ Automatically stops typing indicator
```

## 🔄 Connection States

### Connection State Machine
```
┌──────────────┐
│   CREATED    │
└──────┬───────┘
       │
       ├─ [Connect]
       ↓
┌──────────────┐
│  CONNECTING  │
└──────┬───────┘
       │
       ├─ [Connected]
       │  └─ [user_connected event]
       ↓
┌──────────────┐
│  CONNECTED   │  ← Ready for messaging
└──────┬───────┘
       │
       ├─ [Network Error]
       │  └─ [Auto-reconnect with backoff]
       │
       ├─ [User closes app]
       │  └─ [Disconnect gracefully]
       │
       └─ [Server error]
          └─ [Queue messages, retry on reconnect]

Reconnection Strategy:
- Attempt 1: 1 second
- Attempt 2: 2 seconds
- Attempt 3: 4 seconds
- Attempt 4: 8 seconds
- Attempt 5: 10 seconds (max)
- Max attempts: 10
```

## 💾 Data Storage

### Browser LocalStorage for Message Queue
```
localStorage = {
  "messageQueue": [
    {
      "id": "temp_1705791600000_abc123",
      "contactId": 1010,
      "message": "Hello from offline!",
      "senderId": 21,
      "queuedAt": "2026-01-20T10:00:00.000Z",
      "status": "pending",
      "retries": 2
    },
    {
      "id": "temp_1705791605000_def456",
      "contactId": 1010,
      "message": "Are you there?",
      "senderId": 21,
      "queuedAt": "2026-01-20T10:00:05.000Z",
      "status": "pending",
      "retries": 1
    }
  ]
}

Max size: Browser dependent (usually 5-10MB)
Auto-cleaned: When messages successfully send
Manual clean: messageQueueService.clear()
```

### Database Message Status Progress
```
Message: "Hello there"
├─ Created
│  └─ delivery_status: 'pending'
│     message_id: 5028
│     sent_at: 2026-01-20 10:00:00
│
├─ Server received
│  └─ delivery_status: 'sent'
│
├─ Client received
│  └─ delivery_status: 'delivered'
│     delivered_at: 2026-01-20 10:00:00.100
│
└─ (Optional) Read
   └─ delivery_status: 'read'
      read_at: 2026-01-20 10:00:05.200
```

## 🔌 WebSocket Event Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WebSocket Server                         │
│  (Socket.IO on port 3005)                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ↓              ↓              ↓
    ┌────────┐   ┌────────┐   ┌────────┐
    │User A  │   │User B  │   │User C  │
    │Socket  │   │Socket  │   │Socket  │
    └────────┘   └────────┘   └────────┘

Event Broadcasting:
User A emits 'message_new'
    ↓
Server receives
    ↓
Server broadcasts to all except sender
    ↓
User B receives 'message_received'
User C receives 'message_received'
(in real-time < 100ms)
```

## 📊 Performance Metrics

### Expected Latencies
```
Operation              │ Latency   │ Status
───────────────────────┼───────────┼────────
Send message           │ < 100ms   │ ✓
Typing indicator       │ < 50ms    │ ✓
Connect to server      │ < 2s      │ ✓
Reconnect (avg)        │ < 5s      │ ✓
Offline queue retry    │ < 3s      │ ✓
Database query         │ < 50ms    │ ✓
Disk write             │ < 100ms   │ ✓
Total user perception  │ < 200ms   │ ✓
```

### Scalability
```
Users   │ Connections │ Memory  │ Bandwidth
────────┼─────────────┼─────────┼──────────
10      │ 10          │ ~5MB    │ ~1KB/s
100     │ 100         │ ~50MB   │ ~10KB/s
1,000   │ 1,000       │ ~500MB  │ ~100KB/s
10,000  │ 10,000      │ ~5GB    │ ~1MB/s
```

## 🎯 Feature Checklist

### For End Users
- [x] Send messages - appear instantly
- [x] See when typing - "User is typing..."
- [x] Edit messages - update in real-time
- [x] Delete messages - removed for both
- [x] Go offline - queue messages
- [x] Come back online - auto-send queued
- [x] See delivery status - know message delivered
- [x] See who sent what - sender names displayed
- [x] Understand connection - green/gray indicator

### For Developers
- [x] WebSocket integration
- [x] Message queuing system
- [x] Optimistic UI updates
- [x] Error handling
- [x] Automatic reconnection
- [x] Real-time event system
- [x] Database tracking
- [x] Performance optimization
- [x] Comprehensive logging

### For DevOps
- [x] Port configuration (3005)
- [x] Scalable architecture
- [x] Database indexes
- [x] Connection pooling
- [x] Error monitoring
- [x] Health checks
- [x] Graceful shutdown
- [x] Resource monitoring

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (React)                 │
│  ┌──────────────────────────────────────┐       │
│  │     ChatBoxV2 Component              │       │
│  │  ┌──────────────────────────────┐    │       │
│  │  │  useWebSocket Hook           │    │       │
│  │  │  - Connection mgmt           │    │       │
│  │  │  - Event handlers            │    │       │
│  │  └──────────────────────────────┘    │       │
│  │  ┌──────────────────────────────┐    │       │
│  │  │  messageQueue Service        │    │       │
│  │  │  - Offline persistence       │    │       │
│  │  │  - Retry logic               │    │       │
│  │  └──────────────────────────────┘    │       │
│  └──────────────────────────────────────┘       │
│         ↓                                        │
│   [WebSocket & HTTP]                            │
└──────────────────┬───────────────────────────────┘
                   │
                   │ ws://localhost:3005
                   │ http://localhost:3005/api
                   ↓
    ┌──────────────────────────────────┐
    │  Node.js/Express Server          │
    │  ┌────────────────────────────┐  │
    │  │  Socket.IO Server          │  │
    │  │  - Connection handling     │  │
    │  │  - Event routing           │  │
    │  │  - Broadcast messaging     │  │
    │  │  - User tracking           │  │
    │  └────────────────────────────┘  │
    │  ┌────────────────────────────┐  │
    │  │  REST API Endpoints        │  │
    │  │  - Send message (POST)     │  │
    │  │  - Edit message (PUT)      │  │
    │  │  - Delete message (DELETE) │  │
    │  │  - Get history (GET)       │  │
    │  └────────────────────────────┘  │
    │         ↓                         │
    │   [TCP Connection Pool]           │
    └──────────────┬────────────────────┘
                   │
                   ↓
    ┌──────────────────────────────────┐
    │  MySQL Database                  │
    │  ┌────────────────────────────┐  │
    │  │  Messages Table            │  │
    │  │  - message_id (PK)         │  │
    │  │  - contact_id (FK)         │  │
    │  │  - sender_id, receiver_id  │  │
    │  │  - message (content)       │  │
    │  │  - delivery_status (idx)   │  │
    │  │  - delivered_at, read_at   │  │
    │  │  - is_deleted, edited_at   │  │
    │  └────────────────────────────┘  │
    │         ↓                         │
    │    [Persistent Storage]           │
    └──────────────────────────────────┘
```

## 🔐 Security Model

```
┌─────────────────────────────────────┐
│    Client WebSocket Request         │
│  (socket.io-client v4.7.2)          │
│  Headers: { auth: { token: JWT } }  │
└────────────────┬────────────────────┘
                 │
                 ↓
    ┌────────────────────────────────┐
    │  Server Authentication         │
    │  ✓ Verify JWT token           │
    │  ✓ Extract user_id            │
    │  ✓ Check permissions          │
    └────────────────┬───────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
    [Admin?]                [Regular User?]
         │                       │
         │                       ├─ Can send own messages
    ├─ Can delete              ├─ Can edit own
    │  any message              ├─ Can delete own
    │                           ├─ Cannot delete others
    ├─ Can see all              └─ See only own delivery
    │  conversations
    │
    └─ See admin dashboard
       (separate endpoint)

Message Authorization:
1. User tries to delete messageId X
2. Server checks: sender_id == user_id OR admin
3. If true → Allow delete
4. If false → Return 403 Forbidden
5. Log action for audit trail
```

---

**Visual Guide Complete** ✓

All diagrams represent the actual system implementation with real code and flow.

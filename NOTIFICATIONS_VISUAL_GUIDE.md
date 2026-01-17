# FindSync Notification System - Visual Guide

## 🎯 User Interface Mockup

### 1. Home Page - Item Card with Notify Button

```
┌─────────────────────────────────────────────────────┐
│  [Image]                                            │
│  Lost Wallet                                        │
│  Description: Black leather wallet with ID cards   │
│  Location: Downtown Market                          │
│  📍 2 hours ago                                     │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Write a message to the owner...              │ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│  ┌─────────────────┐   ┌──────────────────────┐    │
│  │ Send            │   │ Cancel               │    │
│  └─────────────────┘   └──────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 2. Notifications Panel

```
╔═════════════════════════════════════════════════════════════╗
║  🔔 Notifications                                           ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │ 💬 John Doe                        Jan 17, 10:30 AM │  ║
║  │ "I think I found your wallet at the market!"        │  ║
║  │ 📌 Regarding Item ID: #101                          │  ║
║  │ 📧 john.doe@example.com                             │  ║
║  │                                                     │  ║
║  │ ┌─────────────────────┐                             │  ║
║  │ │ ↩️ Reply            │                             │  ║
║  │ └─────────────────────┘                             │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │ 💬 Jane Smith                      Jan 17, 09:15 AM │  ║
║  │ "Did you check the lost and found at the police?"   │  ║
║  │ 📌 Regarding Item ID: #101                          │  ║
║  │ 📧 jane.smith@example.com                           │  ║
║  │                                                     │  ║
║  │ ┌─────────────────────┐                             │  ║
║  │ │ ↩️ Reply            │                             │  ║
║  │ └─────────────────────┘                             │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                             ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │ [Reply Form] (when clicking Reply)                  │  ║
║  │                                                     │  ║
║  │ ┌──────────────────────────────────────────────┐   │  ║
║  │ │ Type your reply here...                      │   │  ║
║  │ │                                              │   │  ║
║  │ └──────────────────────────────────────────────┘   │  ║
║  │                                                     │  ║
║  │ ┌──────────────────┐  ┌──────────────────┐         │  ║
║  │ │ ✓ Send Reply     │  │ Cancel           │         │  ║
║  │ └──────────────────┘  └──────────────────┘         │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

### 3. Notification Badge (Future Enhancement)

```
┌─────────────────────────────────────┐
│ Home  Explore  Find  🔔(5)  Account  │
│                      ↑                │
│              Unread count badge       │
└─────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### Sending a Notification

```
┌──────────────────┐
│   User Views     │
│  Item in Home    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Clicks "Notify" │
│    Button        │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  Message Input Appears   │
│  (Inline Text Area)      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  User Types Message      │
│  and Clicks "Send"       │
└────────┬─────────────────┘
         │
         ▼ POST /api/contacts
┌──────────────────────────┐
│  Frontend validates      │
│  message not empty       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Backend (Node.js)               │
│  1. Verify user authenticated    │
│  2. Check item exists            │
│  3. Find item owner              │
│  4. Insert into Contacts table   │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Database (MySQL)                │
│  Contacts table                  │
│  +contact_id: 1001               │
│  +sender_id: 5                   │
│  +receiver_id: 3                 │
│  +item_id: 101                   │
│  +message: "Found your item!"    │
│  +contact_date: 2026-01-17...    │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Response: {success: true}       │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Frontend                        │
│  Shows "Notification sent" alert │
│  Clears input                    │
│  Resets button                   │
└──────────────────────────────────┘
```

### Receiving & Viewing Notifications

```
┌──────────────────────┐
│  User Logs In        │
│  Item Owner          │
└─────────┬────────────┘
          │
          ▼
┌──────────────────────────┐
│  Clicks 🔔 Notifications │
│  in Navbar              │
└─────────┬────────────────┘
          │
          ▼ GET /api/contacts
┌──────────────────────────────┐
│  Frontend Sends Request      │
│  Include JWT Token           │
└─────────┬────────────────────┘
          │
          ▼
┌──────────────────────────────┐
│  Backend                     │
│  1. Verify JWT token         │
│  2. Get user ID from token   │
│  3. Query Contacts table     │
│  4. Filter by receiver_id    │
│  5. JOIN with Users table    │
│  6. JOIN with Items table    │
└─────────┬────────────────────┘
          │
          ▼
┌──────────────────────────────┐
│  Database Query Result       │
│  Returns:                    │
│  - contact_id               │
│  - sender_name              │
│  - sender_email             │
│  - message                  │
│  - contact_date             │
│  - item_name                │
│  - post_type                │
└─────────┬────────────────────┘
          │
          ▼
┌──────────────────────────────┐
│  Frontend (NotificationsPanel)
│  1. Displays all messages    │
│  2. Shows sender info        │
│  3. Shows timestamp          │
│  4. Shows item details       │
│  5. Adds Reply button        │
└──────────────────────────────┘

Auto-refresh every 10 seconds:
     ↓
  Fetches new notifications
     ↓
  Updates display
```

### Replying to Notifications

```
┌────────────────────────────────┐
│  User Views Notification       │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│  Clicks "↩️ Reply" Button       │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│  Reply Form Expands            │
│  (Textarea visible)            │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│  User Types Reply Message      │
└─────────┬──────────────────────┘
          │
          ▼
┌────────────────────────────────┐
│  Clicks "✓ Send Reply"         │
│  or "Cancel"                   │
└─────────┬──────────────────────┘
          │
          ├─→ If Cancel: Close form
          │
          └─→ If Send:
              │
              ▼ POST /api/contacts
         ┌──────────────────────────────┐
         │  Backend                     │
         │  1. Validate message         │
         │  2. Create Contacts entry    │
         │     (sender_id: current user)│
         │     (receiver_id: original)  │
         │     (item_id: same item)     │
         │     (message: reply text)    │
         └──────┬───────────────────────┘
                │
                ▼
         ┌──────────────────────┐
         │  Database            │
         │  New Contacts entry  │
         │  created             │
         └──────┬───────────────┘
                │
                ▼
         ┌──────────────────────┐
         │  Frontend            │
         │  Success message     │
         │  Form closes         │
         │  List refreshes      │
         └──────────────────────┘
                │
                ▼
         ┌──────────────────────────┐
         │  Original Sender         │
         │  Logs In                 │
         │  Sees Reply as New       │
         │  Notification            │
         └──────────────────────────┘
```

---

## 🔄 System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       FINDSYNC ARCHITECTURE                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐                  ┌─────────────────┐   │
│  │   FRONTEND       │                  │    BACKEND      │   │
│  │   (React.js)     │                  │  (Node.js)      │   │
│  │                  │                  │                 │   │
│  │ NotificationsPanel◄──GET /api/contacts─►contactController │
│  │ │                 │                  │                 │   │
│  │ ├─ View list      │                  ├─ getNotifications   │
│  │ │                 │                  │                 │   │
│  │ ├─ Send reply     │                  ├─ createContact      │
│  │ │                 │                  │                 │   │
│  │ ├─ Load data      │                  ├─ getCount           │
│  │ │                 │                  │                 │   │
│  │ ├─ Auto-refresh   │                  ├─ getConversations   │
│  │ │                 │                  │                 │   │
│  │ └─ Error handling │                  └─ Error handling     │
│  │                  │                                      │   │
│  │ POST /api/contacts────► Input Validation               │   │
│  │      │                  Database Query                  │   │
│  │      │                  Response                        │   │
│  │      └─────────────────────────────────────────────┐   │   │
│  │                                                    │   │   │
│  │  Home.jsx                    ┌──────────────────────┘   │   │
│  │  │                           │                         │   │
│  │  ├─ Item Cards with          │  ┌─────────────────┐   │   │
│  │  │  "Notify" buttons        │  │  AUTHENTICATION │   │   │
│  │  │                           │  │  (JWT Token)    │   │   │
│  │  ├─ Message Input           │  ├─ Middleware:    │   │   │
│  │  │  (on click Notify)       │  │  /middleware/   │   │   │
│  │  │                           │  │  auth.js        │   │   │
│  │  └─ Route to                │  │                 │   │   │
│  │     NotificationsPanel      │  └─────────────────┘   │   │
│  │                              │                        │   │
│  └──────────────────────────────┼────────────────────────┘   │
│                                 │                             │
│                           ┌─────▼────────────┐              │
│                           │    DATABASE      │              │
│                           │    (MySQL)       │              │
│                           │                  │              │
│                           │  Contacts Table: │              │
│                           │  ├─ contact_id   │              │
│                           │  ├─ sender_id    │              │
│                           │  ├─ receiver_id  │              │
│                           │  ├─ item_id      │              │
│                           │  ├─ message      │              │
│                           │  └─ contact_date │              │
│                           │                  │              │
│                           │  Users Table     │              │
│                           │  (JOIN)          │              │
│                           │                  │              │
│                           │  Items Table     │              │
│                           │  (JOIN)          │              │
│                           └──────────────────┘              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎛️ Component Lifecycle

### NotificationsPanel Component

```
Component Mount
    │
    ▼
useEffect Hook Runs
    │
    ├─► Create auto-refresh interval (10s)
    │
    └─► Call loadNotifications()
        │
        ▼
    Try to fetch from /api/contacts
        │
        ├─► Success: setNotifications(data)
        │
        └─► Error: console.error
    
    setLoading(false)


User Interaction:
    │
    ├─► Click "Reply" button
    │   │
    │   ▼
    │   setReplyingTo(contact_id)
    │   Reply form appears
    │
    └─► Type message + click "Send Reply"
        │
        ▼
    handleReply()
        │
        ├─► Validate message not empty
        │
        ├─► createContact(API call)
        │   │
        │   ├─► Success alert
        │   │
        │   └─► setReplyingTo(null) - close form
        │
        └─► loadNotifications() - refresh list


Auto-refresh:
    │
    ├─► Every 10 seconds
    │
    ▼
loadNotifications() runs again
    │
    ▼
Updates notification list
    │
    ▼
Component re-renders with fresh data


Component Unmount:
    │
    ▼
Clear interval to prevent memory leak
    │
    ▼
Component destroyed
```

---

## 📈 State Management

### NotificationsPanel State

```
notifications (Array)
│
├─ Populated by: GET /api/contacts
├─ Structure: [{contact_id, sender_id, message, ...}, ...]
├─ Updated by: loadNotifications()
└─ Used for: Rendering notification list

loading (Boolean)
│
├─ true: Show "Loading..."
├─ false: Show list or empty state
└─ Updated by: setLoading()

replyingTo (Number or null)
│
├─ null: No reply in progress
├─ number: contact_id of notification being replied to
├─ Shows: Reply form for that notification
└─ Updated by: setReplyingTo()

replyMessage (String)
│
├─ Current text in reply textarea
├─ Cleared on: Send or Cancel
└─ Updated by: onChange handler

sending (Boolean)
│
├─ true: Disable send button, show loading
├─ false: Enable send button
└─ Updated by: setSending()
```

---

## 🎨 Styling Breakdown

### Colors Used
```
Text Colors:
├─ #fff (white)           - Main text
├─ #a855f7 (purple)       - Sender names
├─ #e0e0e0 (light gray)   - Message text
└─ #999 (gray)            - Timestamps

Background Colors:
├─ rgba(255,255,255,0.05) - Notification items
├─ rgba(255,255,255,0.08) - Hover state
├─ rgba(0,0,0,0.5)        - Input backgrounds
├─ linear-gradient(#4f46e5, #a855f7) - Reply button
└─ linear-gradient(#10b981, #059669) - Send button

Borders:
├─ rgba(255,255,255,0.1)  - Item borders
├─ rgba(255,255,255,0.15) - Hover borders
└─ rgba(168, 85, 247, 0.3) - Reply form border
```

### Layout
```
Container Padding: 20px
Item Padding: 16px
Gap Between Items: 12px
Border Radius: 10px

Responsive:
├─ Desktop: Full width, multi-column
└─ Mobile: Full width, single column
```

---

## ✨ Features Summary

```
┌─────────────────────────────────────────────────────┐
│  NOTIFICATION SYSTEM FEATURES                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ✓ Send notifications about items                  │
│  ✓ View all received notifications                 │
│  ✓ See sender information                          │
│  ✓ Reply directly to senders                       │
│  ✓ Auto-refresh every 10 seconds                   │
│  ✓ Item reference in each message                  │
│  ✓ Timestamp for all messages                      │
│  ✓ Error handling & validation                     │
│  ✓ Loading states                                  │
│  ✓ Responsive design                               │
│  ✓ Authentication required                         │
│  ✓ Mobile-friendly                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

This visual guide complements the technical documentation and helps understand the system at a glance!

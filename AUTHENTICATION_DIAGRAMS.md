# Architecture Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FINDSYNC APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  FRONTEND (React)              BACKEND (Node.js)    DATABASE     │
│  ─────────────────            ─────────────────    ──────────    │
│                                                                   │
│  ┌──────────────┐             ┌─────────────────┐              │
│  │   /login     │──────POST───│ /api/auth/login │──────┐       │
│  │ UserLogin    │ (email+pwd) │ Role Validation │      │       │
│  │  Component   │──────────────│ Users Table     │      │       │
│  └──────────────┘              └─────────────────┘      │       │
│         ▲                                                │       │
│         │ User clicks "Go to admin login"              │       │
│         └────────────────────────────────────────┐     │       │
│                                                  │     │       │
│  ┌──────────────┐             ┌─────────────────┐│     │       │
│  │ /admin/login │──────POST───│/api/auth/admin/ ││     ├──────▶│
│  │AdminLoginForm│ (email+pwd) │login            ││     │  JWT  │
│  │  Component   │──────────────│ Admin Table     ││     │ Token │
│  └──────────────┘              └─────────────────┘│     │       │
│         ▲                                        │     │       │
│         │ Admin clicks "Go to user login"       │     │       │
│         └────────────────────────────────────────┘     │       │
│                                                        │       │
│  ┌──────────────────┐      ┌──────────────────┐      │       │
│  │ Protected API    │─────▶│ Middleware Check │      │       │
│  │ Request (JWT)    │      │ verifyAdminToken │      │       │
│  │                  │      │ (role='admin'?)  │      │       │
│  └──────────────────┘      └──────────────────┘      │       │
│                                  ▲                   │       │
│                                  │ GRANTS/DENIES     │       │
│                                  ▼                   │       │
│                          ┌──────────────┐            │       │
│                          │ Protected    │            │       │
│                          │ Endpoint     │            │       │
│                          │ Response     │            │       │
│                          └──────────────┘            │       │
│                                                      ▼       │
│                                            ┌─────────────┐   │
│                                            │ Users table │   │
│                                            │ role='user' │   │
│                                            └─────────────┘   │
│                                            ┌─────────────┐   │
│                                            │Admin table  │   │
│                                            │(separate)   │   │
│                                            └─────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow Sequence Diagram

### User Login Flow

```
USER
  │
  ├─(1) Navigate to /login
  │
  ├─(2) See UserLoginForm
  │     ✓ Email input
  │     ✓ Password input
  │     ✓ Google OAuth button
  │     ✗ NO admin checkbox (SECURITY)
  │
  ├─(3) Enter credentials & submit
  │
  └─────────────────────────────────────────────────────────────┐
                                                                 │
                    ┌─────────────────────────────────────────┐  │
                    │   BACKEND VALIDATION                    │  │
                    ├─────────────────────────────────────────┤  │
                    │ POST /api/auth/login                    │  │
                    │ ├─ Check Users table (not admin table)  │  │
                    │ ├─ Verify email exists                  │  │
                    │ ├─ Verify password                      │  │
                    │ ├─ CRITICAL: Check role !== 'admin'    │  │
                    │ │  (If admin user, REJECT!)             │  │
                    │ ├─ Generate JWT with role='user'        │  │
                    │ └─ Log: [LOGIN_SUCCESS]                 │  │
                    └─────────────────────────────────────────┘  │
                                  │                              │
                        ┌─────────┴─────────┐                    │
                        │                   │                    │
                    SUCCESS             FAILURE                  │
                        │                   │                    │
       ┌────────────────┘                   └────────────────┐   │
       │                                                     │   │
       ├─(4a) Receive JWT + user data          (4b) Show error │
       │      {token, user{id, email, role}}       message      │
       │                                                        │
       ├─(5a) Store in localStorage            (5b) Retry     │
       │      userToken, userRole='user'                       │
       │                                                        │
       └─(6a) Redirect to /home            ┌──────────────────┘
              (Home component)               │
                                             │
                                    Clear form & retry
```

### Admin Login Flow

```
ADMIN
  │
  ├─(1) Navigate to /admin/login
  │
  ├─(2) See AdminLoginForm
  │     ✓ Email input
  │     ✓ Password input
  │     ✓ Admin badge ("🔐 Admin Portal")
  │     ✗ NO Google OAuth (admin only)
  │
  ├─(3) Enter credentials & submit
  │
  └─────────────────────────────────────────────────────────────┐
                                                                 │
                    ┌─────────────────────────────────────────┐  │
                    │   BACKEND VALIDATION                    │  │
                    ├─────────────────────────────────────────┤  │
                    │ POST /api/auth/admin/login              │  │
                    │ ├─ Check admin table ONLY               │  │
                    │ ├─ Verify email exists                  │  │
                    │ ├─ Verify password                      │  │
                    │ ├─ Generate JWT with role='admin'       │  │
                    │ └─ Log: [ADMIN_LOGIN_SUCCESS]           │  │
                    └─────────────────────────────────────────┘  │
                                  │                              │
                        ┌─────────┴─────────┐                    │
                        │                   │                    │
                    SUCCESS             FAILURE                  │
                        │                   │                    │
       ┌────────────────┘                   └────────────────┐   │
       │                                                     │   │
       ├─(4a) Receive JWT + admin data      (4b) Show error │
       │      {token, admin{id, email}}         message      │
       │                                                     │
       ├─(5a) Store in localStorage         (5b) Retry      │
       │      adminToken, userRole='admin'                  │
       │                                                     │
       └─(6a) Redirect to /admin/dashboard ┌────────────────┘
              (AdminDashboard component)    │
                                            │
                                   Clear form & retry
```

---

## Protected API Request Flow

```
AUTHENTICATED REQUEST
  │
  ├─(1) Frontend has JWT token
  │     user: role='user' or admin: role='admin'
  │
  ├─(2) Request protected endpoint
  │     GET /api/admin/dashboard/stats
  │     Headers: Authorization: Bearer <jwt_token>
  │
  └─────────────────────────────────────────────────────────────┐
                                                                 │
              ┌─────────────────────────────────────────┐        │
              │   MIDDLEWARE: verifyAdminToken          │        │
              ├─────────────────────────────────────────┤        │
              │ (1) Extract token from header           │        │
              │ (2) Verify JWT signature                │        │
              │ (3) Check token not expired             │        │
              │ (4) CRITICAL: Check decoded.role        │        │
              │     === 'admin' (NOT 'user'!)           │        │
              │ (5) Attach req.admin = decoded          │        │
              │ (6) Call next() or return 403           │        │
              └─────────────────────────────────────────┘        │
                                 │                               │
                    ┌────────────┴────────────┐                 │
                    │                         │                 │
            ✅ AUTHORIZED           ❌ NOT AUTHORIZED            │
                    │                         │                 │
       ┌────────────┘                         └────────────┐    │
       │                                                   │    │
       ├─(3a) Execute controller                 (3b) Return 403 │
       │      adminController.getDashboardStats │    {error:    │
       │                                         │    "Unauth"}  │
       │                                                       │
       ├─(4a) Query database                    (4b) Log attempt:
       │      SELECT ... FROM admin                    [SECURITY]
       │                                               Unauthorized
       │                                               access attempt
       ├─(5a) Return data
       │      {stats: {...}}
       │
       └─(6a) Send 200 response
              with data payload
```

---

## Role Validation at Each Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEFENSE IN DEPTH                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LAYER 1: DATABASE                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Users table: role ENUM('user', 'admin') DEFAULT 'user'   │  │
│  │ ✓ Constraint enforced by database                        │  │
│  │ ✓ Cannot insert invalid role values                      │  │
│  │ ✓ Cannot bypass with SQL injection                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ▼                                    │
│  LAYER 2: BACKEND LOGIN HANDLER                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/auth/login                                    │  │
│  │ ├─ Query Users table                                    │  │
│  │ ├─ Fetch user.role from database                        │  │
│  │ ├─ VALIDATE: if user.role === 'admin' → REJECT         │  │
│  │ │  (Returns 401: "Invalid email or password")           │  │
│  │ └─ Issue JWT with role='user'                           │  │
│  │                                                          │  │
│  │ POST /api/auth/admin/login                              │  │
│  │ ├─ Query admin table ONLY                               │  │
│  │ └─ Issue JWT with role='admin'                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ▼                                    │
│  LAYER 3: MIDDLEWARE VALIDATION                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ verifyAdminToken middleware on every protected route    │  │
│  │ ├─ Verify JWT signature (cannot be forged)              │  │
│  │ ├─ Check token not expired                              │  │
│  │ ├─ VALIDATE: decoded.role === 'admin'                   │  │
│  │ │  (If role !== 'admin' → Return 403 Forbidden)         │  │
│  │ └─ Attach req.admin to request                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ▼                                    │
│  LAYER 4: CONTROLLER AUTHORIZATION                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Admin controller has req.admin (set by middleware)      │  │
│  │ ├─ Can trust req.admin exists (middleware verified)     │  │
│  │ ├─ Can use req.admin.admin_id for audit logging         │  │
│  │ └─ Execute admin-only operations                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ▼                                    │
│  RESULT: MULTI-LAYER SECURITY                                  │
│  ✅ Admin cannot be created in Users table                     │
│  ✅ User endpoint rejects admin users                          │
│  ✅ Admin endpoint only accepts admin table records            │
│  ✅ JWT cannot be forged (signed)                              │
│  ✅ JWT role cannot be changed (signature mismatch)            │
│  ✅ Middleware validates role on every request                 │
│  ✅ Even if JWT manipulated, backend rejects                   │
│  ✅ Complete audit trail for all attempts                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Token Payload Structure

### User Token
```javascript
{
  // User identifier
  "id": 1,
  "firebase_uid": "xyz789",
  
  // User info
  "email": "user@example.com",
  "name": "John Doe",
  
  // CRITICAL: Role for authorization
  "role": "user",
  
  // JWT standard fields
  "iat": 1705363200,      // issued at
  "exp": 1706054400       // expires at (7 days)
}
```

### Admin Token
```javascript
{
  // Admin identifier
  "admin_id": 10101,
  
  // Admin info
  "email": "admin@example.com",
  "username": "admin1",
  
  // CRITICAL: Role for authorization
  "role": "admin",
  
  // JWT standard fields
  "iat": 1705363200,      // issued at
  "exp": 1706054400       // expires at (7 days)
}
```

**Key Difference**: Role field determines access level

---

## Request/Response Examples

### Scenario: User Tries Admin Endpoint

```
REQUEST
────────
GET /api/admin/dashboard/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                [Contains: role: 'user']

BACKEND PROCESSING
──────────────────
(1) Middleware extracts token
(2) Verifies signature ✓
(3) Checks expiry ✓
(4) VALIDATES: decoded.role === 'admin'
    Result: decoded.role = 'user'
    Comparison: 'user' !== 'admin'
    → FAIL ❌

RESPONSE
────────
403 Forbidden
{
  "error": "Unauthorized - Admin access required"
}

LOGGING
───────
[AUTH] Unauthorized admin access attempt. Role: user, ID: 1
[AUDIT] ADMIN_DASHBOARD_ACCESS | User: user@example.com, ID: 1
```

### Scenario: Admin Accesses Protected Endpoint

```
REQUEST
────────
GET /api/admin/dashboard/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                [Contains: role: 'admin']

BACKEND PROCESSING
──────────────────
(1) Middleware extracts token
(2) Verifies signature ✓
(3) Checks expiry ✓
(4) VALIDATES: decoded.role === 'admin'
    Result: decoded.role = 'admin'
    Comparison: 'admin' === 'admin'
    → SUCCESS ✓

RESPONSE
────────
200 OK
{
  "stats": {
    "totalUsers": 150,
    "totalItems": 500,
    "recentUsers": [...]
  }
}

LOGGING
───────
[AUDIT] ADMIN_DASHBOARD_ACCESS | User: admin@example.com, ID: 10101
```

---

## Component Hierarchy

```
App.jsx (Main Router)
│
├─── currentPage === 'userLogin'
│    └─ UserLoginForm.jsx
│       ├─ Email input
│       ├─ Password input
│       ├─ Google OAuth button
│       └─ "Go to admin login" link
│
├─── currentPage === 'adminLogin'
│    └─ AdminLoginForm.jsx
│       ├─ Email input
│       ├─ Password input
│       ├─ Admin portal badge
│       ├─ Security notice
│       └─ "Go to user login" link
│
├─── user (authenticated)
│    └─ Home.jsx
│       └─ User dashboard
│
└─── adminUser (authenticated)
     └─ AdminDashboard.jsx
        └─ Admin dashboard
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  User Input     │
│  (credentials)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐      ┌──────────────────┐
│ Frontend Form Handler   │─────▶│ Validation:      │
│ (UserLoginForm or       │      │ ✓ Email format  │
│  AdminLoginForm)        │      │ ✓ Password length│
└─────────┬───────────────┘      └──────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ HTTP POST Request                │
│ /api/auth/login or               │
│ /api/auth/admin/login            │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Backend Route Handler                │
│ ├─ Check Users/admin table           │
│ ├─ Verify password (bcrypt)          │
│ ├─ Validate role                     │
│ └─ Generate JWT                      │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ JWT Token Response                   │
│ {token, user/admin data}             │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Frontend Storage                     │
│ ├─ localStorage.setItem(token)       │
│ ├─ localStorage.setItem(userRole)    │
│ └─ Update app state                  │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Route Navigation                     │
│ ├─ If user → /home                   │
│ ├─ If admin → /admin/dashboard       │
│ └─ If error → stay on login          │
└──────────────────────────────────────┘
```

---

## Security Checklist Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              SECURITY IMPLEMENTATION CHECKLIST               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ FRONTEND                                                     │
│ ✅ Separate login components                               │
│ ✅ No admin checkbox visible                               │
│ ✅ Role stored locally (UX only)                           │
│ ✅ Links between login types                               │
│ ✅ No sensitive data in localStorage                       │
│                                                               │
│ BACKEND API                                                 │
│ ✅ POST /api/auth/login validates role                     │
│ ✅ POST /api/auth/admin/login uses admin table             │
│ ✅ JWT includes role in payload                            │
│ ✅ Token signed with secret                                │
│ ✅ Audit logging on all attempts                           │
│                                                               │
│ MIDDLEWARE                                                  │
│ ✅ verifyAdminToken checks role                            │
│ ✅ verifyUserToken checks role                             │
│ ✅ Token expiry enforced                                   │
│ ✅ Signature validation required                           │
│ ✅ Requests without token rejected                         │
│                                                               │
│ DATABASE                                                    │
│ ✅ role column added to Users                              │
│ ✅ role ENUM constraint                                    │
│ ✅ Separate admin table                                    │
│ ✅ password hashing (bcrypt)                               │
│ ✅ Proper indexing on role/email                           │
│                                                               │
│ AUTHORIZATION                                               │
│ ✅ No role trust on frontend                               │
│ ✅ Backend validates role every request                    │
│ ✅ Admin endpoint rejects users                            │
│ ✅ User endpoint rejects admins                            │
│ ✅ JWT tampering prevented                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

These diagrams visualize the complete authentication architecture and security implementation.

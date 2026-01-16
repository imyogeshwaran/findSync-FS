# Testing Guide - Role-Based Authentication System

## Test Environment Setup

### Prerequisites
- Node.js running on port 3005 (backend)
- React running on port 5174 (frontend)
- MySQL database: `findsync`
- Migration applied: `add_role_to_users.sql`
- Test credentials ready

### Test Credentials

**User Account**
```
Email: test@example.com
Password: test123
Role: user (auto-set)
Location: Users table
```

**Admin Account**
```
Email: admin@example.com
Username: admin1
Password: admin_pass
Role: admin (from admin table)
Location: admin table
```

---

## Manual Testing with Postman

### Test 1: User Login - Valid Credentials

**Request**
```
POST http://localhost:3005/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123"
}
```

**Expected Response** (200 OK)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "firebase_uid": "user_firebase_id",
    "email": "test@example.com",
    "name": "Test User",
    "role": "user"
  }
}
```

**Validation**
- ✅ Response code is 200
- ✅ Token is present
- ✅ role field equals 'user'
- ✅ User data is correct

---

### Test 2: User Login - Invalid Password

**Request**
```
POST http://localhost:3005/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "wrongpassword"
}
```

**Expected Response** (401 Unauthorized)
```json
{
  "error": "Invalid email or password"
}
```

**Validation**
- ✅ Response code is 401
- ✅ Generic error message (no info leakage)
- ✅ User not informed which field is wrong

---

### Test 3: User Login with Admin Email (SECURITY TEST)

**Request**
```
POST http://localhost:3005/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_pass"
}
```

**Expected Response** (401 Unauthorized)
```json
{
  "error": "Invalid email or password"
}
```

**Validation** ✅ CRITICAL
- ✅ Response code is 401
- ✅ Admin cannot authenticate via user endpoint
- ✅ No token issued
- ✅ Admin account stays in admin table
- ✅ Check backend logs for: `[SECURITY] Attempted admin user login via regular endpoint`

---

### Test 4: Admin Login - Valid Credentials

**Request**
```
POST http://localhost:3005/api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_pass"
}
```

**Expected Response** (200 OK)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "admin_id": 10101,
    "username": "admin1",
    "email": "admin@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Validation**
- ✅ Response code is 200
- ✅ success flag is true
- ✅ Token is present
- ✅ Admin data is correct
- ✅ Note: No "role" field in token payload shown (but present in JWT)

---

### Test 5: Admin Login - Invalid Credentials

**Request**
```
POST http://localhost:3005/api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "wrongpassword"
}
```

**Expected Response** (401 Unauthorized)
```json
{
  "error": "Invalid admin credentials"
}
```

**Validation**
- ✅ Response code is 401
- ✅ Generic error message
- ✅ No token issued

---

### Test 6: Admin Login with User Email (SECURITY TEST)

**Request**
```
POST http://localhost:3005/api/auth/admin/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123"
}
```

**Expected Response** (401 Unauthorized)
```json
{
  "error": "Invalid admin credentials"
}
```

**Validation** ✅ CRITICAL
- ✅ Response code is 401
- ✅ User cannot authenticate via admin endpoint
- ✅ No token issued
- ✅ User account stays in Users table

---

### Test 7: Protected Endpoint - Admin with Valid Token

**Step 1: Get admin token** (from Test 4)
```
Copy the token from /api/auth/admin/login response
```

**Step 2: Access protected endpoint**
```
GET http://localhost:3005/api/admin/dashboard/stats
Authorization: Bearer <token_from_step_1>
```

**Expected Response** (200 OK)
```json
{
  "stats": {
    "totalUsers": 10,
    "totalItems": 50,
    "recentUsers": [...],
    "recentItems": [...]
  }
}
```

**Validation**
- ✅ Response code is 200
- ✅ Dashboard stats returned
- ✅ Data is valid

---

### Test 8: Protected Endpoint - User with User Token (SECURITY TEST)

**Step 1: Get user token** (from Test 1)
```
Copy the token from /api/auth/login response
```

**Step 2: Try to access admin endpoint**
```
GET http://localhost:3005/api/admin/dashboard/stats
Authorization: Bearer <token_from_step_1>
```

**Expected Response** (403 Forbidden)
```json
{
  "error": "Unauthorized - Admin access required"
}
```

**Validation** ✅ CRITICAL
- ✅ Response code is 403 (Forbidden)
- ✅ User token rejected
- ✅ Access denied
- ✅ Check logs for: `[AUTH] Unauthorized admin access attempt. Role: user, ID: 1`

---

### Test 9: Protected Endpoint - No Token (SECURITY TEST)

**Request**
```
GET http://localhost:3005/api/admin/dashboard/stats
```

**Expected Response** (401 Unauthorized)
```json
{
  "error": "No authentication token provided"
}
```

**Validation**
- ✅ Response code is 401
- ✅ Clear error message
- ✅ Access denied without token

---

### Test 10: Protected Endpoint - Invalid Token (SECURITY TEST)

**Request**
```
GET http://localhost:3005/api/admin/dashboard/stats
Authorization: Bearer invalid_token_12345
```

**Expected Response** (401 Unauthorized)
```json
{
  "error": "Invalid authentication token"
}
```

**Validation**
- ✅ Response code is 401
- ✅ Malformed token rejected
- ✅ Access denied

---

### Test 11: Protected Endpoint - Expired Token (SECURITY TEST)

**Step 1: Manually expire token**
```javascript
// In browser console or Postman:
const oldToken = localStorage.getItem('adminToken');
// Modify token by removing last few characters:
const expiredToken = oldToken.slice(0, -10) + 'corrupted';
```

**Step 2: Use expired/invalid token**
```
GET http://localhost:3005/api/admin/dashboard/stats
Authorization: Bearer <expired_token>
```

**Expected Response** (401 Unauthorized)
```json
{
  "error": "Invalid authentication token"
}
```

**Validation**
- ✅ Response code is 401
- ✅ Signature mismatch detected
- ✅ Access denied

---

### Test 12: Token JWT Payload Check

**Step 1: Get admin token**
```
From /api/auth/admin/login response
```

**Step 2: Decode at jwt.io** (test site only!)
```
Paste token into https://jwt.io
```

**Expected Payload**
```json
{
  "admin_id": 10101,
  "username": "admin1",
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1705363200,
  "exp": 1706054400
}
```

**Validation**
- ✅ role field equals 'admin'
- ✅ admin_id present
- ✅ exp (expiry) is 7 days from iat

**For User Token**
```json
{
  "id": 1,
  "firebase_uid": "user_id",
  "email": "test@example.com",
  "name": "Test User",
  "role": "user",
  "iat": 1705363200,
  "exp": 1706054400
}
```

**Validation**
- ✅ role field equals 'user'
- ✅ id (user_id) present
- ✅ firebase_uid present

---

## Frontend Testing

### Test 13: Navigate to /login

**Step 1: Open browser**
```
http://localhost:5174/login
```

**Expected**
- ✅ UserLoginForm component renders
- ✅ Email input visible
- ✅ Password input visible
- ✅ Google OAuth button visible
- ✅ "Go to admin login" link visible
- ✅ NO admin checkbox visible
- ✅ Title: "Login to your account"

**Validation**
- ✅ No admin options on user login
- ✅ UX clearly for users only

---

### Test 14: Navigate to /admin/login

**Step 1: Open browser**
```
http://localhost:5174/admin/login
```

**Expected**
- ✅ AdminLoginForm component renders
- ✅ Email input visible
- ✅ Password input visible
- ✅ "Go to user login" link visible
- ✅ Admin portal badge visible ("🔐 Admin Portal")
- ✅ Security notice visible
- ✅ NO Google OAuth button
- ✅ Title: "Admin Login"

**Validation**
- ✅ Clear admin interface
- ✅ Security emphasis
- ✅ No user options

---

### Test 15: User Login Flow - Frontend

**Steps**
1. Navigate to http://localhost:5174/login
2. Enter email: test@example.com
3. Enter password: test123
4. Click Login button

**Expected**
- ✅ Loading state visible
- ✅ Success message appears
- ✅ Redirects to /home after ~1 second
- ✅ Home component loads
- ✅ Token stored in localStorage
- ✅ userRole='user' stored

**Validation**
- ✅ Complete flow works
- ✅ State management correct
- ✅ Navigation works

---

### Test 16: Admin Login Flow - Frontend

**Steps**
1. Navigate to http://localhost:5174/admin/login
2. Enter email: admin@example.com
3. Enter password: admin_pass
4. Click "Access Admin Panel" button

**Expected**
- ✅ Loading state visible
- ✅ Success message appears
- ✅ Redirects to /admin/dashboard
- ✅ AdminDashboard component loads
- ✅ adminToken stored in localStorage
- ✅ userRole='admin' stored

**Validation**
- ✅ Complete flow works
- ✅ Admin dashboard displays
- ✅ Navigation works

---

### Test 17: Links Between Login Pages

**From /login:**
1. Click "Go to admin login" link
2. Should navigate to /admin/login
3. URL should change to /admin/login
4. AdminLoginForm should render

**From /admin/login:**
1. Click "Go to user login" link
2. Should navigate to /login
3. URL should change to /login
4. UserLoginForm should render

**Validation**
- ✅ Navigation works both directions
- ✅ Components load correctly
- ✅ URL updates

---

### Test 18: Browser LocalStorage Check

**Steps**
1. Log in as user
2. Open DevTools (F12)
3. Go to Application → Local Storage
4. Check localhost:5174

**Expected**
```
Key: userToken
Value: <jwt_token>

Key: userRole
Value: user

Key: userEmail
Value: test@example.com
```

**For Admin:**
```
Key: adminToken
Value: <jwt_token>

Key: adminEmail
Value: admin@example.com

Key: adminId
Value: 10101

Key: userRole
Value: admin
```

**Validation**
- ✅ Correct data stored
- ✅ Tokens present
- ✅ Role correctly stored

---

## Database Testing

### Test 19: Verify Users Table Schema

**Command**
```sql
DESCRIBE Users;
-- or
SHOW COLUMNS FROM Users;
```

**Expected Output**
```
| Field       | Type                    | Null | Key |
|-------------|-------------------------|------|-----|
| user_id     | int                     | NO   | PRI |
| email       | varchar(100)            | NO   | UNI |
| role        | enum('user','admin')    | NO   |     |
| ...other fields...
```

**Validation**
- ✅ role column exists
- ✅ Type is ENUM
- ✅ Default is 'user'
- ✅ NOT NULL constraint

---

### Test 20: Verify Role Assignment

**Command**
```sql
-- Check all user roles
SELECT user_id, email, role FROM Users;

-- Check if any admins in Users table
SELECT * FROM Users WHERE role = 'admin';

-- Should return: empty result set
```

**Expected**
- ✅ All Users have role='user'
- ✅ No users with role='admin'
- ✅ Admins only in admin table

**Validation**
- ✅ Correct role distribution
- ✅ No privilege escalation possible

---

### Test 21: Verify Admin Table

**Command**
```sql
DESCRIBE admin;
SELECT admin_id, email, username FROM admin;
```

**Expected**
- ✅ admin table exists
- ✅ Contains admin records
- ✅ Separate from Users table

---

## Automated Testing (Optional)

### Jest/Mocha Tests

**Test: User Login Rejection with Admin Email**
```javascript
describe('Authentication - Privilege Escalation Prevention', () => {
  test('should reject admin email on user login endpoint', async () => {
    const response = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin_pass'
      })
    });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Invalid email or password');
  });
});
```

**Test: User Token Rejected on Admin Endpoint**
```javascript
test('should reject user token on admin endpoint', async () => {
  // Get user token
  const loginResponse = await fetch('http://localhost:3005/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123'
    })
  });
  const { token } = await loginResponse.json();
  
  // Try to access admin endpoint
  const response = await fetch(
    'http://localhost:3005/api/admin/dashboard/stats',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toContain('Admin access required');
});
```

---

## Security Testing Checklist

- [ ] Test 1: User login works
- [ ] Test 2: User login fails with wrong password
- [ ] Test 3: Admin email rejected on user login ✅ CRITICAL
- [ ] Test 4: Admin login works
- [ ] Test 5: Admin login fails with wrong password
- [ ] Test 6: User email rejected on admin login ✅ CRITICAL
- [ ] Test 7: Admin accesses protected endpoint ✓
- [ ] Test 8: User rejected from admin endpoint ✅ CRITICAL
- [ ] Test 9: No token rejected
- [ ] Test 10: Invalid token rejected
- [ ] Test 11: Expired token rejected
- [ ] Test 12: JWT payload contains correct role
- [ ] Test 13: /login shows user form only
- [ ] Test 14: /admin/login shows admin form only
- [ ] Test 15: User login flow works
- [ ] Test 16: Admin login flow works
- [ ] Test 17: Navigation links work
- [ ] Test 18: LocalStorage has correct data
- [ ] Test 19: Database schema correct
- [ ] Test 20: Role assignment correct
- [ ] Test 21: Admin table intact

---

## Performance Testing

### Load Test User Login
```bash
# Using Apache Bench (ab)
ab -n 1000 -c 10 \
  -p login.json \
  -T application/json \
  http://localhost:3005/api/auth/login
```

**Expected**
- ✅ Handles 100+ requests/sec
- ✅ < 200ms response time
- ✅ No memory leaks

---

## Regression Testing

After updates, re-run:
1. All security tests (3, 6, 8, 10, 11)
2. All endpoint tests (1-12)
3. Frontend routing tests (13-17)
4. Database tests (19-21)

**Document**: Any deviations from expected results

---

## Test Report Template

```
Test Date: 2026-01-16
Tester: [Name]
Environment: Development

RESULTS:
┌─────────────────────┬──────────┬──────────┐
│ Test Name           │ Expected │ Actual   │
├─────────────────────┼──────────┼──────────┤
│ Test 1: User Login  │ 200 OK   │ 200 OK   │
│ Test 3: Admin Email │ 401 Unau │ 401 Unau │
│ ... (add all tests) │          │          │
└─────────────────────┴──────────┴──────────┘

SECURITY TESTS: All Passed ✅
FUNCTIONALITY TESTS: All Passed ✅
PERFORMANCE: Acceptable ✅

ISSUES: None
RECOMMENDATIONS: None
```

---

This testing guide ensures comprehensive validation of the authentication system before production deployment.

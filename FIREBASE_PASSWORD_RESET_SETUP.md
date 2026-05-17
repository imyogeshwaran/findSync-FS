# Forgot Password Feature - Firebase & Database Integration

## 🔴 ISSUE FOUND & FIXED

### Problem
When a user reset their password using the forgot password feature (OTP flow), the password was being updated **ONLY** in the MySQL database, but **NOT** in Firebase Auth. This created a security issue where:
- User could still log in with their old Firebase password
- Database password and Firebase Auth password were out of sync
- Password reset didn't fully work for all authentication methods

### Solution
The system has been updated to synchronously update passwords in **BOTH**:
1. ✅ **Firebase Auth** - The authentication provider
2. ✅ **MySQL Database** - The application database

---

## 🚀 Setup Instructions

### Step 1: Get Firebase Service Account Credentials

#### Option A: Using Service Account JSON File (RECOMMENDED)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project → Project Settings ⚙️
3. Go to **Service Accounts** tab
4. Click **"Generate New Private Key"** button
5. A JSON file will download - Save this file as `server/config/serviceAccount.json`

#### Option B: Using Environment Variables

1. Same steps 1-3 above, but copy the values instead:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

---

### Step 2: Configure Environment Variables

#### If using Service Account File:
```bash
# server/.env
FIREBASE_SERVICE_ACCOUNT_FILE=./config/serviceAccount.json
```

#### If using Individual Environment Variables:
```bash
# server/.env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIB... (paste the entire key with \n for newlines)
```

#### Or use Default Credentials:
```bash
# server/.env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
```

---

### Step 3: Restart the Server

```bash
cd server
npm start
# Or if using nodemon
npm run dev
```

The server will automatically initialize Firebase Admin on startup and log the status.

---

## 🔍 Testing the Complete Flow

### Method 1: Using the Interactive Debug Tool

```bash
cd server
node debug-forgot-password-flow.js
```

Then select option **5 - Full E2E Test**

### Method 2: Manual Testing

#### 1. Request OTP
```bash
curl -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

Check the response:
```json
{
  "success": true,
  "message": "OTP sent successfully to user@example.com"
}
```

#### 2. Verify OTP

Get the OTP from server console (in dev mode) or your email, then:

```bash
curl -X POST http://localhost:3005/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","otp":"123456"}'
```

#### 3. Reset Password

```bash
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","newPassword":"NewPassword123"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Password reset successfully. You can now log in with your new password.",
  "details": {
    "databaseUpdated": true,
    "firebaseUpdated": true
  }
}
```

---

## 📊 Server Console Output

When the password reset completes successfully, you should see detailed logs:

```
============================================================
🔍 [PASSWORD RESET] Starting password reset process
📧 Email: user@example.com
🔐 New Password Length: 14 characters
⏰ Timestamp: 2024-01-15T10:30:00.000Z
============================================================

📊 Step 1 - Checking OTP verification status...
✓ OTP is verified

👤 Step 2 - Checking if user exists and fetching Firebase UID...
✓ User found
  - User ID: 42
  - Firebase UID: ✓ FOUND

🔐 Step 3 - Hashing new password...
✓ Password hashed successfully
  - Hash Length: 60 characters

🔥 Step 4 - Updating password in Firebase Auth...
  - Attempting to initialize Firebase Admin...
  - Updating Firebase Auth for UID: abc123xyz789
✓ Firebase Auth password updated successfully

💾 Step 5 - Updating password in database...
✓ Password updated in database
  - Affected Rows: 1
  - Changed Rows: 1

🧹 Step 6 - Cleaning up OTP record...
✓ OTP record deleted
  - Affected Rows: 1

============================================================
✅ PASSWORD RESET COMPLETED SUCCESSFULLY
   Password updated in BOTH Firebase Auth and Database ✓
============================================================
```

---

## ✅ Verification Steps

### 1. Check Server Logs
When you run `npm start`, you should see:
```
🔥 [FIREBASE ADMIN INIT] Starting initialization
...
✅ Firebase Admin SDK initialized successfully
```

### 2. Test Password Reset
- Use the client app to go through forgot password flow
- Check server console for step-by-step execution
- Confirm both database AND firebase updates show success

### 3. Verify in Firebase Console
After resetting a password:
1. Go to Firebase Console → Authentication
2. Find the user
3. Note the password last changed timestamp
4. It should be very recent

### 4. Verify in MySQL Database
```sql
-- Check the password hash was updated
SELECT user_id, email, password, updated_at FROM Users 
WHERE email = 'user@example.com';

-- Check the OTP record was deleted
SELECT * FROM password_reset_otp 
WHERE email = 'user@example.com';
-- Should return: (empty result)
```

---

## ⚠️ Troubleshooting

### Issue: "Firebase Admin SDK initialization failed"

**Solution:** Check your environment variables:
```bash
# server/.env
cat server/.env | grep FIREBASE
```

Make sure one of these is set:
- `FIREBASE_SERVICE_ACCOUNT_FILE`
- `FIREBASE_PROJECT_ID` + `FIREBASE_PRIVATE_KEY` + `FIREBASE_CLIENT_EMAIL`
- `GOOGLE_APPLICATION_CREDENTIALS`

### Issue: "Failed to update password in Firebase Auth"

**Possible Causes:**
1. Service account doesn't have permission
2. Firebase UID is incorrect/missing
3. Password doesn't meet Firebase requirements (min 6 chars)

**Solution:**
1. Verify service account has "Editor" role in Firebase
2. Check that `firebase_uid` column is populated in Users table
3. Ensure password is at least 6 characters

### Issue: "User not found in Firebase"

**Cause:** The firebase_uid in the database doesn't match any user in Firebase

**Solution:**
1. Check if firebase_uid is NULL in database
2. If NULL, user may not have completed Firebase signup
3. Update the user's firebase_uid in database manually

### Issue: Firebase update fails but database updates successfully

**This is expected behavior:**
- Database password update is the primary operation
- Firebase update is the secondary operation
- If Firebase fails, user can still log in with the new password in the app

**Server logs will show:**
```
⚠️ Warning - Firebase Auth update failed
   Error: ...
   The password WILL be updated in the database, but not in Firebase Auth
```

---

## 📋 Files Modified/Created

### New Files:
- `server/config/firebaseAdmin.js` - Firebase Admin initialization module

### Modified Files:
- `server/services/otpService.js` - Updated `resetPassword()` function to sync both Firebase Auth and database

### Environment Configuration:
- `.env` - Add Firebase credentials

---

## 🔐 Security Notes

1. **Service Account File**: Keep `server/config/serviceAccount.json` out of version control (add to `.gitignore`)
2. **Private Keys**: Never commit `.env` file with sensitive keys
3. **Permissions**: Firebase service account should only have necessary permissions
4. **Password Requirements**: Enforced at multiple levels:
   - Client: Minimum 6 characters
   - Server: Minimum 6 characters
   - Firebase: Default minimum 6 characters

---

## 📞 Support

If password reset still doesn't work:

1. Run the debug tool:
   ```bash
   cd server && node debug-forgot-password-flow.js
   ```

2. Check server console for detailed error messages

3. Verify:
   - Firebase credentials are correct
   - User exists in both Firebase and MySQL
   - Network connectivity to Firebase servers

4. Check the logs in `server/` directory if available

---

## 🎯 Summary

✅ **What's Fixed:**
- Passwords now update in **BOTH** Firebase Auth and MySQL Database
- Comprehensive logging for debugging
- Graceful fallback if Firebase update fails
- User can always log in after password reset

✅ **What You Need to Do:**
1. Add Firebase credentials to `.env` or service account file
2. Restart the server
3. Test the forgot password flow
4. Verify in Firebase Console and MySQL

✅ **Flow Now Works Like This:**
1. User requests OTP → Email sent ✓
2. User enters OTP → OTP verified ✓
3. User enters new password → **BOTH** Firebase Auth AND Database updated ✓
4. User can log in with new password ✓

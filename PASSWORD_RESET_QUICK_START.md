# 🚀 QUICK START - PASSWORD RESET FIX

## ✅ What Was Fixed

Your forgot password feature now updates passwords in **BOTH**:
- ✓ Firebase Authentication
- ✓ MySQL Database

Previously, only the database was being updated, which is why the password change might not have worked properly.

---

## 🎯 3 Simple Steps to Enable

### Step 1️⃣: Get Firebase Credentials (5 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click your project
3. Settings ⚙️ → **Service Accounts** tab
4. Click **"Generate New Private Key"**
5. Save the downloaded JSON file as: `server/config/serviceAccount.json`

### Step 2️⃣: Update `.env` File

Add this line to `server/.env`:

```
FIREBASE_SERVICE_ACCOUNT_FILE=./config/serviceAccount.json
```

**OR** if you prefer individual variables, add these instead:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIB...(paste full key)
```

### Step 3️⃣: Restart Server & Test

```bash
cd server
npm start  # or npm run dev
```

Then check it worked:

```bash
node verify-firebase-setup.js
```

You should see: **✓ ALL CHECKS PASSED**

---

## 🧪 Test It Now

### Using the Client App:
1. Go to login page
2. Click "Forgot password?"
3. Enter your email
4. Check your email (or server console in dev mode) for OTP
5. Enter OTP
6. Set new password
7. Try logging in with new password ✓

### Using curl (command line):
```bash
# 1. Request OTP
curl -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'

# 2. Verify OTP (get code from email/console)
curl -X POST http://localhost:3005/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","otp":"123456"}'

# 3. Reset Password
curl -X POST http://localhost:3005/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","newPassword":"NewPassword123"}'
```

---

## 📊 What Happens Now (Step by Step)

### When User Resets Password:

```
1. User enters email
   ↓
2. OTP sent to email ✓
   ↓
3. User verifies OTP ✓
   ↓
4. User enters new password
   ↓
5. PASSWORD UPDATED IN FIREBASE AUTH ✓ (NEW!)
   ↓
6. PASSWORD UPDATED IN DATABASE ✓
   ↓
7. OTP record deleted ✓
   ↓
8. User logs in with new password ✓
```

---

## 🔍 Verify It's Working

### Check Server Logs

When password is reset, you should see:

```
✓ OTP is verified
✓ User found
✓ Password hashed successfully
✓ Firebase Auth password updated successfully ← NEW!
✓ Password updated in database
✓ OTP record deleted
✅ PASSWORD RESET COMPLETED SUCCESSFULLY
   Password updated in BOTH Firebase Auth and Database ✓
```

### Verify in Firebase Console

1. Go to Firebase Console
2. Authentication → Users
3. Find your test user
4. Click the user
5. You should see the password last changed timestamp is recent

---

## ⚠️ If Something Goes Wrong

### Problem: Firebase credentials not working

```bash
# Run this to check:
cd server
node verify-firebase-setup.js
```

If it fails:
1. Make sure `server/config/serviceAccount.json` exists
2. Check `.env` has the right path
3. Make sure the JSON file is valid (not corrupted)

### Problem: Still seeing old password works

Could be a browser cache issue:
1. Clear browser cookies/cache for the app domain
2. Try from a private/incognito window
3. Log out from Firebase: Use logout button in app
4. Try logging in again with new password

### Problem: "User not found in Firebase"

Means the user doesn't have a firebase_uid:
1. Check database: `SELECT firebase_uid FROM Users WHERE email='your@email.com';`
2. If NULL, user might not have completed Firebase signup
3. You can manually set it or delete and re-signup

---

## 📚 Files Changed/Created

**Created:**
- `server/config/firebaseAdmin.js` - Firebase Admin SDK wrapper
- `server/verify-firebase-setup.js` - Verification script
- `FIREBASE_PASSWORD_RESET_SETUP.md` - Detailed setup guide (in project root)

**Modified:**
- `server/services/otpService.js` - Now updates Firebase Auth too

**Config:**
- `server/.env` - Add Firebase credentials

---

## 🎓 How It Works (For Developers)

1. **User resets password** → Calls `/api/auth/reset-password`
2. **Server validates** → Checks OTP is verified, user exists
3. **Database password updated** → Hashed and stored
4. **Firebase Auth updated** → Uses Firebase Admin SDK to update user password
5. **OTP record deleted** → Clean up
6. **Response sent to client** → Includes status of both updates

If Firebase update fails, database update still completes (fallback behavior).

---

## 🔐 Security Checklist

- [ ] Service account file is in `.gitignore` (don't commit!)
- [ ] `.env` file is in `.gitignore` (don't commit!)
- [ ] Service account has proper permissions (Editor role)
- [ ] Passwords are at least 6 characters
- [ ] HTTPS is used in production

---

## 💡 Next Steps

1. ✅ Follow the 3 steps above
2. ✅ Run verification script
3. ✅ Test the forgot password flow
4. ✅ Check both database and Firebase are updated
5. ✅ You're done! 🎉

---

## 📞 Need More Help?

1. **Detailed guide**: Read `FIREBASE_PASSWORD_RESET_SETUP.md`
2. **Run debug tool**: `cd server && node debug-forgot-password-flow.js`
3. **Check logs**: Server console shows detailed step-by-step logs
4. **Verify setup**: `cd server && node verify-firebase-setup.js`

---

**Everything should now work! 🎊**

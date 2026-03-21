# Quick Start: Forgot Password Feature

## What Was Done
✅ Added "Forgot password?" link next to password field on login page
✅ Created professional OTP verification modal
✅ Set up backend API for OTP generation, verification, and password reset
✅ Created database table for OTP storage
✅ Integrated email sending via Gmail

## To Get It Working - 3 Simple Steps

### Step 1: Set Up Gmail (Do This First)
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" → "Windows Computer"
3. Generate an app password (you'll get 16 characters)
4. Open `server/.env` and update:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

### Step 2: Start the Servers
```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

### Step 3: Test It
1. Go to login page
2. Click "Forgot password?" (near password field)
3. Enter your email
4. Check your email for 6-digit OTP
5. Enter OTP in modal
6. Enter new password
7. Done! Password is updated

## What Happens Behind the Scenes
1. **User enters email** → Backend validates email exists
2. **OTP sent** → 6-digit code generated and emailed (valid 10 min)
3. **User verifies OTP** → Backend marks OTP as verified
4. **User enters password** → Backend hashes password and updates database
5. **Success** → OTP is deleted, user can login with new password

## Testing Without Email Setup
For quick testing without Gmail:
1. Check console logs - OTP is printed there
2. Or check database: `SELECT * FROM password_reset_otp;`
3. Use that OTP in the modal

## Modal Features
- Beautiful dark theme matching your design
- 3-step workflow with clear progress
- Real-time validation (OTP must be 6 digits)
- Error messages for invalid inputs
- Auto-close on success
- All fields reset when modal closes

## Security Built In
- OTP expires after 10 minutes
- Cannot reuse same OTP
- Password must be 6+ characters
- Only registered users can reset
- Passwords are hashed with bcrypt

## If It Doesn't Work
Check:
1. Is backend running? (should see: Server running on port 3005)
2. Is Gmail configured? Check `server/.env`
3. Is OTP table created? Run: `node server/setup-otp-table.js`

## File Locations
- Login component: `client/src/components/UserLoginForm.jsx`
- API functions: `client/src/services/api.js`
- Backend endpoints: `server/routes/authRoutes.js`
- OTP logic: `server/services/otpService.js`
- Guide: `FORGOT_PASSWORD_GUIDE.md`

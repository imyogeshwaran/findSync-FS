# Forgot Password with OTP Implementation Guide

## Overview
This guide explains the complete implementation of the forgot password feature with OTP verification and password reset functionality.

## Features Implemented
1. **Forgot Password Link**: Located next to the password field on the login page
2. **OTP Generation**: 6-digit OTP sent to user's email
3. **OTP Verification**: User enters the OTP received via email
4. **Password Reset**: User sets a new password after OTP verification
5. **Professional UI**: Modal dialog with smooth workflow

## File Structure

### Client Files Modified/Created
- `client/src/components/UserLoginForm.jsx` - Updated login form with forgot password modal
- `client/src/services/api.js` - Added OTP API functions

### Server Files Modified/Created
- `server/routes/authRoutes.js` - Added password reset endpoints
- `server/services/otpService.js` - OTP generation and verification logic
- `server/setup-otp-table.js` - Database setup script
- `server/config/add_otp_table.sql` - SQL migration file

## Setup Instructions

### Step 1: Configure Gmail (One-time Setup)

1. Go to your Gmail account: https://myaccount.google.com
2. Enable 2-Factor Authentication if not already enabled
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Select "Mail" and "Windows Computer"
5. Generate an app password (16-character password)
6. Update `server/.env` file:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

### Step 2: Database Setup

The OTP table has been automatically created. Verify by checking:
```sql
DESCRIBE password_reset_otp;
```

### Step 3: Test the Implementation

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the client:
   ```bash
   cd client
   npm run dev
   ```

3. On the login page, click "Forgot password?" near the password field

4. Enter your registered email address

5. Check your email for the 6-digit OTP

6. Enter the OTP on the modal

7. Enter a new password (minimum 6 characters)

## API Endpoints

### POST /api/auth/forgot-password
Sends OTP to the user's email
```json
Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "If email exists, OTP will be sent"
}
```

### POST /api/auth/verify-otp
Verifies the OTP entered by the user
```json
Request:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "OTP verified successfully"
}
```

### POST /api/auth/reset-password
Resets the password after OTP verification
```json
Request:
{
  "email": "user@example.com",
  "newPassword": "newpassword123"
}

Response:
{
  "success": true,
  "message": "Password reset successfully"
}
```

## Database Schema

### password_reset_otp Table
```sql
- id: INT (Primary Key)
- email: VARCHAR(255) (UNIQUE)
- otp: VARCHAR(10)
- verified: BOOLEAN (default: false)
- expires_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Security Features
- OTP expires after 10 minutes
- OTP is exactly 6 digits
- Password must be at least 6 characters
- Email verification ensures only registered users can reset
- OTP marked as verified before password update
- OTP deleted after successful password reset

## User Flow

```
1. User clicks "Forgot password?" link
   ↓
2. Modal opens with email input
   ↓
3. User enters email → Backend validates & sends OTP
   ↓
4. User enters 6-digit OTP → Backend verifies
   ↓
5. User enters new password → Backend updates and deletes OTP
   ↓
6. Success message and modal closes
```

## Troubleshooting

### Gmail not sending emails
- Verify GMAIL_USER and GMAIL_PASSWORD in .env
- Allow "Less secure app access" if using regular Gmail password
- Use App Password for security (recommended)
- Check Gmail activity for blocked attempts

### OTP not received
- Check spam/junk folder
- Verify email address is correct
- Wait a few seconds (network delay)
- Try requesting a new OTP

### Password reset fails
- Ensure OTP was verified first
- Check password meets minimum length (6 characters)
- Verify email matches user's registered email
- Check database connectivity

## Development Notes
- OTP is logged in console for development (remove in production)
- All errors are user-friendly and don't expose system details
- Modal resets all fields when closed
- Success messages auto-dismiss after 2 seconds
- All timestamps use server time for consistency

## Future Enhancements
- Add SMS OTP option
- Add rate limiting to prevent abuse
- Add OTP resend functionality
- Add progress indicator for step indication
- Add password strength validator
- Add biometric authentication option

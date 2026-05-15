@echo off
REM Quick Start Guide - Test Forgot Password OTP Fix (Windows)

echo.
echo ======================================================================
echo          FORGOT PASSWORD OTP - QUICK START TESTING GUIDE
echo ======================================================================
echo.

echo.
echo ==== FIXES APPLIED ====
echo    1. Removed development mode email skip
echo    2. Added comprehensive debugging
echo    3. Created interactive debug tool
echo    4. Created troubleshooting guide
echo.

echo.
echo ======================================================================
echo STEP 1: RUN THE INTERACTIVE DEBUGGER (EASIEST)
echo ======================================================================
echo.
echo This is the EASIEST way to test and identify issues.
echo.
echo Run these commands:
echo   cd server
echo   node debug-forgot-password-flow.js
echo.
echo This will show you:
echo   - Check environment configuration
echo   - Test Gmail connection
echo   - Test database connection
echo   - Run full end-to-end test
echo   - View OTP records
echo   - Troubleshooting guide
echo.
pause

echo.
echo ======================================================================
echo STEP 2: VERIFY GMAIL CREDENTIALS (CRITICAL!)
echo ======================================================================
echo.
echo Your Gmail password MUST be an App Password, not your regular password
echo.
echo Check your .env file:
echo   Open: server\.env
echo.
echo Expected format:
echo   GMAIL_USER=noreplyrtx001@gmail.com
echo   GMAIL_PASSWORD=eibk klnu avsz abim  (with SPACES)
echo.
echo If not correct, follow this:
echo   1. Go to: https://myaccount.google.com/apppasswords
echo   2. Select App: Mail
echo   3. Select Device: Windows Computer
echo   4. Copy the generated password (with spaces)
echo   5. Update .env file
echo.
pause

echo.
echo ======================================================================
echo STEP 3: TEST ENVIRONMENT
echo ======================================================================
echo.
echo Option A - Run Interactive Debugger (RECOMMENDED):
echo   cd server
echo   node debug-forgot-password-flow.js
echo.
echo Option B - Start Server and Check Logs:
echo   Terminal 1: cd server ^&^& node server.js
echo.
echo   Terminal 2: 
echo   curl -X POST http://localhost:3005/api/auth/forgot-password ^
echo     -H "Content-Type: application/json" ^
echo     -d "{\"email\":\"testuser@example.com\"}"
echo.
echo   Check Terminal 1 for detailed logs starting with:
echo   [OTP SEND] Starting OTP generation
echo.
pause

echo.
echo ======================================================================
echo STEP 4: VERIFY OTP IN DATABASE
echo ======================================================================
echo.
echo Check if OTP was stored:
echo   mysql -u root -p findsync -e "SELECT * FROM password_reset_otp;"
echo.
echo View OTP for specific email:
echo   mysql -u root -p findsync -e "SELECT email, otp, expires_at FROM password_reset_otp WHERE email='testuser@example.com';"
echo.
pause

echo.
echo ======================================================================
echo TROUBLESHOOTING
echo ======================================================================
echo.
echo If OTP is not being sent:
echo.
echo 1. Gmail credentials incorrect in .env
echo    - Check: GMAIL_USER and GMAIL_PASSWORD
echo.
echo 2. App Password format wrong
echo    - Must have spaces: "eibk klnu avsz abim" NOT "eibkklnuavszabim"
echo.
echo 3. Database not running
echo    - Start MySQL service
echo.
echo 4. OTP table not created
echo    - Run: node server/setup-otp-table.js
echo.
echo Read detailed guide: FORGOT_PASSWORD_DEBUG_GUIDE.md
echo.
pause

echo.
echo ======================================================================
echo QUICK REFERENCE COMMANDS
echo ======================================================================
echo.
echo Start debug tool:
echo   cd server ^&^& node debug-forgot-password-flow.js
echo.
echo Start server:
echo   cd server ^&^& node server.js
echo.
echo Test Gmail config:
echo   cd server ^&^& node test-gmail-config.js
echo.
echo Check environment:
echo   type server\.env
echo.
echo View OTP records:
echo   mysql -u root -p findsync -e "SELECT * FROM password_reset_otp;"
echo.
echo Delete old OTP records:
echo   mysql -u root -p findsync -e "DELETE FROM password_reset_otp WHERE expires_at ^< NOW();"
echo.
pause

echo.
echo ======================================================================
echo DOCUMENTS CREATED
echo ======================================================================
echo.
echo Read these files for detailed information:
echo   1. FORGOT_PASSWORD_FIX_SUMMARY.md
echo   2. FORGOT_PASSWORD_DEBUG_GUIDE.md
echo   3. TEST_FORGOT_PASSWORD_FIX.sh (this file)
echo.
echo ======================================================================
echo.
echo READY TO TEST?
echo.
echo Run this command:
echo   cd server ^&^& node debug-forgot-password-flow.js
echo.
echo ======================================================================
echo.
pause

@echo off
REM Quick Diagnostic Script for FindSync Forgot Password Feature

echo ================================================
echo   FindSync - Forgot Password Diagnostic
echo ================================================
echo.

setlocal enabledelayedexpansion

REM Check if we're in the right directory
if not exist "server" (
    echo ERROR: Run this from the findSync root directory
    echo.
    echo cd C:\Users\R.Subash\Downloads\findSync
    echo diagnostic.bat
    echo.
    pause
    exit /b 1
)

REM Color codes
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set RESET=[0m

echo 1. Checking Node.js and npm...
node --version >nul 2>&1 && (
    echo [OK] Node.js installed
) || (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
)

npm --version >nul 2>&1 && (
    echo [OK] npm installed
) || (
    echo [ERROR] npm not found
)

echo.
echo 2. Checking file structure...

if exist "server" echo [OK] server folder exists
if exist "client" echo [OK] client folder exists
if exist "server\services\otpService.js" echo [OK] OTP Service exists
if exist "server\routes\authRoutes.js" echo [OK] Auth Routes exist
if exist "client\src\components\UserLoginForm.jsx" echo [OK] Login Form exists
if exist "server\.env" echo [OK] .env file exists

echo.
echo 3. Checking port availability...

netstat -ano | find ":3005" >nul 2>&1 && (
    echo [RUNNING] Backend on port 3005
) || (
    echo [STOPPED] Backend NOT running on port 3005
)

netstat -ano | find ":5174" >nul 2>&1 && (
    echo [RUNNING] Frontend on port 5174
) || (
    echo [STOPPED] Frontend NOT running on port 5174
)

echo.
echo 4. Running system verification...
echo.

cd server
node verify-system.js 2>&1 | findstr /R "^✅^❌^⚠️"

echo.
echo ================================================
echo 5. Quick Start Options
echo ================================================
echo.
echo [A] Run full system verification
echo [B] Start both servers
echo [C] Test OTP flow
echo [D] Setup OTP table
echo [E] Just show this info
echo.

set /p choice="Choose option (A-E): "

if /i "%choice%"=="A" (
    node verify-system.js
) else if /i "%choice%"=="B" (
    echo Starting servers...
    start "Backend" cmd /k "npm start"
    cd ..\client
    start "Frontend" cmd /k "npm run dev"
    echo.
    echo Two windows opened. Wait 15 seconds for servers to start.
    echo Then visit: http://localhost:5174
) else if /i "%choice%"=="C" (
    node test-otp-flow.js
) else if /i "%choice%"=="D" (
    node setup-otp-table.js
) else (
    echo Done.
)

echo.
pause

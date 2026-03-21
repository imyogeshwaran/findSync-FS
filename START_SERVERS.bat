@echo off
REM FindSync - Automatic Startup Script
REM This script starts both backend and frontend servers

setlocal enabledelayedexpansion

echo ====================================================
echo.
echo  ^|  FindSync - Automatic Server Startup
echo.
echo ====================================================
echo.

cd /d "%~dp0"

REM Check if in correct directory
if not exist server\ (
    echo ❌ Error: server folder not found
    echo Make sure you run this from the findSync root directory
    pause
    exit /b 1
)

if not exist client\ (
    echo ❌ Error: client folder not found
    echo Make sure you run this from the findSync root directory
    pause
    exit /b 1
)

echo.
echo 📋 Pre-startup Checks:
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
) else (
    echo ✅ Node.js: %NODE_VERSION%
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo ✅ npm: !NPM_VERSION!
)

REM Check MySQL
mysql --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  MySQL not found (you need to start it manually)
) else (
    echo ✅ MySQL found
)

echo.
echo ====================================================
echo 🔧 Starting Servers...
echo ====================================================
echo.

REM Start backend in new window
echo.
echo 🖥️  Starting Backend Server (Port 3005)...
echo ────────────────────────────────────
start "FindSync - Backend" cmd /k "cd /d "%~dp0server" && npm start"

timeout /t 3 /nobreak

REM Start frontend in new window
echo.
echo 🖥️  Starting Frontend Server (Port 5174)...
echo ────────────────────────────────────
start "FindSync - Frontend" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo ====================================================
echo ✅ Servers Starting...
echo ====================================================
echo.
echo ⏳ Waiting for servers to start (15 seconds)...
echo.

timeout /t 15

echo.
echo ====================================================
echo 🎉 Startup Complete!
echo ====================================================
echo.
echo 📌 Access Points:
echo  • Frontend: http://localhost:5174
echo  • Backend API: http://localhost:3005/api
echo.
echo 🧪 To test Forgot Password:
echo  1. Go to http://localhost:5174
echo  2. Click "Forgot password?" link
echo  3. Enter your registered email
echo  4. Check Backend Server console for OTP
echo  5. Enter OTP and new password
echo.
echo 📝 Logs:
echo  • Backend logs: findSync - Backend window  
echo  • Frontend logs: findSync - Frontend window
echo.
echo ====================================================
echo.

echo Keeping this window open for reference...
echo(
echo Note: Two new windows opened with running servers.
echo Close any window to stop that server.
echo.

pause

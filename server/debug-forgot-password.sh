#!/bin/bash
# Comprehensive Debug and Testing Script for Forgot Password Feature

echo "=================================================="
echo "🔍 FindSync Forgot Password - Debug Script v1"
echo "=================================================="
echo ""

# Check if servers are running
echo "📌 Checking if servers are running..."
echo ""

# Check backend
echo "Checking backend (Port 3005)..."
curl -s http://localhost:3005/api/items 2>/dev/null > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Backend is running on port 3005"
else
  echo "❌ Backend is NOT running on port 3005"
  echo "   Solution: cd server && npm start"
fi

echo ""

# Check frontend  
echo "Checking frontend (Port 5174)..."
curl -s http://localhost:5174 2>/dev/null > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Frontend is running on port 5174"
else
  echo "❌ Frontend is NOT running on port 5174"
  echo "   Solution: cd client && npm run dev"
fi

echo ""
echo "=================================================="
echo "🧪 Testing Forgot Password API Endpoints"
echo "=================================================="
echo ""

TEST_EMAIL="itsyogeshwaran11@gmail.com"

# Test 1: Request OTP
echo "Test 1️⃣ : Request OTP for $TEST_EMAIL"
echo "Endpoint: POST http://localhost:3005/api/auth/forgot-password"
echo ""
RESPONSE=$(curl -s -X POST http://localhost:3005/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\"}")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Extract OTP if available
OTP=$(echo "$RESPONSE" | grep -oP '"otp":"?\K[^"]*' 2>/dev/null)
if [ -n "$OTP" ]; then
  echo "✅ OTP extracted: $OTP"
  echo ""
  
  # Test 2: Verify OTP
  echo "Test 2️⃣ : Verify OTP"
  echo "Endpoint: POST http://localhost:3005/api/auth/verify-otp"
  echo ""
  VERIFY_RESPONSE=$(curl -s -X POST http://localhost:3005/api/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"otp\":\"$OTP\"}")
  
  echo "Response:"
  echo "$VERIFY_RESPONSE" | jq . 2>/dev/null || echo "$VERIFY_RESPONSE"
  echo ""
  
  # Test 3: Reset Password
  echo "Test 3️⃣ : Reset Password"
  echo "Endpoint: POST http://localhost:3005/api/auth/reset-password"
  echo ""
  RESET_RESPONSE=$(curl -s -X POST http://localhost:3005/api/auth/reset-password \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"newPassword\":\"Test@123\"}")
  
  echo "Response:"
  echo "$RESET_RESPONSE" | jq . 2>/dev/null || echo "$RESET_RESPONSE"
  echo ""
  echo "✅ Full OTP flow tested!"
else
  echo "❌ Could not extract OTP from response"
  echo "   Make sure backend is running and configured correctly"
fi

echo ""
echo "=================================================="
echo "✅ Debug script completed"
echo "=================================================="

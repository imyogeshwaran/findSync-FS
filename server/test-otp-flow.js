const db = require('./config/database');
const otpService = require('./services/otpService');
require('dotenv').config();

const testOTPFlow = async () => {
  try {
    console.log('🧪 Testing OTP Flow (Development Mode)\n');
    console.log('='.repeat(50));
    
    const testEmail = 'itsyogeshwaran11@gmail.com';
    
    // Step 1: Send OTP
    console.log('\n📌 Step 1: Requesting OTP...');
    const otpResult = await otpService.sendOTP(testEmail);
    console.log('Result:', otpResult);
    
    // Get the OTP from database
    const [rows] = await db.query(
      'SELECT otp, expires_at FROM password_reset_otp WHERE email = ?',
      [testEmail]
    );
    
    if (rows && rows.length > 0) {
      const testOTP = rows[0].otp;
      console.log(`\n✅ OTP Generated: ${testOTP}`);
      
      // Step 2: Verify OTP
      console.log('\n📌 Step 2: Verifying OTP...');
      const verifyResult = await otpService.verifyOTP(testEmail, testOTP);
      console.log('Result:', verifyResult);
      
      // Step 3: Reset Password
      console.log('\n📌 Step 3: Resetting Password...');
      const resetResult = await otpService.resetPassword(testEmail, 'newPassword123');
      console.log('Result:', resetResult);
      
      console.log('\n' + '='.repeat(50));
      console.log('✅ Full OTP Flow Test Completed Successfully!\n');
    } else {
      console.log('❌ OTP not found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

testOTPFlow();

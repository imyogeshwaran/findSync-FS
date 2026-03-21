const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('Testing Gmail configuration...');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_PASSWORD length:', process.env.GMAIL_PASSWORD?.length);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail connection error:', error);
    console.error('\nMake sure:');
    console.error('1. Gmail account has 2FA enabled');
    console.error('2. App password is generated from https://myaccount.google.com/apppasswords');
    console.error('3. App password is set in .env file (should be 16 characters with spaces)');
    process.exit(1);
  } else {
    console.log('✅ Gmail SMTP server is ready');
    
    // Try sending a test email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: 'FindSync OTP Test',
      text: 'This is a test email for OTP functionality. OTP: 123456'
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Error sending test email:', error);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        process.exit(0);
      }
    });
  }
});

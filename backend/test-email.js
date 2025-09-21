const { sendMail } = require('./utils/mailer');
require('dotenv').config();

async function sendTestEmail() {
  console.log('🚀 Starting email test...');
  console.log('📧 Sending test email to: oneloki05@gmail.com');
  
  try {
    const result = await sendMail({
      to: 'oneloki05@gmail.com',
      subject: '🧪 Chess Results - SMTP Test Email',
      text: `This is a test email from your Chess Results application.

If you can read this email, your SMTP configuration is working correctly!

Test Details:
============
- Timestamp: ${new Date().toISOString()}
- From: Chess Results Backend
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP User: ${process.env.SMTP_USER}

Next steps:
- Check your Gmail inbox, Spam folder, and Promotions tab
- Look for emails from your Chess Results application
- If you can see this test email but not the tournament emails, the issue may be with the tournament email content or specific filtering

This was an automated test. No action required.`,
      html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;max-width:600px;margin:0 auto">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="margin:0;font-size:24px">🧪 Chess Results</h1>
          <p style="margin:5px 0 0;opacity:0.9">SMTP Test Email</p>
        </div>
        
        <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none">
          <p style="font-size:16px;margin-bottom:20px;color:#059669;font-weight:bold">
            ✅ SMTP Configuration Test Successful!
          </p>
          
          <p>If you can read this email, your SMTP configuration is working correctly!</p>
          
          <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
            <h3 style="margin:0 0 15px;color:#374151;font-size:18px">📋 Test Details</h3>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:5px 0;font-weight:bold;color:#374151">Timestamp:</td><td style="padding:5px 0;color:#6b7280">${new Date().toISOString()}</td></tr>
              <tr><td style="padding:5px 0;font-weight:bold;color:#374151">From:</td><td style="padding:5px 0;color:#6b7280">Chess Results Backend</td></tr>
              <tr><td style="padding:5px 0;font-weight:bold;color:#374151">SMTP Host:</td><td style="padding:5px 0;color:#6b7280">${process.env.SMTP_HOST || 'Not configured'}</td></tr>
              <tr><td style="padding:5px 0;font-weight:bold;color:#374151">SMTP User:</td><td style="padding:5px 0;color:#6b7280">${process.env.SMTP_USER || 'Not configured'}</td></tr>
            </table>
          </div>
          
          <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:20px;margin:20px 0;border-radius:0 4px 4px 0">
            <h3 style="margin:0 0 15px;color:#374151;font-size:18px">🔍 Next Steps</h3>
            <ul style="margin:0;padding-left:20px;color:#6b7280">
              <li>Check your Gmail <strong>inbox</strong></li>
              <li>Check your Gmail <strong>Spam folder</strong></li>
              <li>Check your Gmail <strong>Promotions tab</strong></li>
              <li>Look for emails from your Chess Results application</li>
              <li>If you can see this test email but not the tournament emails, the issue may be with the tournament email content or specific filtering</li>
            </ul>
          </div>
          
          <p style="color:#6b7280;font-size:14px;margin-top:30px">
            This was an automated test. No action required. 🎯
          </p>
        </div>
        
        <div style="background:#f3f4f6;padding:15px;text-align:center;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none">
          <p style="margin:0;color:#6b7280;font-size:12px">This email was sent by Chess Results SMTP Test. Configuration appears to be working!</p>
        </div>
      </div>`
    });

    if (result.skipped) {
      console.log('❌ Email sending was skipped - SMTP not configured properly');
      console.log('Please check your environment variables:');
      console.log('- SMTP_HOST:', process.env.SMTP_HOST ? '✅ Set' : '❌ Not set');
      console.log('- SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Not set');
      console.log('- SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Not set');
    } else {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('📬 Email should arrive at: oneloki05@gmail.com');
      console.log('\n🔍 Please check:');
      console.log('1. Gmail inbox');
      console.log('2. Gmail Spam folder');
      console.log('3. Gmail Promotions tab');
      console.log('4. Search Gmail for "Chess Results" or "SMTP Test"');
      console.log('\n⏰ Email may take a few minutes to arrive.');
    }
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication failed. Possible issues:');
      console.log('- Incorrect SMTP username or app password');
      console.log('- App password not enabled for Gmail account');
      console.log('- 2FA not enabled on Gmail account');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🔧 Connection failed. Possible issues:');
      console.log('- Incorrect SMTP host or port');
      console.log('- Network connectivity issues');
      console.log('- Firewall blocking SMTP traffic');
    } else if (error.code === 'EMESSAGE') {
      console.log('\n🔧 Message rejected. Possible issues:');
      console.log('- Invalid recipient email address');
      console.log('- Email content flagged as spam');
      console.log('- Daily send limit exceeded');
    }
    
    console.log('\n📋 Current SMTP Configuration:');
    console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
    console.log('- SMTP_PORT:', process.env.SMTP_PORT || 'Not set (default: 587)');
    console.log('- SMTP_SECURE:', process.env.SMTP_SECURE || 'Not set (default: false)');
    console.log('- SMTP_USER:', process.env.SMTP_USER || 'Not set');
    console.log('- SMTP_PASS:', process.env.SMTP_PASS ? 'Set (hidden)' : 'Not set');
  }
}

// Run the test
sendTestEmail().then(() => {
  console.log('\n🏁 Test completed.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
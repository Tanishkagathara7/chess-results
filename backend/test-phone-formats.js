require('dotenv').config();

const testFormats = async () => {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Different formats to try
    const formats = [
        '+919328978130',
        '919328978130',
        '+91 9328978130'
    ];
    
    console.log('Testing different phone number formats...');
    console.log('');
    
    for (const phoneFormat of formats) {
        console.log(`Testing format: ${phoneFormat}`);
        
        try {
            const message = await client.messages.create({
                from: 'whatsapp:+14155238886',
                to: `whatsapp:${phoneFormat}`,
                body: `Format test: ${phoneFormat} - ${new Date().toLocaleTimeString()}`
            });
            
            console.log(`✅ Success! SID: ${message.sid}, Status: ${message.status}`);
            
            // Check status after a moment
            setTimeout(async () => {
                try {
                    const updated = await client.messages(message.sid).fetch();
                    console.log(`📊 ${phoneFormat} - Final Status: ${updated.status}`);
                    if (updated.errorCode) {
                        console.log(`❌ ${phoneFormat} - Error: ${updated.errorCode}`);
                    }
                } catch (e) {
                    console.log(`⚠️  Could not check status for ${phoneFormat}`);
                }
            }, 3000);
            
        } catch (error) {
            console.log(`❌ ${phoneFormat} failed: ${error.message} (Code: ${error.code})`);
        }
        
        console.log('');
    }
    
    console.log('💡 Wait a moment for status updates...');
};

testFormats();
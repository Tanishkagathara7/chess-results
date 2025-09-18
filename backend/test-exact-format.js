require('dotenv').config();

const testExactFormat = async () => {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    console.log('Testing with exact Twilio console format...');
    
    try {
        // Using the exact format from the Twilio console screenshot
        const message = await client.messages.create({
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+919328978130',  // Exact format from screenshot
            body: 'TEST: Tournament registration approved! If you receive this, WhatsApp is working perfectly.'
        });
        
        console.log('✅ Message sent!');
        console.log('📧 SID:', message.sid);
        console.log('📊 Status:', message.status);
        console.log('📱 To:', message.to);
        console.log('📞 From:', message.from);
        
        // Check status after delay
        setTimeout(async () => {
            try {
                const updated = await client.messages(message.sid).fetch();
                console.log('\n📊 Updated Status:', updated.status);
                
                if (updated.status === 'delivered') {
                    console.log('🎉 SUCCESS! Message delivered to WhatsApp!');
                    console.log('📱 Check phone +919328978130 for the message');
                } else if (updated.status === 'failed') {
                    console.log('❌ Failed with error:', updated.errorCode);
                    console.log('📝 Error message:', updated.errorMessage);
                } else {
                    console.log('⏳ Status:', updated.status);
                }
            } catch (e) {
                console.log('⚠️  Could not check final status');
            }
        }, 5000);
        
    } catch (error) {
        console.log('❌ Failed:', error.message);
        console.log('🔍 Error code:', error.code);
        
        if (error.code === 63015) {
            console.log('\n💡 Error 63015: Phone not properly registered in sandbox');
            console.log('📋 Need to find WhatsApp Sandbox section in Twilio Console');
        }
    }
};

testExactFormat();
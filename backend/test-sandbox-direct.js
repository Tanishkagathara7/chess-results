require('dotenv').config();

const testSandboxMessage = async () => {
    try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        console.log('🧪 Testing direct message to Tanish\'s number...');
        console.log('📱 Target number: +919328978130');
        
        const testMessage = `🧪 TEST MESSAGE from Chess Tournament System
        
If you receive this message, WhatsApp integration is working!

Time: ${new Date().toLocaleString()}

This confirms that your phone number is properly registered with Twilio WhatsApp Sandbox.`;
        
        console.log('📤 Sending message...');
        
        const messageResult = await client.messages.create({
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+919328978130',
            body: testMessage
        });
        
        console.log('✅ Message sent successfully!');
        console.log('📧 Message SID:', messageResult.sid);
        console.log('📊 Status:', messageResult.status);
        console.log('💰 Price:', messageResult.price);
        console.log('📍 Direction:', messageResult.direction);
        
        // Check message status after a delay
        setTimeout(async () => {
            try {
                const updatedMessage = await client.messages(messageResult.sid).fetch();
                console.log('\\n📊 Updated Status:', updatedMessage.status);
                console.log('📝 Error Code:', updatedMessage.errorCode || 'None');
                console.log('📝 Error Message:', updatedMessage.errorMessage || 'None');
            } catch (e) {
                console.log('⚠️  Could not fetch updated status');
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Message failed:', error.message);
        console.error('🔍 Error Code:', error.code);
        
        if (error.code === 21610) {
            console.log('\\n🚨 SANDBOX REGISTRATION REQUIRED!');
            console.log('📞 Phone +919328978130 is NOT registered with WhatsApp Sandbox');
            console.log('\\n✅ TO FIX:');
            console.log('1. From phone +919328978130, open WhatsApp');
            console.log('2. Send message to: +1 415 523 8886');
            console.log('3. Message content: \"join grown-mental\" (try this first)');
            console.log('4. If that doesn\\'t work, try: \"join <any-word>\"');
            console.log('5. Wait for Twilio confirmation message');
            console.log('\\n🔗 Alternative: Go to https://console.twilio.com → Messaging → Try WhatsApp');
        }
    }
};

testSandboxMessage();
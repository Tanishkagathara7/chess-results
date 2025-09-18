require('dotenv').config();

const testWhatsApp = async () => {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    console.log('Testing WhatsApp message to +919328978130...');
    
    try {
        const message = await client.messages.create({
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+919328978130',
            body: 'Test message from Chess Tournament System - if you receive this, WhatsApp is working!'
        });
        
        console.log('✅ Success! Message SID:', message.sid);
        console.log('📊 Status:', message.status);
        
    } catch (error) {
        console.log('❌ Failed:', error.message);
        console.log('🔍 Error Code:', error.code);
        
        if (error.code === 21610) {
            console.log('');
            console.log('🚨 PHONE NUMBER NOT REGISTERED!');
            console.log('📞 The number +919328978130 needs to join WhatsApp Sandbox');
            console.log('');
            console.log('✅ TO FIX:');
            console.log('1. From phone +919328978130, open WhatsApp');
            console.log('2. Send message to: +1 415 523 8886');
            console.log('3. Message: "join grown-mental"');
            console.log('4. Wait for Twilio confirmation');
            console.log('');
            console.log('🔗 Check current code at: https://console.twilio.com');
            console.log('   Go to: Messaging → Try it out → Send a WhatsApp message');
        }
    }
};

testWhatsApp();
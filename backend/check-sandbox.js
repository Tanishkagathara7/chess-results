require('dotenv').config();

const checkSandbox = async () => {
    try {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        console.log('🔍 Checking Twilio WhatsApp Sandbox configuration...\n');
        
        // Get sandbox configuration
        const sandbox = await client.messaging.v1.services('sandbox').fetch();
        
        console.log('📱 Twilio WhatsApp Sandbox Details:');
        console.log('🆔 Sandbox SID:', sandbox.sid);
        console.log('📞 WhatsApp Number:', sandbox.inboundRequestUrl);
        
        // Try to get sandbox participants (if API allows)
        try {
            const participants = await client.messaging.v1.services('sandbox').participantConsents.list();
            console.log('\n👥 Registered Participants:', participants.length);
            
            participants.forEach((participant, index) => {
                console.log(`${index + 1}. ${participant.participant}`);
            });
        } catch (e) {
            console.log('\n⚠️  Could not fetch participants list');
        }
        
        console.log('\n💡 To join sandbox, send WhatsApp message:');
        console.log('📞 TO: +1 415 523 8886');
        console.log('💬 MESSAGE: join grown-mental');
        console.log('\n🔗 Or check: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
        
    } catch (error) {
        console.error('❌ Error checking sandbox:', error.message);
        
        // Fallback: show general instructions
        console.log('\n📋 Manual Steps to Join WhatsApp Sandbox:');
        console.log('1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn');
        console.log('2. Find the sandbox code (like "join grown-mental")');
        console.log('3. From phone +919328978130, send that message to +1 415 523 8886');
        console.log('4. Wait for confirmation message from Twilio');
    }
};

checkSandbox();
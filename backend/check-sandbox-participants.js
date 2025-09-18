require('dotenv').config();

const checkSandbox = async () => {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    console.log('Checking Twilio Sandbox Status...');
    console.log('');
    
    try {
        // List recent messages to/from the sandbox
        const messages = await client.messages.list({
            limit: 10,
            from: 'whatsapp:+14155238886'
        });
        
        console.log(`📧 Recent messages from sandbox (${messages.length}):`);
        messages.forEach((message, index) => {
            console.log(`${index + 1}. To: ${message.to}, Status: ${message.status}, Date: ${message.dateSent?.toISOString()}`);
            if (message.errorCode) {
                console.log(`   ❌ Error: ${message.errorCode} - ${message.errorMessage}`);
            }
        });
        
        console.log('');
        
        // Try to list incoming messages (sandbox confirmations)
        const incomingMessages = await client.messages.list({
            limit: 10,
            to: 'whatsapp:+14155238886'
        });
        
        console.log(`📨 Recent incoming messages (${incomingMessages.length}):`);
        incomingMessages.forEach((message, index) => {
            console.log(`${index + 1}. From: ${message.from}, Body: "${message.body?.substring(0, 50)}...", Date: ${message.dateSent?.toISOString()}`);
        });
        
    } catch (error) {
        console.log('❌ Error checking messages:', error.message);
    }
    
    // Now send a simple test
    console.log('');
    console.log('🧪 Sending test message...');
    
    try {
        const testMessage = await client.messages.create({
            from: 'whatsapp:+14155238886',
            to: 'whatsapp:+919328978130',
            body: 'Testing after sandbox join - ' + new Date().toLocaleString()
        });
        
        console.log('✅ Test sent! SID:', testMessage.sid);
        console.log('📊 Status:', testMessage.status);
        
        // Check the status after 5 seconds
        setTimeout(async () => {
            try {
                const updated = await client.messages(testMessage.sid).fetch();
                console.log('');
                console.log('📊 Final Status:', updated.status);
                console.log('🔍 Error Code:', updated.errorCode || 'None');
                console.log('📝 Error Message:', updated.errorMessage || 'None');
                
                if (updated.status === 'delivered') {
                    console.log('🎉 SUCCESS! WhatsApp message was delivered!');
                } else if (updated.status === 'failed') {
                    console.log('❌ FAILED! Check if phone number is properly registered in sandbox');
                }
            } catch (e) {
                console.log('⚠️  Could not get final status');
            }
        }, 5000);
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('🔍 Error Code:', error.code);
    }
};

checkSandbox();
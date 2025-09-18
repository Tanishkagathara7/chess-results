require('dotenv').config();

const checkMessageStatus = async () => {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const messageSid = 'SM9b1d054554d4ac1131bc01e092f0f564'; // After re-joining sandbox
    
    console.log('Checking message status for SID:', messageSid);
    
    try {
        const message = await client.messages(messageSid).fetch();
        
        console.log('📧 Message Details:');
        console.log('📊 Status:', message.status);
        console.log('📱 To:', message.to);
        console.log('📞 From:', message.from);
        console.log('💰 Price:', message.price);
        console.log('📅 Date Sent:', message.dateSent);
        console.log('📅 Date Updated:', message.dateUpdated);
        console.log('🔍 Error Code:', message.errorCode || 'None');
        console.log('📝 Error Message:', message.errorMessage || 'None');
        console.log('📋 Body Preview:', message.body ? message.body.substring(0, 50) + '...' : 'No body');
        
        // Check if delivery failed
        if (message.status === 'failed' || message.status === 'undelivered') {
            console.log('');
            console.log('🚨 MESSAGE DELIVERY FAILED!');
            console.log('📞 Likely cause: Phone number not registered with WhatsApp Sandbox');
        } else if (message.status === 'delivered') {
            console.log('');
            console.log('✅ MESSAGE DELIVERED SUCCESSFULLY!');
            console.log('📱 Check phone +919328978130 for the message');
        } else if (message.status === 'sent') {
            console.log('');
            console.log('📤 MESSAGE SENT, waiting for delivery confirmation...');
        } else {
            console.log('');
            console.log('⏳ Message status:', message.status);
            console.log('💡 Wait a moment and check again');
        }
        
    } catch (error) {
        console.log('❌ Error checking status:', error.message);
    }
};

checkMessageStatus();
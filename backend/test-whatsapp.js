require('dotenv').config();

// Test WhatsApp functionality
const testWhatsApp = async () => {
    try {
        const twilio = require('twilio');
        
        console.log('🔧 Testing Twilio WhatsApp integration...');
        console.log('📱 TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Not set');
        console.log('🔐 TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Not set');  
        console.log('📞 TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER);
        
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            console.log('❌ Twilio credentials not configured!');
            return false;
        }
        
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        // Test with Tanish's phone number (you'll need to provide this)
        const testPhoneNumber = '+919999999999'; // Replace with Tanish's actual phone number
        const testMessage = '🧪 TEST: WhatsApp integration is working! This is a test message from your chess tournament system.';
        
        console.log(`📱 Sending test WhatsApp message to ${testPhoneNumber}...`);
        
        const messageResult = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${testPhoneNumber}`,
            body: testMessage
        });
        
        console.log('✅ WhatsApp message sent successfully!');
        console.log('📧 Message SID:', messageResult.sid);
        console.log('📊 Message Status:', messageResult.status);
        
        return true;
    } catch (error) {
        console.error('❌ WhatsApp test failed:', error.message);
        
        if (error.code === 20003) {
            console.error('🚫 Authentication failed - check your Twilio Account SID and Auth Token');
        } else if (error.code === 21211) {
            console.error('📱 Invalid To phone number - check the phone number format');
        } else if (error.code === 21212) {
            console.error('📱 Invalid From phone number - check your Twilio WhatsApp number');
        } else if (error.code === 21610) {
            console.error('🚫 WhatsApp not enabled for this number or sandbox not configured');
            console.error('💡 Make sure to join the Twilio WhatsApp sandbox by sending "join <code>" to +14155238886');
        }
        
        return false;
    }
};

// Test the MongoDB connection and check for tournament requests
const testDatabase = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        console.log('🔧 Testing MongoDB connection...');
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('✅ Connected to MongoDB');
        
        // Check for tournament requests
        const requests = await db.collection('tournament_requests').find({}).toArray();
        console.log(`📋 Found ${requests.length} tournament requests in database`);
        
        // Check for users and their phone numbers
        const users = await db.collection('users').find({}).toArray();
        console.log(`👥 Found ${users.length} users in database`);
        
        const usersWithPhone = users.filter(user => user.phone);
        console.log(`📱 Users with phone numbers: ${usersWithPhone.length}`);
        
        if (usersWithPhone.length > 0) {
            console.log('📞 Sample user with phone:', {
                name: usersWithPhone[0].name,
                email: usersWithPhone[0].email,
                phone: usersWithPhone[0].phone
            });
        }
        
        await client.close();
        return true;
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        return false;
    }
};

// Run tests
const runTests = async () => {
    console.log('🚀 Starting WhatsApp Integration Tests...\n');
    
    const dbOk = await testDatabase();
    console.log('');
    
    if (dbOk) {
        await testWhatsApp();
    }
    
    console.log('\n✨ Tests completed!');
    process.exit(0);
};

runTests();
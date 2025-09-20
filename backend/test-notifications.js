require('dotenv').config();

const testNotifications = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('🔍 Testing notification creation...\n');
        
        // Check for existing notifications
        const allNotifications = await db.collection('notifications').find({}).toArray();
        console.log(`📋 Total notifications in database: ${allNotifications.length}`);
        
        if (allNotifications.length > 0) {
            console.log('\n📋 Recent notifications:');
            allNotifications
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                .slice(0, 5)
                .forEach((notification, index) => {
                    console.log(`${index + 1}. ${notification.title}`);
                    console.log(`   Type: ${notification.type}`);
                    console.log(`   Message: ${notification.message}`);
                    console.log(`   User ID: ${notification.user_id}`);
                    console.log(`   Created: ${notification.created_date}`);
                    console.log(`   Read: ${notification.read}`);
                    console.log('');
                });
        }
        
        // Check for pending tournament requests
        const pendingRequests = await db.collection('tournament_requests').find({ 
            status: 'pending' 
        }).toArray();
        
        console.log(`\n📨 Pending tournament requests: ${pendingRequests.length}`);
        
        if (pendingRequests.length > 0) {
            console.log('\n✅ Test scenario: Manually approve a request to see notification creation');
            console.log('Steps:');
            console.log('1. Go to admin panel');
            console.log('2. Click on "Requests" tab');
            console.log('3. Approve a pending request');
            console.log('4. Check notifications dropdown');
        } else {
            console.log('\n⚠️  No pending requests found. Create a request first:');
            console.log('1. Login as a regular user');
            console.log('2. Go to tournaments page');
            console.log('3. Click "Join Tournament" on any tournament');
            console.log('4. Then login as admin and approve the request');
        }
        
        // Check for users to ensure notifications can be delivered
        const allUsers = await db.collection('users').find({}).toArray();
        console.log(`\n👥 Total users in database: ${allUsers.length}`);
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

testNotifications();
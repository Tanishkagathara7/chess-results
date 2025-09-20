const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function createTestNotification() {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    console.log('📝 Creating test notification for test@example.com...\n');
    
    try {
        // Find test@example.com user
        const user = await db.collection('users').findOne({ email: 'test@example.com' });
        if (!user) {
            console.log('❌ User test@example.com not found');
            return;
        }
        
        console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);
        
        const createDocument = (data) => {
            return {
                id: uuidv4(),
                ...data,
                created_at: new Date().toISOString()
            };
        };
        
        // Create a test notification
        const notificationData = {
            user_id: user.id,
            type: 'tournament_approved',
            title: 'Tournament Request Approved! 🎉',
            message: 'This is a test notification to verify the frontend integration is working correctly.',
            data: {
                request_id: 'test-request-id',
                tournament_id: 'test-tournament-id',
                tournament_name: 'Test Tournament',
                action: 'approve',
                admin_notes: 'Manual test notification'
            },
            read: false,
            created_date: new Date().toISOString()
        };
        
        const notification = createDocument(notificationData);
        await db.collection('notifications').insertOne(notification);
        
        console.log('✅ Test notification created successfully!');
        console.log(`   Notification ID: ${notification.id}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Message: ${notification.message}`);
        
        // Verify it was created
        const verifyNotification = await db.collection('notifications').findOne({ id: notification.id });
        if (verifyNotification) {
            console.log('✅ Notification verified in database');
        }
        
        // Check total notifications for this user
        const userNotifications = await db.collection('notifications').find({ user_id: user.id }).toArray();
        console.log(`\n📧 User now has ${userNotifications.length} total notification(s)`);
        
        console.log('\n🎯 Now test the frontend:');
        console.log('1. Start the frontend application');
        console.log('2. Login as test@example.com with password "123456"');
        console.log('3. Check the notification bell in the top navigation');
        console.log('4. You should see 1 unread notification');
        console.log('5. Click the bell to open the dropdown and see the notification');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.close();
    }
}

createTestNotification();
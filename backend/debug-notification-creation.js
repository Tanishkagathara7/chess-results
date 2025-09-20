const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function debugNotificationCreation() {
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    console.log('🔍 Debugging notification creation...\n');
    
    try {
        // Check recent requests
        console.log('📋 Checking recent requests...');
        const recentRequests = await db.collection('tournament_requests').find({}).sort({ request_date: -1 }).limit(3).toArray();
        
        console.log(`Found ${recentRequests.length} recent requests:`);
        recentRequests.forEach((req, i) => {
            console.log(`${i + 1}. ID: ${req.id}, Status: ${req.status}, User: ${req.user_id}`);
        });
        
        if (recentRequests.length === 0) {
            console.log('❌ No requests found');
            return;
        }
        
        const latestRequest = recentRequests[0];
        console.log(`\n🎯 Testing with request: ${latestRequest.id}`);
        
        // Test the aggregation query similar to the backend
        console.log('\n📊 Testing aggregation query...');
        const requestWithDetails = await db.collection('tournament_requests').aggregate([
            { $match: { id: latestRequest.id } },
            {
                $lookup: {
                    from: 'players',
                    localField: 'player_id',
                    foreignField: 'id',
                    as: 'player'
                }
            },
            { $unwind: '$player' },
            {
                $lookup: {
                    from: 'tournaments',
                    localField: 'tournament_id',
                    foreignField: 'id',
                    as: 'tournament'
                }
            },
            { $unwind: '$tournament' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'id',
                    as: 'user'
                }
            },
            { $unwind: '$user' }
        ]).toArray();
        
        if (requestWithDetails.length === 0) {
            console.log('❌ Aggregation returned no results');
            return;
        }
        
        const requestDetails = requestWithDetails[0];
        console.log('✅ Aggregation successful!');
        console.log(`   User: ${requestDetails.user.email}`);
        console.log(`   Tournament: ${requestDetails.tournament.name}`);
        console.log(`   Player: ${requestDetails.player.name}`);
        
        // Test notification creation
        console.log('\n📝 Testing notification creation...');
        
        const createDocument = (data) => {
            return {
                id: uuidv4(),
                ...data,
                created_at: new Date().toISOString()
            };
        };
        
        const notificationData = {
            user_id: requestDetails.user_id,
            type: 'tournament_approved',
            title: 'Tournament Request Approved! 🎉',
            message: `Congratulations! Your request to join "${requestDetails.tournament.name}" has been approved. You are now registered for the tournament.`,
            data: {
                request_id: latestRequest.id,
                tournament_id: requestDetails.tournament_id,
                tournament_name: requestDetails.tournament.name,
                action: 'approve',
                admin_notes: null
            },
            read: false,
            created_date: new Date().toISOString()
        };
        
        console.log('📧 Notification data prepared:');
        console.log(`   User ID: ${notificationData.user_id}`);
        console.log(`   Type: ${notificationData.type}`);
        console.log(`   Title: ${notificationData.title}`);
        
        const notification = createDocument(notificationData);
        console.log(`   Generated ID: ${notification.id}`);
        
        // Insert the notification
        await db.collection('notifications').insertOne(notification);
        console.log('✅ Notification inserted successfully!');
        
        // Verify it was inserted
        const insertedNotification = await db.collection('notifications').findOne({ id: notification.id });
        if (insertedNotification) {
            console.log('✅ Notification verified in database!');
        } else {
            console.log('❌ Notification not found after insertion');
        }
        
        // Check how many notifications exist for this user
        const userNotifications = await db.collection('notifications').find({ user_id: requestDetails.user_id }).toArray();
        console.log(`\n📧 User ${requestDetails.user.email} now has ${userNotifications.length} total notifications`);
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        await client.close();
    }
}

debugNotificationCreation();
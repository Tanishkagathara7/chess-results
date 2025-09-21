const { sendTournamentDetailsEmail } = require('./utils/mailer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testAdminAddPlayerEmail() {
    console.log('🧪 Testing admin add player email notification...\n');
    
    let client;
    try {
        // Connect to database
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-results';
        client = new MongoClient(mongoURI);
        await client.connect();
        const db = client.db();
        
        console.log('✅ Connected to database');
        
        // Find a user with email oneloki05@gmail.com
        const testUser = await db.collection('users').findOne({ email: 'oneloki05@gmail.com' });
        if (!testUser) {
            console.log('❌ Test user oneloki05@gmail.com not found in database');
            console.log('Available users:');
            const users = await db.collection('users').find({}, { projection: { email: 1, id: 1 } }).toArray();
            users.forEach(u => console.log(`  - ${u.email} (${u.id})`));
            return;
        }
        
        console.log('✅ Found test user:', testUser.email);
        
        // Find a player associated with this user
        let testPlayer = await db.collection('players').findOne({ user_id: testUser.id });
        if (!testPlayer) {
            console.log('⚠️  No player found directly linked to user. Looking for players with same email...');
            testPlayer = await db.collection('players').findOne({ email: testUser.email });
        }
        
        if (!testPlayer) {
            console.log('❌ No player found for this user');
            // Create a test player
            const playerData = {
                id: `test_player_${Date.now()}`,
                name: 'Test Player',
                email: testUser.email,
                rating: 1500,
                user_id: testUser.id,
                created_date: new Date().toISOString()
            };
            await db.collection('players').insertOne(playerData);
            testPlayer = playerData;
            console.log('✅ Created test player:', testPlayer.name);
        } else {
            console.log('✅ Found test player:', testPlayer.name);
        }
        
        // Find a test tournament
        let testTournament = await db.collection('tournaments').findOne({});
        if (!testTournament) {
            console.log('❌ No tournaments found in database');
            return;
        }
        
        console.log('✅ Found test tournament:', testTournament.name);
        
        // Test the email sending
        console.log('\n📧 Testing email send...');
        const emailResult = await sendTournamentDetailsEmail(
            testUser.email,
            testTournament,
            testPlayer,
            { isAdminAdded: true }
        );
        
        if (emailResult.skipped) {
            console.log('⚠️  Email sending was skipped - SMTP not configured');
        } else {
            console.log('✅ Email sent successfully!');
            console.log('📧 Message ID:', emailResult.messageId);
            console.log('📬 Email sent to:', testUser.email);
        }
        
        // Test the user lookup logic that would happen in the actual endpoint
        console.log('\n🔍 Testing user lookup logic...');
        console.log('1. Direct user_id lookup:', testPlayer.user_id ? '✅' : '❌');
        
        if (testPlayer.user_id) {
            const foundUser = await db.collection('users').findOne({ id: testPlayer.user_id });
            console.log('   Found user via player.user_id:', foundUser ? foundUser.email : 'None');
        }
        
        // Test fallback lookup via tournament request
        console.log('2. Tournament request fallback lookup...');
        const request = await db.collection('tournament_requests')
            .find({ tournament_id: testTournament.id, player_id: testPlayer.id })
            .sort({ request_date: -1 })
            .limit(1)
            .toArray();
            
        if (request && request[0]?.user_id) {
            const foundUser = await db.collection('users').findOne({ id: request[0].user_id });
            console.log('   Found user via tournament request:', foundUser ? foundUser.email : 'None');
        } else {
            console.log('   No tournament request found for this player/tournament');
        }
        
        console.log('\n🎉 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

// Run the test
if (require.main === module) {
    testAdminAddPlayerEmail().then(() => {
        console.log('\n🏁 Test script finished.');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { testAdminAddPlayerEmail };
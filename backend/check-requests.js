require('dotenv').config();

const checkRequests = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('🔍 Checking tournament requests...\n');
        
        // Check all tournament requests
        const allRequests = await db.collection('tournament_requests').find({}).toArray();
        console.log(`📋 Total tournament requests: ${allRequests.length}`);
        
        if (allRequests.length > 0) {
            console.log('\n📋 All Tournament Requests:');
            allRequests.forEach((request, index) => {
                console.log(`${index + 1}. Status: ${request.status}, User: ${request.user_id}, Tournament: ${request.tournament_id}, Date: ${request.request_date}`);
            });
        }
        
        // Check recent requests specifically from abc@gmail.com user
        const abcUser = await db.collection('users').findOne({ email: 'abc@gmail.com' });
        if (abcUser) {
            console.log(`\n👤 Found abc@gmail.com user: ${abcUser.name} (ID: ${abcUser.id})`);
            
            const abcRequests = await db.collection('tournament_requests').find({ user_id: abcUser.id }).toArray();
            console.log(`📨 Requests from abc@gmail.com: ${abcRequests.length}`);
            
            if (abcRequests.length > 0) {
                abcRequests.forEach((request, index) => {
                    console.log(`   ${index + 1}. Status: ${request.status}, Tournament: ${request.tournament_id}, Date: ${request.request_date}`);
                });
            }
        }
        
        // Check tournament participants (maybe the request went directly to participants?)
        const abcParticipants = await db.collection('tournament_participants').find({ player_id: { $exists: true } }).toArray();
        console.log(`\n🎯 Total tournament participants: ${abcParticipants.length}`);
        
        if (abcUser) {
            const abcPlayer = await db.collection('players').findOne({ user_id: abcUser.id });
            if (abcPlayer) {
                console.log(`🎮 abc@gmail.com player profile: ${abcPlayer.name} (ID: ${abcPlayer.id})`);
                
                const participantRecords = await db.collection('tournament_participants').find({ player_id: abcPlayer.id }).toArray();
                console.log(`🏆 Participant records for abc user: ${participantRecords.length}`);
                
                if (participantRecords.length > 0) {
                    participantRecords.forEach((participant, index) => {
                        console.log(`   ${index + 1}. Tournament: ${participant.tournament_id}, Status: ${participant.status}, Date: ${participant.registration_date}`);
                    });
                }
            }
        }
        
        // Check if there are any tournaments
        const tournaments = await db.collection('tournaments').find({}).toArray();
        console.log(`\n🏆 Total tournaments: ${tournaments.length}`);
        if (tournaments.length > 0) {
            console.log('📋 Available tournaments:');
            tournaments.forEach((tournament, index) => {
                console.log(`   ${index + 1}. ${tournament.name} (ID: ${tournament.id})`);
            });
        }
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

checkRequests();
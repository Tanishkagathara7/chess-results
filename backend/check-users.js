const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkUsers() {
    let client;
    
    try {
        console.log('🔍 Checking available users...');
        
        // Connect to MongoDB
        client = new MongoClient(process.env.MONGO_URL);
        await client.connect();
        const db = client.db(process.env.DB_NAME);
        
        // Get all users
        const users = await db.collection('users').find({}).toArray();
        console.log(`\n👥 Found ${users.length} users:`);
        
        users.forEach((user, idx) => {
            console.log(`${idx + 1}. Email: ${user.email} | Name: ${user.name} | Phone: ${user.phone} | Role: ${user.role || 'user'}`);
        });
        
        // Check tournament requests
        const requests = await db.collection('tournament_requests').find({}).limit(5).toArray();
        console.log(`\n📋 Found ${requests.length} tournament requests:`);
        
        requests.forEach((req, idx) => {
            console.log(`${idx + 1}. ID: ${req.id} | Status: ${req.status} | User ID: ${req.user_id} | Tournament ID: ${req.tournament_id}`);
        });
        
        // Check tournaments
        const tournaments = await db.collection('tournaments').find({}).limit(3).toArray();
        console.log(`\n🏆 Found ${tournaments.length} tournaments:`);
        
        tournaments.forEach((tournament, idx) => {
            console.log(`${idx + 1}. ID: ${tournament.id} | Name: ${tournament.name} | Location: ${tournament.location}`);
        });
        
        // Check players
        const players = await db.collection('players').find({}).limit(3).toArray();
        console.log(`\n♟️ Found ${players.length} players:`);
        
        players.forEach((player, idx) => {
            console.log(`${idx + 1}. ID: ${player.id} | Name: ${player.name} | Rating: ${player.rating}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

checkUsers();
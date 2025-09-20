require('dotenv').config();

const testRealtimeRequests = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const { v4: uuidv4 } = require('uuid');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('🎯 Testing real-time tournament request updates...\n');
        
        // Get existing users and tournaments
        const users = await db.collection('users').find({ role: { $ne: 'admin' } }).toArray();
        const players = await db.collection('players').find({}).toArray();
        const tournaments = await db.collection('tournaments').find({}).toArray();
        
        console.log(`📊 Available data:`);
        console.log(`   Users: ${users.length}`);
        console.log(`   Players: ${players.length}`);
        console.log(`   Tournaments: ${tournaments.length}\n`);
        
        if (users.length === 0 || players.length === 0 || tournaments.length === 0) {
            console.log('❌ Not enough data to create test requests');
            console.log('Make sure you have:');
            console.log('- At least 1 regular user (not admin)');
            console.log('- At least 1 player');
            console.log('- At least 1 tournament');
            await client.close();
            return;
        }
        
        // Function to create a random request
        const createRandomRequest = async () => {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const randomPlayer = players.find(p => p.user_id === randomUser.id) || players[Math.floor(Math.random() * players.length)];
            const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)];
            
            // Check if request already exists
            const existingRequest = await db.collection('tournament_requests').findOne({
                user_id: randomUser.id,
                tournament_id: randomTournament.id
            });
            
            if (existingRequest) {
                console.log('⚠️  Request already exists for this user/tournament combo, skipping...');
                return false;
            }
            
            const request = {
                id: uuidv4(),
                tournament_id: randomTournament.id,
                player_id: randomPlayer.id,
                user_id: randomUser.id,
                status: 'pending',
                request_date: new Date().toISOString(),
                preferred_rating: randomPlayer.rating || 1200,
                notes: `Test request from ${randomUser.name || randomUser.email}`,
                created_at: new Date().toISOString()
            };
            
            await db.collection('tournament_requests').insertOne(request);
            
            console.log('✅ Created new tournament request:');
            console.log(`   Player: ${randomPlayer.name} (${randomUser.email})`);
            console.log(`   Tournament: ${randomTournament.name} (${randomTournament.location})`);
            console.log(`   Time: ${new Date().toLocaleTimeString()}\n`);
            
            return true;
        };
        
        console.log('🚀 Starting real-time request simulation...');
        console.log('📱 Open your admin panel in the browser and switch to "Requests" tab');
        console.log('🔔 You should see new requests appear automatically every 10-15 seconds\n');
        console.log('⏱️  Creating requests every 10-15 seconds (press Ctrl+C to stop)...\n');
        
        // Create requests at random intervals
        let requestCount = 0;
        const maxRequests = 10;
        
        const createRequestLoop = async () => {
            if (requestCount >= maxRequests) {
                console.log(`\n🏁 Finished creating ${requestCount} test requests`);
                console.log('💡 Switch to your admin panel to see the real-time updates!');
                await client.close();
                return;
            }
            
            const success = await createRandomRequest();
            if (success) requestCount++;
            
            // Random interval between 10-15 seconds
            const nextInterval = Math.random() * 5000 + 10000;
            console.log(`⏳ Next request in ${Math.round(nextInterval / 1000)} seconds...`);
            
            setTimeout(createRequestLoop, nextInterval);
        };
        
        // Start the loop
        createRequestLoop();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping request simulation...');
    console.log('✅ Test completed. Check your admin panel for the results!');
    process.exit(0);
});

testRealtimeRequests();
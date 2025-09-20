require('dotenv').config();

const createTestRequest = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const { v4: uuidv4 } = require('uuid');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('🧪 Creating test tournament request...\n');
        
        // Get abc@gmail.com user details
        const user = await db.collection('users').findOne({ email: 'abc@gmail.com' });
        const player = await db.collection('players').findOne({ user_id: user.id });
        
        // Get a tournament to join (use 'cds' tournament)
        const tournament = await db.collection('tournaments').findOne({ name: 'cds' });
        
        if (!tournament) {
            console.log('❌ Tournament not found!');
            return;
        }
        
        console.log('👤 User:', user.name, '(', user.email, ')');
        console.log('🎮 Player:', player.name, '(ID:', player.id, ')');
        console.log('🏆 Tournament:', tournament.name, '(ID:', tournament.id, ')');
        
        // Check if request already exists
        const existingRequest = await db.collection('tournament_requests').findOne({
            user_id: user.id,
            tournament_id: tournament.id
        });
        
        if (existingRequest) {
            console.log('⚠️  Request already exists:', existingRequest.status);
        } else {
            // Create a new tournament request
            const request = {
                id: uuidv4(),
                tournament_id: tournament.id,
                player_id: player.id,
                user_id: user.id,
                status: 'pending',
                request_date: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
            
            await db.collection('tournament_requests').insertOne(request);
            
            console.log('✅ Test tournament request created!');
            console.log('📋 Request Details:');
            console.log('   ID:', request.id);
            console.log('   Status:', request.status);
            console.log('   User:', user.name, '(' + user.email + ')');
            console.log('   Tournament:', tournament.name);
            console.log('   Date:', request.request_date);
        }
        
        await client.close();
        
        console.log('\n🎯 Now you can test the approval process:');
        console.log('1. Login as admin (admin@chessresults.com / admin123)');
        console.log('2. Go to Tournament Requests');
        console.log('3. Approve the pending request');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
};

createTestRequest();
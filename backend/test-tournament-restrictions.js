require('dotenv').config();

const testTournamentRestrictions = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const axios = require('axios');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('🧪 Testing tournament registration restrictions...\n');
        
        // Get tournaments
        const tournaments = await db.collection('tournaments').find({}).toArray();
        console.log(`📋 Found ${tournaments.length} tournaments\n`);
        
        // Show tournament dates and statuses
        console.log('🏆 Tournament Schedule:');
        tournaments.forEach((tournament, index) => {
            const startDate = new Date(tournament.start_date);
            const now = new Date();
            const hasStarted = now >= startDate;
            const status = hasStarted ? '🔴 STARTED' : '🟢 OPEN';
            
            console.log(`${index + 1}. ${tournament.name}`);
            console.log(`   📅 Start: ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`);
            console.log(`   📊 Status: ${status}`);
            console.log(`   🎯 Registration: ${hasStarted ? 'CLOSED' : 'OPEN'}`);
            console.log('');
        });
        
        // Test scenario 1: Try to join a tournament that has started
        const startedTournament = tournaments.find(t => new Date() >= new Date(t.start_date));
        const openTournament = tournaments.find(t => new Date() < new Date(t.start_date));
        
        if (startedTournament) {
            console.log('🧪 TEST 1: Attempting to join started tournament...');
            console.log(`Tournament: ${startedTournament.name} (started ${new Date(startedTournament.start_date).toLocaleDateString()})`);
            
            try {
                // Login as a regular user
                const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
                    email: 'abc@gmail.com',
                    password: 'password123'
                });
                
                const userToken = loginResponse.data.token;
                
                // Try to create a request for started tournament
                const response = await axios.post('http://localhost:3001/api/tournament-requests', {
                    tournament_id: startedTournament.id,
                    preferred_rating: 1200,
                    notes: 'Test request for started tournament'
                }, {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                
                console.log('❌ ERROR: Request should have been rejected but was accepted!');
                
            } catch (error) {
                if (error.response?.status === 400 && error.response?.data?.error?.includes('Tournament has already started')) {
                    console.log('✅ SUCCESS: Registration correctly blocked for started tournament');
                    console.log(`   Message: ${error.response.data.error}`);
                } else {
                    console.log('❓ UNEXPECTED ERROR:', error.response?.data || error.message);
                }
            }
            console.log('');
        }
        
        // Test scenario 2: Join an open tournament to test status display
        if (openTournament) {
            console.log('🧪 TEST 2: Join status testing...');
            console.log(`Tournament: ${openTournament.name} (starts ${new Date(openTournament.start_date).toLocaleDateString()})`);
            
            try {
                const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
                    email: 'abc@gmail.com', 
                    password: 'password123'
                });
                
                const userToken = loginResponse.data.token;
                
                // Check current status
                console.log('📋 Checking current join status...');
                const requestsResponse = await axios.get('http://localhost:3001/api/my-requests', {
                    headers: { 'Authorization': `Bearer ${userToken}` }
                });
                
                const existingRequest = requestsResponse.data.find(r => r.tournament_id === openTournament.id);
                const participantsResponse = await axios.get(`http://localhost:3001/api/tournaments/${openTournament.id}/participants`);
                
                const user = await db.collection('users').findOne({ email: 'abc@gmail.com' });
                const player = await db.collection('players').findOne({ user_id: user.id });
                const isParticipant = participantsResponse.data.some(p => p.player_id === player.id);
                
                if (isParticipant) {
                    console.log('🏆 Status: JOINED (approved and registered)');
                    console.log('   Frontend should show: "🏆 Joined" button (disabled)');
                } else if (existingRequest) {
                    console.log(`📨 Status: ${existingRequest.status.toUpperCase()} REQUEST`);
                    console.log('   Frontend should show: "Request Pending 🕰️" button (disabled)');
                } else {
                    console.log('⚪ Status: NOT JOINED');
                    console.log('   Frontend should show: "Request to Join" button (enabled)');
                }
                
            } catch (error) {
                console.log('❌ Error in test 2:', error.response?.data || error.message);
            }
            console.log('');
        }
        
        // Instructions for manual testing
        console.log('📱 MANUAL TESTING STEPS:');
        console.log('1. Open your frontend application');
        console.log('2. Login as a regular user');
        console.log('3. Go to tournaments page');
        console.log('4. Check that:');
        console.log('   - Started tournaments show "Tournament Started" (disabled)');
        console.log('   - Joined tournaments show "🏆 Joined" (disabled)');
        console.log('   - Pending requests show "Request Pending 🕰️" (disabled)');
        console.log('   - Available tournaments show "Request to Join" (enabled)');
        
        await client.close();
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
};

testTournamentRestrictions();
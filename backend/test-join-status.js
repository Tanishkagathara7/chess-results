require('dotenv').config();

const testJoinStatus = async () => {
    try {
        const { MongoClient } = require('mongodb');
        const axios = require('axios');
        const mongoUrl = process.env.MONGO_URL;
        const dbName = process.env.DB_NAME;
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db(dbName);
        
        console.log('🔍 Testing join status detection...\n');
        
        // Test with a specific user
        const testEmail = 'abc@gmail.com'; // Change this to the user having issues
        
        const user = await db.collection('users').findOne({ email: testEmail });
        if (!user) {
            console.log(`❌ User not found: ${testEmail}`);
            await client.close();
            return;
        }
        
        console.log(`👤 Testing with user: ${user.name} (${user.email})`);
        
        // Find user's player profile
        const player = await db.collection('players').findOne({ user_id: user.id });
        if (!player) {
            console.log('❌ No player profile found for user');
            await client.close();
            return;
        }
        
        console.log(`🎮 Player profile: ${player.name} (ID: ${player.id})`);
        
        // Get all tournaments
        const tournaments = await db.collection('tournaments').find({}).toArray();
        console.log(`\n🏆 Checking status for ${tournaments.length} tournaments:\n`);
        
        for (const tournament of tournaments) {
            console.log(`📋 Tournament: ${tournament.name}`);
            
            // Check if player is a participant (approved and added to participants)
            const participant = await db.collection('tournament_participants').findOne({
                tournament_id: tournament.id,
                player_id: player.id,
                status: { $ne: 'withdrawn' }
            });
            
            // Check if there's a request
            const request = await db.collection('tournament_requests').findOne({
                tournament_id: tournament.id,
                user_id: user.id
            });
            
            let status = 'not joined';
            if (participant) {
                status = `🏆 JOINED (participant status: ${participant.status})`;
            } else if (request) {
                status = `📨 REQUEST ${request.status.toUpperCase()}`;
            }
            
            console.log(`   Status: ${status}`);
            
            if (request) {
                console.log(`   Request ID: ${request.id}`);
                console.log(`   Request Date: ${new Date(request.request_date).toLocaleDateString()}`);
                if (request.approved_date) {
                    console.log(`   Approved Date: ${new Date(request.approved_date).toLocaleDateString()}`);
                }
            }
            
            console.log('');
        }
        
        // Test the API endpoints that the frontend uses
        console.log('🔗 Testing API endpoints...\n');
        
        try {
            // Login as the user
            const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
                email: testEmail,
                password: 'password123' // Update this with correct password
            });
            
            const token = loginResponse.data.token;
            console.log('✅ Login successful');
            
            // Test /api/my-requests endpoint
            const requestsResponse = await axios.get('http://localhost:3001/api/my-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log(`📋 My requests: ${requestsResponse.data.length}`);
            requestsResponse.data.forEach((req, index) => {
                console.log(`   ${index + 1}. ${req.tournament.name} - Status: ${req.status}`);
            });
            
            // Test tournament participants endpoints for each tournament
            console.log('\n🎯 Testing participants endpoints:');
            for (const tournament of tournaments.slice(0, 3)) { // Test first 3 tournaments
                try {
                    const participantsResponse = await axios.get(`http://localhost:3001/api/tournaments/${tournament.id}/participants`);
                    const isParticipant = participantsResponse.data.some(p => p.player_id === player.id);
                    console.log(`   ${tournament.name}: ${isParticipant ? '✅ IS PARTICIPANT' : '❌ NOT PARTICIPANT'}`);
                } catch (error) {
                    console.log(`   ${tournament.name}: ❓ Error checking participants`);
                }
            }
            
        } catch (error) {
            console.log('❌ API test failed:', error.response?.data || error.message);
        }
        
        await client.close();
        
        console.log('\n💡 Expected behavior:');
        console.log('- If status is "REQUEST APPROVED" but user not in participants → Backend issue');
        console.log('- If user is participant but frontend shows wrong status → Frontend issue');
        console.log('- If request is pending → Should show "Request Pending 🕰️"');
        console.log('- If request is approved AND user is participant → Should show "🏆 Joined"');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
};

testJoinStatus();
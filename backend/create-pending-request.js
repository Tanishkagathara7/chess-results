const axios = require('axios');

async function createPendingRequest() {
    try {
        console.log('📝 Creating a pending tournament request for admin to approve...\n');
        
        // Use a different user to create a new request
        console.log('🔑 Logging in as user (abc@gmail.com)...');
        const userLoginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'abc@gmail.com',
            password: 'password123'
        });
        
        const userToken = userLoginResponse.data.token;
        console.log('✅ User login successful\n');
        
        // Get available tournaments
        console.log('🏆 Fetching available tournaments...');
        const tournamentsResponse = await axios.get('http://localhost:3001/api/tournaments', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        const tournaments = tournamentsResponse.data;
        console.log(`Found ${tournaments.length} tournaments`);
        
        // Pick a different tournament (not the first one)
        const tournament = tournaments[1] || tournaments[0]; // Use second tournament if available
        console.log(`🎯 Selected tournament: ${tournament.name} (${tournament.location})`);
        
        // Create tournament request
        console.log('\n📝 Creating tournament request...');
        const requestResponse = await axios.post('http://localhost:3001/api/tournament-requests', {
            tournament_id: tournament.id,
            preferred_rating: 1400,
            notes: 'Hi! I would like to join this tournament. Please approve my request. Thank you!'
        }, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        console.log('✅ Tournament request created successfully!');
        console.log('Request ID:', requestResponse.data.request_id);
        console.log('Status:', requestResponse.data.status);
        console.log('Tournament:', requestResponse.data.tournament_name);
        
        console.log('\n🎯 Now check the admin panel:');
        console.log('1. Refresh the admin panel page');
        console.log('2. Go to "Requests" tab');
        console.log('3. You should see 1 pending request');
        console.log('4. Click "Approve" to approve it');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        if (error.response?.status === 400 && error.response?.data?.error?.includes('already have a request')) {
            console.log('\n💡 This user already has a request for this tournament.');
            console.log('💡 Try using a different user or tournament.');
        }
    }
}

createPendingRequest();
const axios = require('axios');

async function createPendingWithExisting() {
    try {
        console.log('📝 Creating pending request with existing testplayer...\n');
        
        // Login with existing testplayer
        console.log('🔑 Logging in as testplayer...');
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'testplayer@example.com',
            password: 'password123'
        });
        
        const userToken = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Get tournaments
        console.log('\n🏆 Fetching tournaments...');
        const tournamentsResponse = await axios.get('http://localhost:3001/api/tournaments', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        const tournaments = tournamentsResponse.data;
        // Pick the mxs tournament (since user mentioned requesting for mxs)
        const mxsTournament = tournaments.find(t => t.name === 'mxs');
        const tournament = mxsTournament || tournaments[0];
        
        console.log(`🎯 Selected tournament: ${tournament.name} (${tournament.location})`);
        
        // Create request
        console.log('\n📝 Creating tournament request...');
        const requestResponse = await axios.post('http://localhost:3001/api/tournament-requests', {
            tournament_id: tournament.id,
            preferred_rating: 1400,
            notes: 'Hello admin! I would like to join this tournament. Please approve my request. Thank you!'
        }, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        console.log('✅ Tournament request created successfully!');
        console.log('Request ID:', requestResponse.data.request_id);
        console.log('Status:', requestResponse.data.status);
        console.log('Tournament:', requestResponse.data.tournament_name);
        
        // Verify the request appears in admin
        console.log('\n✅ Verifying request appears in admin...');
        const adminLoginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@chessresults.com',
            password: 'admin123'
        });
        
        const adminToken = adminLoginResponse.data.token;
        const pendingRequestsResponse = await axios.get('http://localhost:3001/api/tournament-requests?status=pending', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const pendingRequests = pendingRequestsResponse.data;
        console.log(`✅ Admin can see ${pendingRequests.length} pending request(s):`);
        pendingRequests.forEach((req, idx) => {
            console.log(`  ${idx + 1}. ${req.user.name} → ${req.tournament.name} (${req.status})`);
        });
        
        console.log('\n🎊 SUCCESS! The request is now pending in the admin panel!');
        console.log('🔄 Refresh your admin panel to see it appear');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

createPendingWithExisting();
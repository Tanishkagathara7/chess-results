const axios = require('axios');

async function testCompleteFlow() {
    try {
        console.log('🎯 Testing complete tournament request flow...\n');
        
        // Step 1: Login as regular user
        console.log('🔑 Step 1: Logging in as user (oneloki05@gmail.com)...');
        const userLoginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'oneloki05@gmail.com',
            password: 'password123'
        });
        
        const userToken = userLoginResponse.data.token;
        console.log('✅ User login successful\n');
        
        // Step 2: Get available tournaments
        console.log('🏆 Step 2: Fetching available tournaments...');
        const tournamentsResponse = await axios.get('http://localhost:3001/api/tournaments', {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        const tournaments = tournamentsResponse.data;
        console.log(`Found ${tournaments.length} tournaments:`);
        tournaments.slice(0, 3).forEach((t, idx) => {
            console.log(`  ${idx + 1}. ${t.name} (${t.location})`);
        });
        
        if (tournaments.length === 0) {
            console.log('❌ No tournaments found!');
            return;
        }
        
        const tournament = tournaments[0];
        console.log(`\n🎯 Selected tournament: ${tournament.name}`);
        
        // Step 3: Create tournament request
        console.log('\n📝 Step 3: Creating tournament request...');
        const requestResponse = await axios.post('http://localhost:3001/api/tournament-requests', {
            tournament_id: tournament.id,
            preferred_rating: 1600,
            notes: 'Looking forward to participating in this tournament!'
        }, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        console.log('✅ Tournament request created successfully!');
        console.log('Request ID:', requestResponse.data.request_id);
        console.log('Status:', requestResponse.data.status);
        
        const requestId = requestResponse.data.request_id;
        
        // Step 4: Login as admin to see and approve the request
        console.log('\n🔑 Step 4: Logging in as admin...');
        const adminLoginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@chessresults.com',
            password: 'admin123'
        });
        
        const adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin login successful');
        
        // Step 5: Get pending requests
        console.log('\n📋 Step 5: Fetching pending tournament requests...');
        const requestsResponse = await axios.get('http://localhost:3001/api/tournament-requests', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const requests = requestsResponse.data;
        console.log(`Found ${requests.length} pending requests:`);
        requests.forEach((req, idx) => {
            console.log(`  ${idx + 1}. ${req.user.name} → ${req.tournament.name} (${req.status})`);
        });
        
        // Step 6: Approve the request
        console.log('\n🎉 Step 6: Approving the tournament request...');
        const approvalResponse = await axios.put(`http://localhost:3001/api/tournament-requests/${requestId}`, {
            action: 'approve',
            admin_notes: 'Welcome to the tournament! Your registration looks good.'
        }, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('✅ Request approved successfully!');
        console.log('Response:', approvalResponse.data.message);
        
        console.log('\n🎊 SUCCESS! Complete tournament request flow working!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 400 && error.response?.data?.error?.includes('already have a request')) {
            console.log('\n💡 This error means the flow is working - the user already has a request for this tournament.');
            console.log('💡 Try using a different user or tournament, or check existing requests in the admin panel.');
        }
    }
}

testCompleteFlow();
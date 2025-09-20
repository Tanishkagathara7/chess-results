const axios = require('axios');

async function createNewUserAndRequest() {
    try {
        console.log('📝 Creating new user and tournament request...\n');
        
        // First, register a new user
        console.log('👤 Registering new user...');
        const registerResponse = await axios.post('http://localhost:3001/api/auth/register', {
            name: 'Test Player',
            email: 'testplayer@example.com',
            password: 'password123',
            phone: '+919876543210',
            rating: 1500
        });
        
        console.log('✅ User registered successfully!');
        console.log('User ID:', registerResponse.data.user.id);
        
        // Login with the new user
        console.log('\n🔑 Logging in as new user...');
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
        const tournament = tournaments[2] || tournaments[1] || tournaments[0]; // Pick third tournament
        console.log(`🎯 Selected tournament: ${tournament.name} (${tournament.location})`);
        
        // Create request
        console.log('\n📝 Creating tournament request...');
        const requestResponse = await axios.post('http://localhost:3001/api/tournament-requests', {
            tournament_id: tournament.id,
            preferred_rating: 1500,
            notes: 'Hello! I am Test Player and I would like to join this tournament. Looking forward to participating!'
        }, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        console.log('✅ Tournament request created successfully!');
        console.log('Request ID:', requestResponse.data.request_id);
        console.log('Status:', requestResponse.data.status);
        console.log('Tournament:', requestResponse.data.tournament_name);
        
        // Verify the request is now pending
        console.log('\n✅ Verifying request appears in admin panel...');
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
        
        console.log('\n🎊 SUCCESS! Now you can:');
        console.log('1. Refresh your admin panel');
        console.log('2. Go to "Requests" tab');
        console.log(`3. You should see ${pendingRequests.length} pending request`);
        console.log('4. Click "Approve" to approve the request');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        if (error.response?.status === 400 && error.response?.data?.error?.includes('Email already exists')) {
            console.log('💡 User already exists, trying to use existing user instead...');
            
            // Try with existing user
            try {
                const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
                    email: 'test@example.com',
                    password: 'password123'
                });
                console.log('✅ Using existing test user');
                // Continue with request creation...
            } catch (loginError) {
                console.log('❌ Could not login with existing user either');
            }
        }
    }
}

createNewUserAndRequest();
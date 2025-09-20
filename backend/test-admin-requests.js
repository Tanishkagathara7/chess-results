const axios = require('axios');

async function testAdminRequests() {
    try {
        console.log('🔍 Testing admin requests endpoint...\n');
        
        // Login as admin
        console.log('🔑 Logging in as admin...');
        const adminLoginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            email: 'admin@chessresults.com',
            password: 'admin123'
        });
        
        const adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin login successful\n');
        
        // Test different status queries
        const statuses = ['pending', 'approved', 'rejected'];
        
        for (const status of statuses) {
            console.log(`📋 Checking ${status} requests...`);
            const requestsResponse = await axios.get(`http://localhost:3001/api/tournament-requests?status=${status}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            
            const requests = requestsResponse.data;
            console.log(`Found ${requests.length} ${status} requests:`);
            requests.forEach((req, idx) => {
                console.log(`  ${idx + 1}. ${req.user.name} → ${req.tournament.name} (${req.status}) - ${req.request_date}`);
            });
            console.log('');
        }
        
        // Test without status filter (should default to pending)
        console.log('📋 Checking default requests (should be pending)...');
        const defaultResponse = await axios.get('http://localhost:3001/api/tournament-requests', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const defaultRequests = defaultResponse.data;
        console.log(`Found ${defaultRequests.length} default requests:`);
        defaultRequests.forEach((req, idx) => {
            console.log(`  ${idx + 1}. ${req.user.name} → ${req.tournament.name} (${req.status}) - ${req.request_date}`);
        });
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAdminRequests();
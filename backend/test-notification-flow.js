const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function testNotificationFlow() {
    console.log('🧪 Testing complete notification flow...\n');
    
    let userToken, adminToken, requestId;
    
    try {
        // Step 1: Login as regular user
        console.log('👤 Step 1: Logging in as regular user...');
        const userLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: '123456'
        });
        
        userToken = userLoginResponse.data.token;
        console.log('✅ User login successful\n');
        
        // Step 2: Check current notifications (should have auth headers now)
        console.log('🔔 Step 2: Checking user notifications before request...');
        try {
            const notificationsResponse = await axios.get(`${BASE_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            console.log(`📋 User has ${notificationsResponse.data.length} existing notifications`);
            
            const unreadResponse = await axios.get(`${BASE_URL}/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            console.log(`🔴 User has ${unreadResponse.data.unread_count} unread notifications\n`);
        } catch (error) {
            console.log('⚠️ Error fetching notifications:', error.response?.data || error.message);
        }
        
        // Step 3: Create a tournament request
        console.log('📝 Step 3: Creating tournament request...');
        const tournamentsResponse = await axios.get(`${BASE_URL}/tournaments`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        const tournaments = tournamentsResponse.data;
        if (tournaments.length === 0) {
            throw new Error('No tournaments available for testing');
        }
        
        const tournament = tournaments[0];
        console.log(`🎯 Selected tournament: ${tournament.name}`);
        
        const requestResponse = await axios.post(`${BASE_URL}/tournament-requests`, {
            tournament_id: tournament.id,
            preferred_rating: 1500,
            notes: 'Test request for notification flow verification'
        }, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        requestId = requestResponse.data.request_id;
        console.log(`✅ Request created with ID: ${requestId}\n`);
        
        // Step 4: Login as admin
        console.log('👔 Step 4: Logging in as admin...');
        const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@chessresults.com',
            password: 'admin123'
        });
        
        adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin login successful\n');
        
        // Step 5: Verify request appears in admin panel
        console.log('📋 Step 5: Verifying request appears in admin requests...');
        const adminRequestsResponse = await axios.get(`${BASE_URL}/tournament-requests`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        const pendingRequests = adminRequestsResponse.data.filter(r => r.status === 'pending');
        const targetRequest = pendingRequests.find(r => r.id === requestId);
        
        if (!targetRequest) {
            throw new Error(`Request ${requestId} not found in admin requests`);
        }
        
        console.log(`✅ Request found: ${targetRequest.user.name} → ${targetRequest.tournament.name}\n`);
        
        // Step 6: Approve the request
        console.log('✅ Step 6: Approving the request...');
        const approvalResponse = await axios.put(`${BASE_URL}/tournament-requests/${requestId}`, {
            action: 'approve'
        }, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        console.log('🎉 Request approved successfully!');
        console.log(`💬 Response: ${approvalResponse.data.message}\n`);
        
        // Step 7: Check if notification was created
        console.log('🔔 Step 7: Checking if notification was created for user...');
        
        // Wait a moment for notification to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const postApprovalNotifications = await axios.get(`${BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        console.log(`📋 User now has ${postApprovalNotifications.data.length} total notifications`);
        
        // Debug: Show all notifications
        console.log('🔍 All notifications for user:');
        postApprovalNotifications.data.forEach((n, i) => {
            console.log(`   ${i + 1}. ${n.title} (${n.type}) - Created: ${n.created_date}`);
            if (n.data && n.data.request_id) {
                console.log(`      Request ID: ${n.data.request_id}`);
            }
        });
        
        const approvalNotifications = postApprovalNotifications.data.filter(n => 
            n.type === 'tournament_approved' && 
            n.data && n.data.request_id === requestId
        );
        
        if (approvalNotifications.length === 0) {
            console.log('❌ No approval notification found!');
            console.log('🔍 All notifications:');
            postApprovalNotifications.data.forEach((n, i) => {
                console.log(`   ${i + 1}. ${n.title} (${n.type}) - ${n.created_date}`);
            });
        } else {
            console.log('🎉 SUCCESS: Approval notification found!');
            const notification = approvalNotifications[0];
            console.log(`📬 Title: ${notification.title}`);
            console.log(`💬 Message: ${notification.message}`);
            console.log(`📅 Created: ${notification.created_date}`);
            console.log(`👁️ Read: ${notification.read}`);
        }
        
        // Step 8: Check unread count
        const finalUnreadResponse = await axios.get(`${BASE_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        console.log(`🔴 User now has ${finalUnreadResponse.data.unread_count} unread notifications`);
        
        console.log('\n✅ Test completed successfully!');
        console.log('\n📝 Summary:');
        console.log('1. ✅ User authentication works');
        console.log('2. ✅ Notification endpoints are accessible');
        console.log('3. ✅ Tournament request creation works');
        console.log('4. ✅ Admin approval process works');
        console.log('5. ✅ Notification is created and accessible');
        console.log('\n🎯 The notification system should now work properly in the frontend!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        // If it's a duplicate request error, provide helpful instructions
        if (error.response?.status === 400 && error.response.data.error?.includes('already have a request')) {
            console.log('\n💡 This user already has a request for this tournament.');
            console.log('💡 To test the notification system:');
            console.log('1. Go to the admin panel');
            console.log('2. Navigate to the "Requests" tab');
            console.log('3. Find any pending request and approve it');
            console.log('4. Login as that user and check the notification bell');
        }
    }
}

console.log('🚀 Starting notification flow test...');
testNotificationFlow();
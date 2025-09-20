const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function testTournamentOverComplete() {
    console.log('🧪 Testing complete Tournament Over functionality...\n');
    
    try {
        // Test 1: Verify backend prevents joining ended tournament
        console.log('🔒 Test 1: Backend validation for ended tournament...');
        
        const userLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: '123456'
        });
        
        const userToken = userLoginResponse.data.token;
        console.log('✅ User logged in successfully');
        
        // Try to join the ended tournament "ddv"
        console.log('📝 Attempting to join ended tournament "ddv"...');
        
        // First get the tournament ID for ddv
        const tournamentsResponse = await axios.get(`${BASE_URL}/tournaments`);
        const tournaments = tournamentsResponse.data;
        const ddvTournament = tournaments.find(t => t.name === 'ddv');
        
        if (ddvTournament) {
            try {
                const joinResponse = await axios.post(`${BASE_URL}/tournament-requests`, {
                    tournament_id: ddvTournament.id,
                    preferred_rating: 1500,
                    notes: 'Test request for ended tournament'
                }, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                
                console.log('❌ ERROR: Backend should have rejected request for ended tournament!');
            } catch (error) {
                if (error.response?.status === 400) {
                    console.log('✅ Backend correctly rejected request for ended tournament');
                    console.log(`   Message: ${error.response.data.error}`);
                } else {
                    console.log('❓ Unexpected error:', error.response?.data || error.message);
                }
            }
        } else {
            console.log('⚠️ ddv tournament not found');
        }
        
        // Test 2: Try to join a future tournament (should work)
        console.log('\n🟢 Test 2: Joining future tournament...');
        const futureTournament = tournaments.find(t => t.name === 'mxs');
        
        if (futureTournament) {
            try {
                const joinResponse = await axios.post(`${BASE_URL}/tournament-requests`, {
                    tournament_id: futureTournament.id,
                    preferred_rating: 1500,
                    notes: 'Test request for future tournament'
                }, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                
                console.log('✅ Successfully created request for future tournament');
                console.log(`   Request ID: ${joinResponse.data.request_id}`);
            } catch (error) {
                if (error.response?.data?.error?.includes('already have a request')) {
                    console.log('✅ User already has a request for this tournament (that\'s fine)');
                } else {
                    console.log('❓ Unexpected error:', error.response?.data || error.message);
                }
            }
        }
        
        // Test 3: Display comprehensive status report
        console.log('\n📊 Test 3: Tournament status summary...');
        
        console.log('\n📋 Current Tournament Status:');
        tournaments.forEach((tournament, index) => {
            const now = new Date();
            const startDate = new Date(tournament.start_date);
            const endDate = new Date(tournament.end_date);
            
            let status = '';
            let frontendButton = '';
            let backendBehavior = '';
            
            if (now > endDate) {
                status = '🏁 ENDED';
                frontendButton = 'Tournament Over 🏁 (gray, disabled)';
                backendBehavior = 'Rejects join requests';
            } else if (now >= startDate) {
                status = '🔴 STARTED';
                frontendButton = 'Tournament Started (gray, disabled)';
                backendBehavior = 'Rejects join requests';
            } else {
                status = '🟢 UPCOMING';
                frontendButton = 'Request to Join (blue, enabled)';
                backendBehavior = 'Accepts join requests';
            }
            
            console.log(`\n${index + 1}. ${tournament.name}`);
            console.log(`   📅 ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
            console.log(`   📊 Status: ${status}`);
            console.log(`   🎯 Frontend: ${frontendButton}`);
            console.log(`   🔧 Backend: ${backendBehavior}`);
        });
        
        console.log('\n🎯 Frontend Testing Instructions:');
        console.log('1. Open your frontend tournaments page');
        console.log('2. Refresh the page if needed');
        console.log('3. Verify each tournament shows the expected button above');
        console.log('4. Try clicking buttons - ended/started tournaments should be disabled');
        console.log('5. Future tournaments should allow joining (if not already joined)');
        
        console.log('\n✨ Expected Results:');
        console.log('✅ Backend prevents joining ended tournaments');
        console.log('✅ Frontend shows "Tournament Over 🏁" for ended tournaments');
        console.log('✅ Frontend shows "Tournament Started" for ongoing tournaments');
        console.log('✅ Frontend shows "Request to Join" for future tournaments');
        console.log('✅ All ended/started tournament buttons are disabled');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testTournamentOverComplete();
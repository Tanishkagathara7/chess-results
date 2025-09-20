const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function testJoinStatusFix() {
    console.log('🧪 Testing tournament join status fix...\n');
    
    try {
        // Login as a user who has tournaments
        console.log('🔑 Logging in as user with existing tournaments...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: '123456'
        });
        
        const userToken = loginResponse.data.token;
        const user = loginResponse.data.user;
        console.log(`✅ Logged in as: ${user.name} (${user.email})\n`);
        
        // Get tournaments
        console.log('📋 Fetching tournaments...');
        const tournamentsResponse = await axios.get(`${BASE_URL}/tournaments`);
        const tournaments = tournamentsResponse.data;
        console.log(`Found ${tournaments.length} tournaments\n`);
        
        // Get user's player profile
        console.log('👤 Finding user player profile...');
        const playersResponse = await axios.get(`${BASE_URL}/players`);
        const userPlayer = playersResponse.data.find(p => p.user_id === user.id);
        
        if (!userPlayer) {
            console.log('❌ No player profile found for this user');
            return;
        }
        
        console.log(`✅ Found player profile: ${userPlayer.name} (ID: ${userPlayer.id})\n`);
        
        // Check status for each tournament
        console.log('🔍 Checking join status for each tournament...');
        
        for (const tournament of tournaments) {
            console.log(`\n🏆 Tournament: ${tournament.name}`);
            
            // Check if user is a participant
            try {
                const participantsResponse = await axios.get(`${BASE_URL}/tournaments/${tournament.id}/participants`);
                const isParticipant = participantsResponse.data.some(p => p.player_id === userPlayer.id);
                
                if (isParticipant) {
                    console.log(`  ✅ Status: JOINED (participant)`);
                    continue;
                }
            } catch (error) {
                console.log(`  ⚠️ Could not check participants: ${error.message}`);
            }
            
            // Check if user has requests
            try {
                const requestsResponse = await axios.get(`${BASE_URL}/my-requests`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                
                const userRequest = requestsResponse.data.find(r => r.tournament_id === tournament.id);
                
                if (userRequest) {
                    console.log(`  📨 Status: ${userRequest.status.toUpperCase()} REQUEST`);
                } else {
                    console.log(`  ⚪ Status: NO REQUEST`);
                }
            } catch (error) {
                console.log(`  ⚠️ Could not check requests: ${error.message}`);
            }
        }
        
        console.log('\n🎯 Summary:');
        console.log('The frontend should now properly show:');
        console.log('- "🏆 Joined" for tournaments where user is already registered');
        console.log('- "Request Pending 🕰️" for tournaments with pending requests');
        console.log('- "Request to Join" for tournaments with no requests');
        console.log('\n✅ Test completed! Check your frontend to verify the buttons show correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testJoinStatusFix();
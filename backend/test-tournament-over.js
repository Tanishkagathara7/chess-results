const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function testTournamentOverStatus() {
    console.log('🧪 Testing Tournament Over status...\n');
    
    try {
        // Login as admin to create a test tournament
        console.log('🔑 Logging in as admin...');
        const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@chessresults.com',
            password: 'admin123'
        });
        
        const adminToken = adminLoginResponse.data.token;
        console.log('✅ Admin login successful\n');
        
        // Create a tournament with past end date
        console.log('📝 Creating test tournament with past end date...');
        
        const pastStartDate = new Date();
        pastStartDate.setDate(pastStartDate.getDate() - 5); // Started 5 days ago
        
        const pastEndDate = new Date();
        pastEndDate.setDate(pastEndDate.getDate() - 1); // Ended 1 day ago
        
        const tournamentData = {
            name: 'Test Past Tournament',
            location: 'Test Location',
            start_date: pastStartDate.toISOString(),
            end_date: pastEndDate.toISOString(),
            rounds: 5,
            time_control: '90+30',
            arbiter: 'Test Arbiter'
        };
        
        const createResponse = await axios.post(`${BASE_URL}/tournaments`, tournamentData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        console.log('✅ Created past tournament:', createResponse.data.name);
        console.log(`   Started: ${pastStartDate.toLocaleDateString()}`);
        console.log(`   Ended: ${pastEndDate.toLocaleDateString()}`);
        
        // Also create a future tournament for comparison
        console.log('\n📝 Creating test tournament with future dates...');
        
        const futureStartDate = new Date();
        futureStartDate.setDate(futureStartDate.getDate() + 5); // Starts in 5 days
        
        const futureEndDate = new Date();
        futureEndDate.setDate(futureEndDate.getDate() + 7); // Ends in 7 days
        
        const futureTournamentData = {
            name: 'Test Future Tournament',
            location: 'Test Location',
            start_date: futureStartDate.toISOString(),
            end_date: futureEndDate.toISOString(),
            rounds: 3,
            time_control: '90+30',
            arbiter: 'Test Arbiter'
        };
        
        const createFutureResponse = await axios.post(`${BASE_URL}/tournaments`, futureTournamentData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        console.log('✅ Created future tournament:', createFutureResponse.data.name);
        console.log(`   Starts: ${futureStartDate.toLocaleDateString()}`);
        console.log(`   Ends: ${futureEndDate.toLocaleDateString()}`);
        
        // Get all tournaments to verify
        console.log('\n📋 Checking current tournaments...');
        const tournamentsResponse = await axios.get(`${BASE_URL}/tournaments`);
        const tournaments = tournamentsResponse.data;
        
        console.log(`\nFound ${tournaments.length} tournaments:`);
        tournaments.forEach((tournament, index) => {
            const now = new Date();
            const startDate = new Date(tournament.start_date);
            const endDate = new Date(tournament.end_date);
            
            let status = '';
            if (now > endDate) {
                status = '🏁 ENDED';
            } else if (now >= startDate) {
                status = '🔴 STARTED';
            } else {
                status = '🟢 UPCOMING';
            }
            
            console.log(`${index + 1}. ${tournament.name}`);
            console.log(`   📅 ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
            console.log(`   📊 Status: ${status}`);
            console.log('');
        });
        
        console.log('🎯 Frontend Testing:');
        console.log('Now check your frontend tournaments page:');
        console.log('- "Test Past Tournament" should show "Tournament Over 🏁"');
        console.log('- "Test Future Tournament" should show "Request to Join"');
        console.log('- Other tournaments should show appropriate status based on their dates');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testTournamentOverStatus();
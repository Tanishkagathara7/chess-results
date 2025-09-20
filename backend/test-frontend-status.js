const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function testFrontendStatus() {
    console.log('🧪 Testing frontend tournament status display...\n');
    
    try {
        // Get tournaments from API (same as frontend)
        const tournamentsResponse = await axios.get(`${BASE_URL}/tournaments`);
        const tournaments = tournamentsResponse.data;
        
        console.log('📋 Tournaments and expected frontend status:\n');
        
        tournaments.forEach((tournament, index) => {
            const now = new Date();
            const startDate = new Date(tournament.start_date);
            const endDate = new Date(tournament.end_date);
            
            console.log(`${index + 1}. ${tournament.name}`);
            console.log(`   📅 ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
            
            let expectedButton = '';
            let buttonColor = '';
            
            if (now > endDate) {
                expectedButton = 'Tournament Over 🏁';
                buttonColor = 'Gray (disabled)';
            } else if (now >= startDate) {
                expectedButton = 'Tournament Started';
                buttonColor = 'Gray (disabled)';
            } else {
                expectedButton = 'Request to Join (or user-specific status)';
                buttonColor = 'Blue/Green/Yellow (depends on user status)';
            }
            
            console.log(`   🎯 Expected Button: ${expectedButton}`);
            console.log(`   🎨 Button Color: ${buttonColor}`);
            console.log('');
        });
        
        console.log('🎯 Frontend Testing Checklist:');
        console.log('1. Open your frontend tournaments page');
        console.log('2. Check that each tournament shows the expected button above');
        console.log('3. Verify button colors match the expectations');
        console.log('4. Try clicking disabled buttons - they should not be clickable');
        console.log('5. Refresh the page several times - buttons should remain consistent');
        
        console.log('\n✨ Specific Expected Results:');
        console.log('- "ddv" → "Tournament Over 🏁" (gray, disabled)');
        console.log('- "mxs" → "Request to Join" (blue, enabled for new users)');
        console.log('- "mmm" → "Tournament Started" (gray, disabled for non-participants)');
        console.log('- "John Doe" → "Request to Join" (blue, enabled for new users)');
        console.log('- "cds" → "Tournament Started" (gray, disabled for non-participants)');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testFrontendStatus();
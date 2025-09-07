const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test data for round-specific eliminations
const testTournamentData = {
    "name": "Test Championship",
    "location": "Test City", 
    "start_date": "2025-01-15T00:00:00.000Z",
    "end_date": "2025-01-17T00:00:00.000Z",
    "rounds": 4,
    "time_control": "90+30",
    "arbiter": "Test Arbiter",
    "tournament_type": "knockout",
    "round_eliminations": [
        { "round": 1, "eliminations": 1 },
        { "round": 2, "eliminations": 1 },
        { "round": 3, "eliminations": 0 },
        { "round": 4, "eliminations": 0 }
    ]
};

// Test data for regular eliminations
const testTournamentDataRegular = {
    "name": "Regular Tournament",
    "location": "Test City", 
    "start_date": "2025-01-15T00:00:00.000Z",
    "end_date": "2025-01-17T00:00:00.000Z",
    "rounds": 4,
    "time_control": "90+30",
    "arbiter": "Test Arbiter",
    "tournament_type": "swiss",
    "elimination_per_round": 2
};

async function testAPI() {
    try {
        console.log('Testing regular tournament creation...');
        const regularResponse = await axios.post(`${API_BASE}/tournaments`, testTournamentDataRegular);
        console.log('✅ Regular tournament created:', regularResponse.data);
    } catch (error) {
        console.log('❌ Regular tournament error:', error.response?.data || error.message);
    }

    try {
        console.log('\\nTesting round-specific tournament creation...');
        const roundSpecificResponse = await axios.post(`${API_BASE}/tournaments`, testTournamentData);
        console.log('✅ Round-specific tournament created:', roundSpecificResponse.data);
    } catch (error) {
        console.log('❌ Round-specific tournament error:', error.response?.data || error.message);
    }
}

testAPI();

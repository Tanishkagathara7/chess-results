const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

// Test function for round results API
async function testRoundResults() {
    try {
        console.log('🧪 Testing Tournament Round Results API...\n');

        // First, get list of tournaments
        console.log('1. Fetching tournaments...');
        const tournamentsResponse = await axios.get(`${API}/tournaments`);
        const tournaments = tournamentsResponse.data;
        
        if (tournaments.length === 0) {
            console.log('❌ No tournaments found. Please create a tournament first.');
            return;
        }

        const tournament = tournaments[0]; // Use first tournament
        console.log(`✅ Using tournament: ${tournament.name} (ID: ${tournament.id})`);

        // Test round results for each round
        for (let round = 1; round <= tournament.rounds; round++) {
            console.log(`\n2. Testing round ${round} results...`);
            
            try {
                const roundResponse = await axios.get(`${API}/tournaments/${tournament.id}/rounds/${round}/results`);
                const roundData = roundResponse.data;
                
                console.log(`✅ Round ${round} results loaded successfully`);
                console.log(`   - Tournament: ${roundData.tournament_name}`);
                console.log(`   - Round Status: ${roundData.round_status}`);
                console.log(`   - Active Players: ${roundData.standings.length}`);
                console.log(`   - Eliminated Players: ${roundData.eliminated_players.length}`);
                console.log(`   - Games: ${roundData.round_summary.completed_games}/${roundData.round_summary.total_games}`);
                console.log(`   - Eliminations: ${roundData.round_summary.actual_eliminations}/${roundData.round_summary.eliminations_count}`);

                if (roundData.standings.length > 0) {
                    console.log(`   - Top 3 players after round ${round}:`);
                    roundData.standings.slice(0, 3).forEach((player, index) => {
                        console.log(`     ${index + 1}. ${player.player_name} - ${player.points} points`);
                    });
                }

            } catch (error) {
                if (error.response?.status === 404) {
                    console.log(`⚠️  Round ${round} has no pairings/results yet`);
                } else {
                    console.log(`❌ Error fetching round ${round}:`, error.response?.data?.error || error.message);
                }
            }
        }

        // Test tournament participants
        console.log(`\n3. Testing tournament participants...`);
        const participantsResponse = await axios.get(`${API}/tournaments/${tournament.id}/participants`);
        const participants = participantsResponse.data;
        console.log(`✅ Found ${participants.length} participants`);

        // Show elimination summary
        const activeParticipants = participants.filter(p => p.status !== 'eliminated' && p.status !== 'withdrawn');
        const eliminatedParticipants = participants.filter(p => p.status === 'eliminated');
        
        console.log(`   - Active: ${activeParticipants.length}`);
        console.log(`   - Eliminated: ${eliminatedParticipants.length}`);
        
        if (eliminatedParticipants.length > 0) {
            console.log('   - Eliminated players:');
            eliminatedParticipants.forEach(p => {
                console.log(`     - ${p.player.name} (Round ${p.eliminated_round || 'N/A'})`);
            });
        }

        console.log('\n🎉 Round results API test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testRoundResults();

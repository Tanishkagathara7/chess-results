const http = require('http');

function testRoundResults() {
    // VCD tournament ID from our earlier check
    const tournamentId = 'aa0c4941-43aa-4dac-b8ea-ccb759f1d48a';
    
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: `/api/tournaments/${tournamentId}/rounds/1/results`,
        method: 'GET'
    };
    
    console.log('🔍 Testing round results endpoint...');
    console.log('📡 Request:', `http://localhost:3001${options.path}`);
    console.log('='.repeat(60));
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const results = JSON.parse(data);
                
                console.log('✅ Response Status:', res.statusCode);
                console.log('🏆 Tournament:', results.tournament_name);
                console.log('📅 Round:', results.round, 'of', results.total_rounds);
                console.log('📊 Round Status:', results.round_status);
                
                if (results.round_summary) {
                    console.log('🎯 Games:', results.round_summary.completed_games + '/' + results.round_summary.total_games);
                    console.log('👥 Players:', results.round_summary.remaining_players, 'active');
                }
                
                if (results.standings) {
                    console.log('\n🏅 Standings:');
                    console.log('-'.repeat(40));
                    results.standings.forEach(player => {
                        const eliminated = player.is_eliminated ? ' (ELIMINATED)' : '';
                        const icon = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : '  ';
                        console.log(`${icon} ${player.rank}. ${player.player_name} - ${player.points} pts (${player.wins}-${player.draws}-${player.losses})${eliminated}`);
                    });
                } else {
                    console.log('❌ No standings in response');
                }
                
                if (results.eliminated_players && results.eliminated_players.length > 0) {
                    console.log('\n❌ Eliminated Players:');
                    results.eliminated_players.forEach(player => {
                        console.log(`   ${player.player_name} - ${player.points} points`);
                    });
                }
                
            } catch (e) {
                console.error('❌ Error parsing response:', e.message);
                console.log('📄 Raw response:', data);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('❌ Request failed:', err.message);
    });
    
    req.end();
}

testRoundResults();
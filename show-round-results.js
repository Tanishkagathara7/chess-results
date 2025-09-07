const http = require('http');

function showRoundResults() {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/tournaments/f6658398-e8a4-463f-91c6-6e38d46822bb/rounds/1/results',
        method: 'GET'
    };
    
    console.log('🏆 DDV Tournament - Round 1 Results');
    console.log('=' .repeat(50));
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const results = JSON.parse(data);
                
                console.log(`Tournament: ${results.tournament_name}`);
                console.log(`Round: ${results.round} of ${results.total_rounds}`);
                console.log(`Status: ${results.round_status}`);
                console.log(`Games: ${results.round_summary.completed_games}/${results.round_summary.total_games}`);
                console.log(`Active Players: ${results.round_summary.remaining_players}`);
                console.log(`Eliminations: ${results.round_summary.actual_eliminations}`);
                
                console.log('\n🏅 Standings after Round 1:');
                console.log('-'.repeat(30));
                results.standings.forEach(player => {
                    const icon = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : '  ';
                    console.log(`${icon} ${player.rank}. ${player.player_name} - ${player.points} points (${player.wins}-${player.draws}-${player.losses})`);
                });
                
                if (results.eliminated_players.length > 0) {
                    console.log('\n❌ Eliminated Players:');
                    results.eliminated_players.forEach(player => {
                        console.log(`   ${player.player_name} - ${player.points} points`);
                    });
                } else {
                    console.log('\n✅ No eliminations this round');
                }
                
                console.log('\n🎯 Round 1 Games:');
                console.log('-'.repeat(30));
                results.round_summary.round_pairings.forEach(game => {
                    const white = game.white_player?.name || 'Unknown';
                    const black = game.black_player?.name || 'Bye';
                    const result = game.result || 'No result';
                    console.log(`Board ${game.board_number}: ${white} vs ${black} - ${result}`);
                });
                
            } catch (e) {
                console.error('Error parsing results:', e.message);
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('Request failed:', err);
    });
    
    req.end();
}

showRoundResults();

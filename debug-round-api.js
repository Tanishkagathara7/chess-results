// Simple debug script using Node.js built-in modules
const https = require('http');
const url = require('url');

function makeRequest(urlString) {
    return new Promise((resolve, reject) => {
        const options = url.parse(urlString);
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, error: e.message });
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.end();
    });
}

async function debugRoundAPI() {
    console.log('🔍 Debugging Round Results API...\n');
    
    const tournamentId = 'f6658398-e8a4-463f-91c6-6e38d46822bb';
    
    try {
        console.log('1. Testing round 1 results API...');
        const result = await makeRequest(`http://localhost:3001/api/tournaments/${tournamentId}/rounds/1/results`);
        
        console.log('Status Code:', result.status);
        
        if (result.status === 200) {
            console.log('✅ Success! Round 1 results:');
            console.log('Tournament:', result.data.tournament_name);
            console.log('Round Status:', result.data.round_status);
            console.log('Active Players:', result.data.standings.length);
            console.log('Eliminated Players:', result.data.eliminated_players.length);
            
            console.log('\nTop standings:');
            result.data.standings.slice(0, 3).forEach(player => {
                console.log(`- ${player.player_name}: ${player.points} points`);
            });
        } else {
            console.log('❌ Error Response:');
            console.log(result.data);
        }
        
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
}

debugRoundAPI();

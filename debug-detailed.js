const http = require('http');

// Simple test to see server logs
function testRoundResults() {
    const postData = '';
    
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/tournaments/f6658398-e8a4-463f-91c6-6e38d46822bb/rounds/1/results',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    console.log('🔍 Making request to round results API...');
    console.log('URL:', `http://${options.hostname}:${options.port}${options.path}`);
    
    const req = http.request(options, (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Response body:');
            try {
                const jsonData = JSON.parse(data);
                console.log(JSON.stringify(jsonData, null, 2));
            } catch (e) {
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('Request error:', err);
    });
    
    req.end();
}

// Also test participants endpoint to verify data structure
function testParticipants() {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/tournaments/f6658398-e8a4-463f-91c6-6e38d46822bb/participants',
        method: 'GET'
    };
    
    console.log('\n🧪 Testing participants endpoint...');
    
    const req = http.request(options, (res) => {
        console.log(`Participants Status Code: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const participants = JSON.parse(data);
                console.log(`✅ Found ${participants.length} participants`);
                if (participants.length > 0) {
                    console.log('First participant structure:');
                    console.log(JSON.stringify(participants[0], null, 2));
                }
            } catch (e) {
                console.log('Participants parse error:', e.message);
            }
        });
    });
    
    req.on('error', (err) => {
        console.error('Participants request error:', err);
    });
    
    req.end();
}

// Run tests
testRoundResults();
setTimeout(testParticipants, 1000);

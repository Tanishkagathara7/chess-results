const fetch = require('node-fetch');
require('dotenv').config();

const API_BASE = 'http://localhost:3001/api';

async function login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Login failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.token;
}

async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${error}`);
    }
    
    return await response.json();
}

async function testNotificationFlow() {
    console.log('🧪 Testing email notification flow via API...\n');
    
    try {
        // Step 1: Login as admin
        console.log('🔐 Logging in as admin...');
        let adminToken;
        
        // Try different admin credentials
        const adminCredentials = [
            { email: 'admin@admin.com', password: 'admin123' },
            { email: 'admin@example.com', password: 'admin123' },
            { email: 'kagatharatanish@gmail.com', password: 'password123' },
            { email: 'oneloki05@gmail.com', password: 'password123' }
        ];
        
        for (const cred of adminCredentials) {
            try {
                console.log(`🔑 Trying login with ${cred.email}...`);
                adminToken = await login(cred.email, cred.password);
                console.log('✅ Admin login successful');
                break;
            } catch (error) {
                console.log(`❌ Login failed for ${cred.email}:`, error.message);
            }
        }
        
        if (!adminToken) {
            throw new Error('Could not login with any admin credentials');
        }
        
        const authHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        };
        
        // Step 2: Get tournaments
        console.log('\n📋 Getting tournaments...');
        const tournaments = await apiCall('/tournaments');
        if (tournaments.length === 0) {
            console.log('❌ No tournaments found');
            return;
        }
        
        const tournament = tournaments[0];
        console.log('✅ Found tournament:', tournament.name);
        
        // Step 3: Get players
        console.log('\n👥 Getting players...');
        const players = await apiCall('/players');
        if (players.length === 0) {
            console.log('❌ No players found');
            return;
        }
        
        // Find a player with the test email or create one
        let testPlayer = players.find(p => p.email === 'oneloki05@gmail.com');
        if (!testPlayer) {
            console.log('ℹ️  Player with oneloki05@gmail.com not found, looking for any player...');
            testPlayer = players[0];
        }
        
        console.log('✅ Found player:', testPlayer.name, 'Email:', testPlayer.email || 'No email');
        
        // Step 4: Check if player is already in tournament
        console.log('\n🔍 Checking tournament participants...');
        const participants = await apiCall(`/tournaments/${tournament.id}/participants`);
        const isAlreadyParticipant = participants.some(p => p.player_id === testPlayer.id);
        
        if (isAlreadyParticipant) {
            console.log('⚠️  Player is already a participant. Removing first...');
            try {
                await fetch(`${API_BASE}/tournaments/${tournament.id}/participants/${testPlayer.id}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });
                console.log('✅ Player removed from tournament');
            } catch (error) {
                console.log('⚠️  Could not remove player:', error.message);
            }
        }
        
        // Step 5: Add player to tournament (this should trigger email notification)
        console.log('\n➕ Adding player to tournament...');
        console.log('📧 This should trigger an email notification to:', testPlayer.email || 'No email set');
        
        const addResult = await fetch(`${API_BASE}/tournaments/${tournament.id}/participants`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ player_id: testPlayer.id })
        });
        
        if (!addResult.ok) {
            const error = await addResult.text();
            console.log('❌ Failed to add player:', error);
            return;
        }
        
        const result = await addResult.json();
        console.log('✅ Player added successfully!');
        console.log('📧 Email notification sent:', result.notification_sent ? '✅' : '❌');
        
        if (result.notification_sent) {
            console.log('\n🎉 Email notification should have been sent!');
            console.log('📬 Check the email inbox for oneloki05@gmail.com');
        } else {
            console.log('\n⚠️  Email notification was not sent');
            console.log('Possible reasons:');
            console.log('- Player does not have an associated user account');
            console.log('- User account does not have email address');
            console.log('- SMTP configuration issue');
        }
        
        // Step 6: Check if in-app notification was created
        console.log('\n🔔 Checking for in-app notifications...');
        try {
            // Login as the player's user to check notifications
            const users = await apiCall('/admin/users', { 
                method: 'GET', 
                headers: authHeaders 
            });
            
            const playerUser = users.find(u => u.email === 'oneloki05@gmail.com');
            if (playerUser) {
                console.log('✅ Found user account for oneloki05@gmail.com');
                
                // Try to login as that user to check notifications
                try {
                    const userToken = await login('oneloki05@gmail.com', 'password123'); // Assuming default password
                    const userAuthHeaders = {
                        'Authorization': `Bearer ${userToken}`
                    };
                    
                    const notifications = await apiCall('/notifications', { 
                        method: 'GET', 
                        headers: userAuthHeaders 
                    });
                    
                    console.log('📱 In-app notifications:', notifications.length);
                    const recentNotif = notifications.find(n => 
                        n.type === 'tournament_admin_added' && 
                        n.data?.tournament_id === tournament.id
                    );
                    
                    if (recentNotif) {
                        console.log('✅ Found in-app notification for tournament addition');
                    } else {
                        console.log('❌ No in-app notification found');
                    }
                } catch (loginError) {
                    console.log('⚠️  Could not login as test user to check notifications');
                }
            } else {
                console.log('❌ No user account found for oneloki05@gmail.com');
            }
        } catch (error) {
            console.log('⚠️  Could not check in-app notifications:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testNotificationFlow().then(() => {
        console.log('\n🏁 Test completed.');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { testNotificationFlow };
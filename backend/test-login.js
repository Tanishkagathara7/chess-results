const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function testLogin() {
    const commonPasswords = ['password123', 'tanish123', 'abc123', '123456', 'password'];
    
    console.log('🔑 Testing login for test@example.com...\n');
    
    for (const password of commonPasswords) {
        try {
            console.log(`Trying password: ${password}`);
            const response = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'test@example.com',
                password: password
            });
            
            console.log(`✅ SUCCESS! Password is: ${password}`);
            console.log(`Token: ${response.data.token.substring(0, 20)}...`);
            
            // Test notification endpoint
            console.log('\n🔔 Testing notification endpoint...');
            const notificationResponse = await axios.get(`${BASE_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${response.data.token}` }
            });
            
            console.log(`📋 Notifications: ${notificationResponse.data.length} found`);
            if (notificationResponse.data.length > 0) {
                notificationResponse.data.slice(0, 3).forEach((n, i) => {
                    console.log(`   ${i + 1}. ${n.title} (${n.type})`);
                });
            }
            
            return;
        } catch (error) {
            console.log(`❌ Failed with password: ${password}`);
        }
    }
    
    console.log('❌ No password worked. User might need to be created or password reset.');
}

testLogin();
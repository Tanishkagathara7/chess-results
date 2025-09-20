const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function checkUserNotifications() {
    try {
        console.log('🔔 Checking notifications for test@example.com...\n');
        
        // Login as test user
        const userLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test@example.com',
            password: '123456'
        });
        
        const userToken = userLoginResponse.data.token;
        console.log('✅ Login successful\n');
        
        // Get notifications
        const notificationsResponse = await axios.get(`${BASE_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        const notifications = notificationsResponse.data;
        console.log(`📧 Total notifications: ${notifications.length}\n`);
        
        if (notifications.length > 0) {
            notifications.forEach((notification, index) => {
                console.log(`${index + 1}. ${notification.title}`);
                console.log(`   Type: ${notification.type}`);
                console.log(`   Message: ${notification.message}`);
                console.log(`   Created: ${notification.created_date}`);
                console.log(`   Read: ${notification.read}`);
                if (notification.data) {
                    console.log(`   Data: ${JSON.stringify(notification.data, null, 2)}`);
                }
                console.log('');
            });
        } else {
            console.log('No notifications found for this user.');
        }
        
        // Check unread count
        const unreadResponse = await axios.get(`${BASE_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${userToken}` }
        });
        
        console.log(`🔴 Unread notifications: ${unreadResponse.data.unread_count}`);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

checkUserNotifications();
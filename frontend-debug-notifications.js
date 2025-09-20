// Frontend debug script - paste this into browser console to test notifications

console.log('🔍 Testing frontend notification system...\n');

// Check if user is authenticated
const token = localStorage.getItem('token');
console.log('1. Token exists:', !!token);

if (!token) {
    console.log('❌ No authentication token found. Please login first.');
    return;
}

// Decode token to see user info
try {
    const parts = token.split('.');
    if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('2. User info:', payload);
        console.log('   Role:', payload.role);
        console.log('   Email:', payload.email);
    }
} catch (error) {
    console.error('Error decoding token:', error);
}

// Test API endpoints
const API_BASE = 'http://localhost:3001/api';

// Test notifications endpoint
console.log('\n3. Testing /api/notifications endpoint...');
fetch(`${API_BASE}/notifications`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('   Status:', response.status);
    return response.json();
})
.then(data => {
    console.log('   Response:', data);
    console.log('   Notifications count:', data.length);
    if (data.length > 0) {
        console.log('   Latest notification:');
        console.log('     Title:', data[0].title);
        console.log('     Message:', data[0].message);
        console.log('     Type:', data[0].type);
        console.log('     Read:', data[0].read);
    }
})
.catch(error => {
    console.error('   Error:', error);
});

// Test unread count endpoint
console.log('\n4. Testing /api/notifications/unread-count endpoint...');
fetch(`${API_BASE}/notifications/unread-count`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('   Status:', response.status);
    return response.json();
})
.then(data => {
    console.log('   Response:', data);
    console.log('   Unread count:', data.unread_count);
})
.catch(error => {
    console.error('   Error:', error);
});

// Check if NotificationContext is loaded
console.log('\n5. Checking React components...');
if (typeof React !== 'undefined') {
    console.log('   React is loaded');
} else {
    console.log('   React not found in global scope');
}

console.log('\n6. Instructions:');
console.log('   - If APIs return 401: Authentication issue');
console.log('   - If APIs return 403: User role issue');  
console.log('   - If APIs work but no notifications show: Frontend component issue');
console.log('   - Check Network tab in DevTools for failed requests');
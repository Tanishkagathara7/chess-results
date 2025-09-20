// Debug script to check authentication status
console.log('🔍 Checking authentication state...');

// Check what's in localStorage
const token = localStorage.getItem('token');
console.log('Token exists:', !!token);

if (token) {
    try {
        // Decode JWT token (just the payload, not verifying signature)
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('Token payload:', payload);
            console.log('User role:', payload.role);
            console.log('Token expires:', new Date(payload.exp * 1000));
        }
    } catch (error) {
        console.error('Error decoding token:', error);
    }
}

// Test API call
fetch('http://localhost:3001/api/auth/verify', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log('Auth verify response status:', response.status);
    return response.json();
})
.then(data => {
    console.log('Auth verify data:', data);
})
.catch(error => {
    console.error('Auth verify error:', error);
});
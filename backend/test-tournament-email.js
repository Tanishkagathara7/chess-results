const { sendTournamentDetailsEmail } = require('./utils/mailer');
require('dotenv').config();

// Test tournament data
const testTournament = {
    id: 'tournament_001',
    name: 'Spring Chess Championship 2024',
    location: 'Community Center, Main Street',
    start_date: '2024-04-15T10:00:00Z',
    end_date: '2024-04-16T18:00:00Z',
    rounds: 6,
    time_control: '90+30 minutes',
    arbiter: 'John Smith (FIDE Arbiter)'
};

const testPlayer = {
    id: 'player_001',
    name: 'Tanish Kagathara',
    rating: 1850,
    title: 'CM'
};

async function testEmails() {
    console.log('🧪 Testing tournament email functionality...\n');
    
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    try {
        // Test 1: Tournament request approval email
        console.log('📧 Testing approval email...');
        const approvalResult = await sendTournamentDetailsEmail(
            testEmail,
            testTournament,
            testPlayer,
            { isApproval: true }
        );
        
        if (approvalResult.skipped) {
            console.log('⚠️  Email configuration not set up - email was skipped');
        } else {
            console.log('✅ Approval email sent successfully:', approvalResult.messageId);
        }
        
        // Wait a moment between emails
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 2: Admin added to tournament email
        console.log('\n📧 Testing admin-added email...');
        const adminAddedResult = await sendTournamentDetailsEmail(
            testEmail,
            testTournament,
            testPlayer,
            { isAdminAdded: true }
        );
        
        if (adminAddedResult.skipped) {
            console.log('⚠️  Email configuration not set up - email was skipped');
        } else {
            console.log('✅ Admin-added email sent successfully:', adminAddedResult.messageId);
        }
        
        console.log('\n🎉 All email tests completed successfully!');
        console.log('\n📧 Email Configuration Check:');
        console.log('- SMTP_HOST:', process.env.SMTP_HOST ? '✅ Set' : '❌ Missing');
        console.log('- SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
        console.log('- SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');
        console.log('- SMTP_FROM:', process.env.SMTP_FROM || 'Using default');
        console.log('- APP_NAME:', process.env.APP_NAME || 'Using default (Chess Results)');
        console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'Using default (http://localhost:3000)');
        
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the tests
if (require.main === module) {
    testEmails();
}

module.exports = { testEmails };
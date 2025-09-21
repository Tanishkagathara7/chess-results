const { sendTournamentResultsEmail } = require('./utils/mailer');
require('dotenv').config();

// Mock tournament data with completed results
const mockTournament = {
    id: 'tournament_001',
    name: 'Spring Chess Championship 2024',
    location: 'Community Center, Main Street',
    start_date: '2024-04-15T10:00:00Z',
    end_date: '2024-04-16T18:00:00Z',
    rounds: 5,
    time_control: '90+30 minutes',
    arbiter: 'John Smith (FIDE Arbiter)',
    tournament_over: true
};

// Mock player performance data
const mockPlayerStats = {
    player_id: 'player_001',
    player_name: 'Tanish Kagathara',
    player_rating: 1850,
    points: 3.5,
    wins: 3,
    draws: 1,
    losses: 1
};

// Mock tournament standings (top 10)
const mockStandings = [
    { rank: 1, player_id: 'player_champion', player_name: 'Alexandra Champion', player_rating: 2100, points: 4.5, wins: 4, draws: 1, losses: 0 },
    { rank: 2, player_id: 'player_runner', player_name: 'Bobby Runner', player_rating: 2050, points: 4.0, wins: 4, draws: 0, losses: 1 },
    { rank: 3, player_id: 'player_bronze', player_name: 'Charlie Bronze', player_rating: 1950, points: 4.0, wins: 3, draws: 2, losses: 0 },
    { rank: 4, player_id: 'player_001', player_name: 'Tanish Kagathara', player_rating: 1850, points: 3.5, wins: 3, draws: 1, losses: 1 },
    { rank: 5, player_id: 'player_005', player_name: 'Diana Expert', player_rating: 1900, points: 3.0, wins: 3, draws: 0, losses: 2 },
    { rank: 6, player_id: 'player_006', player_name: 'Edward Strong', player_rating: 1800, points: 3.0, wins: 2, draws: 2, losses: 1 },
    { rank: 7, player_id: 'player_007', player_name: 'Fiona Tactical', player_rating: 1750, points: 2.5, wins: 2, draws: 1, losses: 2 },
    { rank: 8, player_id: 'player_008', player_name: 'George Solid', player_rating: 1700, points: 2.0, wins: 2, draws: 0, losses: 3 },
    { rank: 9, player_id: 'player_009', player_name: 'Helen Rising', player_rating: 1650, points: 1.5, wins: 1, draws: 1, losses: 3 },
    { rank: 10, player_id: 'player_010', player_name: 'Ivan Learning', player_rating: 1600, points: 1.0, wins: 1, draws: 0, losses: 4 }
];

// Mock player games from the tournament
const mockPlayerGames = [
    {
        round: 1,
        color: 'white',
        opponent: { name: 'Alice Beginner', rating: 1400 },
        pgn_result: '1-0',
        result: 'win'
    },
    {
        round: 2,
        color: 'black',
        opponent: { name: 'Bob Intermediate', rating: 1700 },
        pgn_result: '1/2-1/2',
        result: 'draw'
    },
    {
        round: 3,
        color: 'white',
        opponent: { name: 'Charlie Bronze', rating: 1950 },
        pgn_result: '0-1',
        result: 'loss'
    },
    {
        round: 4,
        color: 'black',
        opponent: { name: 'Diana Expert', rating: 1900 },
        pgn_result: '1-0',
        result: 'win'
    },
    {
        round: 5,
        color: 'white',
        opponent: { name: 'Edward Strong', rating: 1800 },
        pgn_result: '1-0',
        result: 'win'
    }
];

async function testTournamentResultsEmail() {
    console.log('🧪 Testing tournament results email functionality...\n');
    
    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    
    try {
        console.log('📧 Sending tournament results email...');
        console.log('📊 Player Performance:');
        console.log(`   - Final Rank: #${mockPlayerStats.points} of ${mockStandings.length}`);
        console.log(`   - Score: ${mockPlayerStats.points}/${mockTournament.rounds} points`);
        console.log(`   - Record: ${mockPlayerStats.wins}W-${mockPlayerStats.draws}D-${mockPlayerStats.losses}L`);
        console.log(`   - Games: ${mockPlayerGames.length} total games`);
        
        const result = await sendTournamentResultsEmail(
            testEmail,
            mockTournament,
            mockPlayerStats,
            mockPlayerGames,
            mockStandings
        );
        
        if (result.skipped) {
            console.log('⚠️  Email configuration not set up - email was skipped');
        } else {
            console.log('✅ Tournament results email sent successfully:', result.messageId);
        }
        
        console.log('\n🎉 Tournament results email test completed successfully!');
        console.log('\n📧 Email Configuration Check:');
        console.log('- SMTP_HOST:', process.env.SMTP_HOST ? '✅ Set' : '❌ Missing');
        console.log('- SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
        console.log('- SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');
        console.log('- SMTP_FROM:', process.env.SMTP_FROM || 'Using default');
        console.log('- APP_NAME:', process.env.APP_NAME || 'Using default (Chess Results)');
        console.log('- FRONTEND_URL:', process.env.FRONTEND_URL || 'Using default (http://localhost:3000)');
        
    } catch (error) {
        console.error('❌ Tournament results email test failed:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
if (require.main === module) {
    testTournamentResultsEmail();
}

module.exports = { testTournamentResultsEmail };
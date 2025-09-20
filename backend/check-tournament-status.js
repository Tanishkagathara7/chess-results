const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkTournamentStatus() {
    console.log('🕐 Current date:', new Date().toLocaleDateString(), new Date().toLocaleTimeString());
    console.log('📅 Checking tournament status...\n');
    
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    try {
        const tournaments = await db.collection('tournaments').find({}).toArray();
        
        tournaments.forEach((tournament, index) => {
            const now = new Date();
            const startDate = new Date(tournament.start_date);
            const endDate = new Date(tournament.end_date);
            
            console.log(`${index + 1}. ${tournament.name}`);
            console.log(`   Start: ${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString()}`);
            console.log(`   End: ${endDate.toLocaleDateString()} ${endDate.toLocaleTimeString()}`);
            console.log(`   Now: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
            
            let status = '';
            if (now > endDate) {
                status = '🏁 TOURNAMENT OVER';
            } else if (now >= startDate) {
                status = '🔴 TOURNAMENT STARTED';
            } else {
                status = '🟢 UPCOMING';
            }
            
            console.log(`   Status: ${status}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

checkTournamentStatus();
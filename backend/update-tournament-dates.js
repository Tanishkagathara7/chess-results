const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateTournamentDates() {
    console.log('🔧 Updating tournament dates for testing...\n');
    
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    
    try {
        // Get all tournaments
        const tournaments = await db.collection('tournaments').find({}).toArray();
        console.log(`📋 Found ${tournaments.length} tournaments:`);
        
        tournaments.forEach((tournament, index) => {
            const startDate = new Date(tournament.start_date);
            const endDate = new Date(tournament.end_date);
            console.log(`${index + 1}. ${tournament.name}`);
            console.log(`   📅 ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
            console.log('');
        });
        
        // Find a tournament to update (let's use the first one)
        if (tournaments.length > 0) {
            const tournamentToUpdate = tournaments[0];
            console.log(`🎯 Updating "${tournamentToUpdate.name}" to have past end date...`);
            
            // Set dates to the past
            const pastStartDate = new Date();
            pastStartDate.setDate(pastStartDate.getDate() - 3); // Started 3 days ago
            
            const pastEndDate = new Date();
            pastEndDate.setDate(pastEndDate.getDate() - 1); // Ended 1 day ago
            
            await db.collection('tournaments').updateOne(
                { id: tournamentToUpdate.id },
                { 
                    $set: { 
                        start_date: pastStartDate.toISOString(),
                        end_date: pastEndDate.toISOString()
                    }
                }
            );
            
            console.log('✅ Updated tournament dates:');
            console.log(`   Started: ${pastStartDate.toLocaleDateString()}`);
            console.log(`   Ended: ${pastEndDate.toLocaleDateString()}`);
            
            // Update another tournament to have future dates for comparison
            if (tournaments.length > 1) {
                const futureTournament = tournaments[1];
                console.log(`\n🎯 Updating "${futureTournament.name}" to have future dates...`);
                
                const futureStartDate = new Date();
                futureStartDate.setDate(futureStartDate.getDate() + 5); // Starts in 5 days
                
                const futureEndDate = new Date();
                futureEndDate.setDate(futureEndDate.getDate() + 7); // Ends in 7 days
                
                await db.collection('tournaments').updateOne(
                    { id: futureTournament.id },
                    { 
                        $set: { 
                            start_date: futureStartDate.toISOString(),
                            end_date: futureEndDate.toISOString()
                        }
                    }
                );
                
                console.log('✅ Updated future tournament dates:');
                console.log(`   Starts: ${futureStartDate.toLocaleDateString()}`);
                console.log(`   Ends: ${futureEndDate.toLocaleDateString()}`);
            }
            
            console.log('\n🎯 Testing Instructions:');
            console.log('1. Refresh your frontend tournaments page');
            console.log(`2. "${tournamentToUpdate.name}" should show "Tournament Over 🏁"`);
            if (tournaments.length > 1) {
                console.log(`3. "${tournaments[1].name}" should show "Request to Join"`);
            }
            console.log('4. Verify the dates are displayed correctly in the table');
            
        } else {
            console.log('❌ No tournaments found to update');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

updateTournamentDates();
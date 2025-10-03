const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkParticipants() {
  const client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'test_database');
  
  // Get tournament info
  const tournaments = await db.collection('tournaments').find({}).toArray();
  console.log('🏆 Tournaments:', tournaments.map(t => ({ id: t.id, name: t.name, type: t.tournament_type })));
  
  // Get tournament participants for the 'vcd' tournament
  const vcdTournament = tournaments.find(t => t.name === 'vcd');
  if (vcdTournament) {
    console.log('\n🎯 VCD Tournament ID:', vcdTournament.id);
    
    const participants = await db.collection('tournament_participants').aggregate([
      { $match: { tournament_id: vcdTournament.id } },
      {
        $lookup: {
          from: 'players',
          localField: 'player_id',
          foreignField: 'id',
          as: 'player'
        }
      },
      { $unwind: '$player' }
    ]).toArray();
    
    console.log('\n👥 Tournament participants:');
    participants.forEach(p => {
      console.log(`  - ${p.player.name} | Status: ${p.status} | Player ID: ${p.player_id}`);
    });
    
    console.log('\n📊 Status Summary:');
    const statusCounts = {};
    participants.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} players`);
    });
  } else {
    console.log('❌ VCD tournament not found');
  }
  
  await client.close();
}

checkParticipants().catch(console.error);
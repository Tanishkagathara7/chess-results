const { MongoClient } = require('mongodb');
require('dotenv').config();

async function debugRound1() {
  const client = new MongoClient(process.env.MONGO_URL || 'mongodb://localhost:27017');
  await client.connect();
  const db = client.db(process.env.DB_NAME || 'test_database');
  
  // VCD tournament ID
  const tournamentId = 'aa0c4941-43aa-4dac-b8ea-ccb759f1d48a';
  
  console.log('🔍 Debugging Round 1 Results for VCD Tournament');
  console.log('='.repeat(50));
  
  // Get all tournament participants (including eliminated)
  console.log('\n1️⃣ ALL Tournament Participants:');
  const allParticipants = await db.collection('tournament_participants').aggregate([
    { $match: { tournament_id: tournamentId } },
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
  
  allParticipants.forEach(p => {
    console.log(`  - ${p.player.name} (${p.player_id}) | Status: ${p.status}`);
  });
  
  // Get non-withdrawn participants (what the API uses)
  console.log('\n2️⃣ Non-Withdrawn Participants (used by API):');
  const nonWithdrawnParticipants = await db.collection('tournament_participants').aggregate([
    { $match: { tournament_id: tournamentId, status: { $ne: 'withdrawn' } } },
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
  
  nonWithdrawnParticipants.forEach(p => {
    console.log(`  - ${p.player.name} (${p.player_id}) | Status: ${p.status}`);
  });
  
  // Get round 1 pairings
  console.log('\n3️⃣ Round 1 Pairings:');
  const round1Pairings = await db.collection('pairings').find({
    tournament_id: tournamentId,
    round: 1
  }).sort({ board_number: 1 }).toArray();
  
  round1Pairings.forEach(p => {
    const white = p.white_player ? p.white_player.name : 'Unknown';
    const black = p.black_player ? p.black_player.name : 'BYE';
    console.log(`  Board ${p.board_number}: ${white} vs ${black} - Result: ${p.result || 'No result'}`);
    console.log(`    White ID: ${p.white_player_id}, Black ID: ${p.black_player_id || 'null'}`);
  });
  
  // Check which players from pairings are in participants list
  console.log('\n4️⃣ Player Coverage Analysis:');
  const participantIds = new Set(nonWithdrawnParticipants.map(p => p.player_id));
  const pairingPlayerIds = new Set();
  
  round1Pairings.forEach(p => {
    if (p.white_player_id) pairingPlayerIds.add(p.white_player_id);
    if (p.black_player_id) pairingPlayerIds.add(p.black_player_id);
  });
  
  console.log(`  Participants in tournament: ${participantIds.size}`);
  console.log(`  Players in Round 1 pairings: ${pairingPlayerIds.size}`);
  
  // Find players in pairings but not in participants
  const missingParticipants = [];
  for (const playerId of pairingPlayerIds) {
    if (!participantIds.has(playerId)) {
      const player = await db.collection('players').findOne({ id: playerId });
      missingParticipants.push({ id: playerId, name: player?.name || 'Unknown' });
    }
  }
  
  if (missingParticipants.length > 0) {
    console.log('\n❌ Players in pairings but NOT in participants:');
    missingParticipants.forEach(p => {
      console.log(`  - ${p.name} (${p.id})`);
    });
  } else {
    console.log('\n✅ All pairing players are in participants list');
  }
  
  await client.close();
}

debugRound1().catch(console.error);
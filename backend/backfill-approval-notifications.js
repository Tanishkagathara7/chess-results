const { MongoClient } = require('mongodb');
require('dotenv').config();

async function backfillApprovalNotifications() {
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const nowIso = new Date().toISOString();

  const approvedRequests = await db.collection('tournament_requests').aggregate([
    { $match: { status: 'approved' } },
    { $lookup: { from: 'users', localField: 'user_id', foreignField: 'id', as: 'user' } },
    { $unwind: '$user' },
    { $lookup: { from: 'tournaments', localField: 'tournament_id', foreignField: 'id', as: 'tournament' } },
    { $unwind: '$tournament' }
  ]).toArray();

  let created = 0, skipped = 0;
  for (const req of approvedRequests) {
    const exists = await db.collection('notifications').findOne({
      user_id: req.user_id,
      'data.request_id': req.id,
      type: 'tournament_approved'
    });
    if (exists) { skipped++; continue; }

    const notification = {
      id: require('uuid').v4(),
      user_id: req.user_id,
      type: 'tournament_approved',
      title: 'Tournament Request Approved!',
      message: `Your request to join "${req.tournament.name}" has been approved! You are now registered for the tournament.`,
      data: {
        request_id: req.id,
        tournament_id: req.tournament_id,
        tournament_name: req.tournament.name,
        action: 'approve',
        admin_notes: req.admin_notes || null
      },
      read: false,
      created_date: req.approved_date || nowIso,
      created_at: nowIso
    };
    await db.collection('notifications').insertOne(notification);
    created++;
  }

  console.log(`✅ Backfill complete. Created: ${created}, Skipped existing: ${skipped}`);
  await client.close();
}

backfillApprovalNotifications().catch(e=>{console.error('Error:', e); process.exit(1);});
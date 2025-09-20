const { MongoClient } = require('mongodb');
require('dotenv').config();

(async ()=>{
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const user = await db.collection('users').findOne({email:'kagatharatanish@gmail.com'});
  console.log('User', user?.id);
  const notifs = await db.collection('notifications').find({user_id:user.id}).toArray();
  console.log('Notifications found:', notifs.length);
  notifs.forEach(n=> console.log(n.title, n.created_date));
  await client.close();
})();
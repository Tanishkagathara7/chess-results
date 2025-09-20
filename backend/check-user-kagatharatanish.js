const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function checkUser(email, password){
  console.log(`\n🔔 Checking notifications for ${email} ...`);
  try{
    const login = await axios.post(`${BASE_URL}/auth/login`, {email, password});
    const token = login.data.token;
    const notif = await axios.get(`${BASE_URL}/notifications`, {headers:{Authorization:`Bearer ${token}`}});
    const unread = await axios.get(`${BASE_URL}/notifications/unread-count`, {headers:{Authorization:`Bearer ${token}`}});
    console.log(`Total: ${notif.data.length}, Unread: ${unread.data.unread_count}`);
    notif.data.slice(0,5).forEach((n,i)=>{
      console.log(`${i+1}. ${n.title} - ${n.message}`);
    });
  }catch(e){
    console.log('Error:', e.response?.data || e.message);
  }
}

(async ()=>{
  await checkUser('kagatharatanish@gmail.com','123456');
})();
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

async function createRequestAndApprove(email,password){
  console.log(`\n🧪 Flow for ${email}`);
  const userLogin = await axios.post(`${BASE_URL}/auth/login`,{email,password});
  const userToken = userLogin.data.token;
  const tournaments = await axios.get(`${BASE_URL}/tournaments`);
  const future = tournaments.data.find(t=> new Date() < new Date(t.start_date));
  if(!future){ console.log('No future tournament'); return; }
  console.log('Creating request for', future.name);
  let reqId;
  try{
    const resp = await axios.post(`${BASE_URL}/tournament-requests`,{tournament_id: future.id, preferred_rating: 1200, notes:'test'}, {headers:{Authorization:`Bearer ${userToken}`}});
    reqId = resp.data.request_id;
    console.log('Request ID:', reqId);
  }catch(e){
    console.log('Create request error:', e.response?.data || e.message);
    // Find existing
    const myReqs = await axios.get(`${BASE_URL}/my-requests`, {headers:{Authorization:`Bearer ${userToken}`}});
    const r = myReqs.data.find(r=>r.tournament_id===future.id);
    if(r){ reqId = r.id; console.log('Using existing req', reqId, r.status); if(r.status!=='pending'){console.log('Already processed'); return;} }
  }
  // Approve as admin
  const adminLogin = await axios.post(`${BASE_URL}/auth/login`,{email:'admin@chessresults.com',password:'admin123'});
  const adminToken = adminLogin.data.token;
  await axios.put(`${BASE_URL}/tournament-requests/${reqId}`,{action:'approve'},{headers:{Authorization:`Bearer ${adminToken}`}});
  console.log('Approved request');
  // Check notifications
  const notifs = await axios.get(`${BASE_URL}/notifications`,{headers:{Authorization:`Bearer ${userToken}`}});
  const unread = await axios.get(`${BASE_URL}/notifications/unread-count`,{headers:{Authorization:`Bearer ${userToken}`}});
  console.log('Notifications total:', notifs.data.length,'unread:', unread.data.unread_count);
  notifs.data.slice(0,3).forEach((n,i)=>console.log(`${i+1}. ${n.title} - ${n.message}`));
}

(async ()=>{
  try{await createRequestAndApprove('kagatharatanish@gmail.com','123456');}catch(e){console.log('Flow error', e.response?.data || e.message)}
})();
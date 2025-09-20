const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

(async ()=>{
  try{
    const email='kagatharatanish@gmail.com', password='123456';
    const userLogin = await axios.post(`${BASE_URL}/auth/login`,{email,password});
    const userToken = userLogin.data.token;
    const tournaments = await axios.get(`${BASE_URL}/tournaments`);
    const myReqs = await axios.get(`${BASE_URL}/my-requests`, {headers:{Authorization:`Bearer ${userToken}`}});
    const reqMap = new Set(myReqs.data.map(r=>r.tournament_id));
    const target = tournaments.data.find(t=> new Date() < new Date(t.start_date) && !reqMap.has(t.id));
    if(!target){ console.log('No suitable future tournament without existing request.'); return; }
    console.log('Creating new request for', target.name);
    const resp = await axios.post(`${BASE_URL}/tournament-requests`,{tournament_id: target.id, preferred_rating:1300, notes:'notif test'}, {headers:{Authorization:`Bearer ${userToken}`}});
    const reqId = resp.data.request_id;
    console.log('New request id', reqId);
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`,{email:'admin@chessresults.com',password:'admin123'});
    const adminToken = adminLogin.data.token;
    await axios.put(`${BASE_URL}/tournament-requests/${reqId}`,{action:'approve'},{headers:{Authorization:`Bearer ${adminToken}`}});
    console.log('Approved. Checking notifications...');
    const notifs = await axios.get(`${BASE_URL}/notifications`,{headers:{Authorization:`Bearer ${userToken}`}});
    console.log('Total notifications', notifs.data.length);
    notifs.data.forEach(n=>console.log(n.title, n.created_date));
  }catch(e){
    console.log('Error', e.response?.data || e.message);
  }
})();
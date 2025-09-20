const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001/api';

(async () => {
  try {
    const login = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@chessresults.com', password: 'admin123'
    });
    const token = login.data.token;
    const res = await axios.get(`${BASE_URL}/tournament-requests`, {headers:{Authorization:`Bearer ${token}`}});
    const list = res.data.filter(r => r.user.email==='kagatharatanish@gmail.com');
    console.log('Requests for kagatharatanish:', list.map(r=>({id:r.id,status:r.status,t:r.tournament.name})));
  }catch(e){
    console.log('Error', e.response?.data || e.message);
  }
})();
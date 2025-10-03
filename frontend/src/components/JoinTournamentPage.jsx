import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trophy, User, Mail, Phone as PhoneIcon, Star } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

export default function JoinTournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'init', message: 'Preparing to join...' });
  const [tournament, setTournament] = useState(null);

  // Show a simple form for public join (name, email, password, phone, rating)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', rating: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      // Load tournament name
      try {
        const t = await axios.get(`${API}/tournaments/${id}`);
        setTournament(t.data);
      } catch (_) {}
      // nothing to auto-run on load for public form
      setState({ status: 'idle', message: 'Fill the form to join this tournament.' });
    };
    run();
  }, [id, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setState({ status: 'joining', message: 'Joining tournament...' });
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        rating: form.rating ? parseInt(form.rating, 10) : 0,
      };
      
      // Primary: one-step public join endpoint
      let res;
      try {
        res = await axios.post(`${API}/public/tournaments/${id}/join`, payload);
      } catch (e1) {
        const status = e1.response?.status;
        const text = e1.response?.data?.error || '';
        // Fallback path: if public route is missing (404), create an account and use the authenticated join route
        if (status === 404 || /route not found/i.test(text)) {
          try {
            const randomPass = Math.random().toString(36).slice(-10) + 'A!1';
            const reg = await axios.post(`${API}/auth/register`, {
              name: payload.name,
              email: payload.email,
              password: randomPass,
              phone: payload.phone,
              rating: payload.rating,
            });
            const token = reg.data?.token;
            if (token) localStorage.setItem('token', token);
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            res = await axios.post(`${API}/tournaments/${id}/join`, {}, { headers: authHeaders });
          } catch (e2) {
            // If user already exists, ask them to login and then retry
            const exists = e2.response?.status === 400 && /already exists/i.test(e2.response?.data?.error || '');
            const detailed = exists ? 'Email already registered. Please login and try again.' : (e2.response?.data?.error || e2.message);
            throw new Error(detailed);
          }
        } else {
          throw e1;
        }
      }
      
      if (res?.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      // Show success and stay on the same page (no redirect)
      setState({ status: 'success', message: res?.data?.message || 'Joined tournament successfully!' });
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to join';
      setState({ status: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <Card className="w-full max-w-xl shadow-xl bg-white border border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 text-amber-600 grid place-items-center mb-3">
            <Trophy className="h-6 w-6" />
          </div>
          {tournament ? (
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{tournament.name}</h1>
          ) : (
            <h1 className="text-3xl md:text-4xl font-black text-slate-900/80 tracking-tight">Loading tournament...</h1>
          )}
          <CardTitle className="mt-1 text-base md:text-lg font-semibold text-slate-600">Join Tournament</CardTitle>
          {state.status === 'error' && (
            <div className="mt-3 text-red-700 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">
              {state.message}
            </div>
          )}
          {state.status === 'success' && (
            <div className="mt-3 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
              {state.message || 'Joined tournament successfully!'}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label className="text-sm mb-1 flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /> Full Name</Label>
              <Input className="bg-white text-slate-900 placeholder:text-slate-500 border-slate-300" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="e.g. Rahul Sharma" required />
            </div>
            <div>
              <Label className="text-sm mb-1 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> Email</Label>
              <Input className="bg-white text-slate-900 placeholder:text-slate-500 border-slate-300" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="rahul.sharma@gmail.com" required />
            </div>
            <div>
              <Label className="text-sm mb-1 flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-slate-400" /> Phone</Label>
              <Input className="bg-white text-slate-900 placeholder:text-slate-500 border-slate-300" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} placeholder="+91 98765 43210" required />
            </div>
            <div>
              <Label className="text-sm mb-1 flex items-center gap-2"><Star className="h-4 w-4 text-slate-400" /> Rating (optional)</Label>
              <Input className="bg-white text-slate-900 placeholder:text-slate-500 border-slate-300" type="number" min="0" max="3000" value={form.rating} onChange={e=>setForm({...form, rating:e.target.value})} placeholder="e.g. 1500 (leave blank if unrated)" />
            </div>
            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-slate-500">By joining, your name may appear on participant lists.</div>
              <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                {submitting ? 'Joining...' : (state.status === 'success' ? 'Joined ✅' : 'Join Tournament')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

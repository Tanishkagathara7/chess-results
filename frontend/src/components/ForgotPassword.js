import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import backgroundImg from '../img/background.jpeg';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // success | error | null
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple retry helper for transient network/proxy errors (e.g., Render cold start)
  const postWithRetry = async (url, data, { attempts = 3, delays = [800, 1500] } = {}) => {
    let lastErr = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await axios.post(url, data);
      } catch (err) {
        lastErr = err;
        const status = err?.response?.status;
        const isNetwork = !err.response; // connection reset / CORS / DNS / timeout
        const isRetryable = isNetwork || (status >= 500 && status <= 599);
        if (isRetryable && i < attempts - 1) {
          // Show a hint on first retry
          if (i === 0) {
            setStatus('error');
            setMessage('Server is waking up, retrying...');
          }
          const wait = delays[i] || 1200;
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setMessage('');
    try {
      await postWithRetry(`${API}/auth/forgot-password`, { email });
      setStatus('success');
      setMessage('If an account with that email exists, we have sent password reset instructions.');
    } catch (err) {
      setStatus('error');
      // Prefer server error if any; otherwise show generic message for connection issues
      const fallback = 'Failed to submit request. Please try again in a moment.';
      setMessage(err?.response?.data?.error || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-10 px-4">
      {/* Background image with overlay and bottom fade */}
      <div className="absolute inset-0">
        <img src={backgroundImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-x-0 bottom-0 h-28 md:h-36 bg-gradient-to-b from-transparent to-white" />
      </div>

      <Button
        variant="ghost"
        onClick={() => navigate('/auth')}
        className="absolute top-4 left-4 text-amber-100 hover:text-amber-200"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sign In
      </Button>

      <div className="relative w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Forgot Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {status && (
                <div className={`text-sm p-3 rounded border ${status === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {message}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
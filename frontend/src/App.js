import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Search, Trophy, Users, Globe, Plus, Edit, Trash2, Download, LogOut, Award, Home as HomeIcon, Settings, Eye, Menu, Bell, Info, ArrowLeft } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationDropdown from "./components/NotificationDropdown";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute, { AdminRoute } from "./components/ProtectedRoute";
import AdminPanel from "./components/AdminPanel";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import NotificationsPage from "./components/NotificationsPage";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Badge } from "./components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import ThemeToggle from "./components/ThemeToggle";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

// Backend URL (from env in production, localhost fallback in dev)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

console.log('🔧 App.js Backend URL:', BACKEND_URL);
console.log('🔧 App.js API URL:', API);

// Header Component (kept for non-dashboard pages)
const Header = ({ searchQuery, setSearchQuery, onSearch, showAuthButton = false }) => {
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-gradient-to-b from-amber-50/70 via-white/90 to-white/90 border-b-2 border-amber-300/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/home" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-amber-600" />
              <span className="text-xl font-bold text-gray-900">ChessTournaments</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/home" className="text-gray-600 hover:text-amber-700 font-medium">Home</Link>
              {user?.role !== 'admin' && (
                <Link to="/tournaments" className="text-gray-600 hover:text-amber-700 font-medium">Tournaments</Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-amber-700 font-medium">Admin</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                className="pl-10 w-64"
              />
            </div>
            <Button onClick={onSearch} variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-50">
              Search
            </Button>
            {showAuthButton && isAuthenticated && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
                <NotificationDropdown />
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Sidebar for dashboard
const Sidebar = ({ open, setOpen, onNavigate, current = 'home' }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const asideBg = theme === 'light' ? 'bg-white/90 border-slate-200' : 'bg-slate-900/95 border-slate-800';
  const headerText = theme === 'light' ? 'text-slate-900' : 'text-slate-100';
  const navDefault = theme === 'light' ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100';
  const navActive = theme === 'light' ? 'bg-amber-500/10 text-amber-700' : 'bg-amber-500/15 text-amber-400';
  const borderColor = theme === 'light' ? 'border-slate-200' : 'border-slate-800';
  const iconColor = theme === 'light' ? 'text-slate-500 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200';
  const items = [
    { key: 'home', label: 'Home', icon: HomeIcon, to: '/home' },
    { key: 'tournaments', label: 'Tournaments', icon: Trophy, to: '/tournaments' },
    ...(user?.role === 'admin' ? [] : [{ key: 'profile', label: 'Profile', icon: Users, to: '/profile' }]),
    { key: 'notifications', label: 'Notifications', icon: Bell, to: '/notifications' },
    { key: 'about', label: 'About', icon: Info, to: '/about' },
    { key: 'settings', label: 'Settings', icon: Settings, to: '/settings' },
  ];
  return (
    <aside className={`fixed z-40 inset-y-0 left-0 w-64 transform ${asideBg} backdrop-blur border-r transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className={`h-16 flex items-center px-4 border-b ${borderColor}`}>
        <div className="flex items-center space-x-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          <span className={`text-lg font-bold ${headerText}`}>ChessTournaments</span>
        </div>
      </div>
      <nav className="p-4 space-y-1">
        {items.map(item => (
          <button key={item.key} onClick={() => { onNavigate(item.to); setOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${current === item.key ? navActive : navDefault}`}>
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        <div className={`pt-2 mt-2 border-t ${borderColor}`}>
          <button onClick={() => { onNavigate('/auth'); setOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left ${navDefault}`}>
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

// Home Page (redesigned)
const Home = () => {
  const { theme } = useTheme();
  const pageBg = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-100';
  const barBg = theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80';
  const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800/60 border-slate-700';
  const thBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/70';
  const headText = theme === 'light' ? 'text-slate-700' : 'text-slate-300';
  const zebra = theme === 'light' ? 'odd:bg-white even:bg-slate-50 hover:bg-slate-100' : 'odd:bg-slate-800/40 even:bg-slate-800/20 hover:bg-slate-700/40';
  const textSubtle = theme === 'light' ? 'text-slate-600' : 'text-slate-200/90';
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [recentTournaments, setRecentTournaments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchRecentTournaments();
  }, []);

  const fetchRecentTournaments = async () => {
    try {
      const response = await axios.get(`${API}/tournaments`);
      setRecentTournaments(response.data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await axios.get(`${API}/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching:", error);
    }
  };

  return (
    <div className={`min-h-screen ${pageBg}`}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="home" />
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Desktop quick-access theme toggle */}
      <div className="hidden md:block fixed top-3 right-4 z-40">
        <ThemeToggle />
      </div>

      {/* Content */}
      <div className="md:pl-64">
        {/* Top bar for mobile */}
        <div className={`h-16 flex items-center px-4 border-b ${barBg} backdrop-blur sticky top-0 z-30 md:hidden`}>
          <button className="text-slate-300" onClick={() => setSidebarOpen((o) => !o)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <span className="font-semibold">ChessTournaments</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Hero */}
        <section className="relative">
          <div className="h-56 md:h-64 flex items-center">
            <div className="px-6 md:px-10 w-full">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Welcome to Your Chess Dashboard</h1>
              <p className={`mt-2 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200/90'} max-w-2xl`}>Discover and participate in chess tournaments around the world</p>
              {/* Search */}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <div className={`grid ${user?.role === 'admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 md:gap-8 px-6 md:px-10 -mt-10 relative z-10`}>
          <Card className={`cursor-pointer ${cardBg} hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-900/20 transition-all rounded-xl`} onClick={() => navigate('/tournaments')}>
            <CardContent className="p-8 text-center">
              <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-amber-500/15 text-amber-400 mb-4">
                <Trophy className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Browse Tournaments</h3>
              <p className={`${textSubtle}`}>Find tournaments that match your skill level and interests</p>
            </CardContent>
          </Card>

          {user?.role === 'admin' ? (
            <>
            <Card className={`cursor-pointer ${cardBg} hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-900/20 transition-all rounded-xl`} onClick={() => navigate('/admin')}>
                <CardContent className="p-8 text-center">
                  <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-amber-500/15 text-amber-400 mb-4">
                    <Plus className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Admin Panel</h3>
                  <p className={`${textSubtle}`}>Create and manage tournaments, add players, and oversee competitions</p>
                </CardContent>
              </Card>

            </>
          ) : (
            <Card className={`cursor-pointer ${cardBg} hover:border-amber-400/60 hover:shadow-xl hover:shadow-amber-900/20 transition-all rounded-xl`} onClick={() => navigate('/profile')}>
              <CardContent className="p-8 text-center">
                <div className="mx-auto h-16 w-16 grid place-items-center rounded-full bg-amber-500/15 text-amber-400 mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">My Profile</h3>
                <p className={`${textSubtle}`}>View your tournament history, ratings, and achievements</p>
              </CardContent>
            </Card>
          )}
        </div>


        {/* Recent Tournaments */}
        <div className="px-6 md:px-10 mt-8 pb-12">
          <h2 className="text-2xl font-bold mb-4">Recent Tournaments</h2>
          <Card className={`${cardBg} rounded-xl`}>
            <CardContent className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className={`${thBg}`}>
                    <TableHead className={`${headText}`}>Tournament</TableHead>
                    <TableHead className={`${headText}`}>Location</TableHead>
                    <TableHead className={`${headText}`}>Date</TableHead>
                    <TableHead className={`${headText}`}>Rounds</TableHead>
                    <TableHead className={`${headText}`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTournaments.map((tournament, idx) => (
                    <TableRow key={tournament.id} className={`${zebra} transition-colors`}>
                      <TableCell className="font-medium">{tournament.name}</TableCell>
                      <TableCell className={`${textSubtle}`}>{tournament.location}</TableCell>
                      <TableCell className={`${textSubtle}`}>{new Date(tournament.start_date).toLocaleDateString()}</TableCell>
                      <TableCell className={`${textSubtle}`}>{tournament.rounds}</TableCell>
                    
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-amber-400 hover:bg-amber-500/10" onClick={() => navigate(`/tournaments/${tournament.id}`)}>
                          <Eye className="h-5 w-5" />
                          <span className="sr-only">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {recentTournaments.length === 0 && (
                <div className="text-center py-8 text-slate-400">No tournaments available at the moment. Check back soon!</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Tournaments Page
const Tournaments = () => {
  const { theme } = useTheme();
  const pageBg = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-100';
  const barBg = theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80';
  const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800/60 border-slate-700';
  const thBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/70';
  const headText = theme === 'light' ? 'text-slate-700' : 'text-slate-300';
  const zebra = theme === 'light' ? 'odd:bg-white even:bg-slate-50 hover:bg-slate-100' : 'odd:bg-slate-800/40 even:bg-slate-800/20 hover:bg-slate-700/40';
  const textSubtle = theme === 'light' ? 'text-slate-600' : 'text-slate-200/90';
  const [tournaments, setTournaments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinStatus, setJoinStatus] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchTournaments();
  }, []);
  
  // Check registrations when both user and tournaments are available
  useEffect(() => {
    if (user && tournaments.length > 0) {
      checkUserRegistrations();
    }
  }, [user, tournaments]);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get(`${API}/tournaments`);
      setTournaments(response.data);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    }
  };

  const checkUserRegistrations = async () => {
    if (!user || !tournaments || tournaments.length === 0) return;

    const normalize = (s) => (s || '').toString().trim().toLowerCase();
    const emailLocal = normalize((user.email || '').split('@')[0]);

    try {
      // Search for user's player profile
      const searchResponse = await axios.get(`${API}/players`);
      let userPlayer = searchResponse.data.find(p => p.user_id === user.id);

      if (!userPlayer) {
        // Fallback to name search for backwards compatibility
        userPlayer = searchResponse.data.find(p =>
          normalize(p.name) === normalize(user.name) ||
          normalize(p.name).includes(emailLocal)
        );
      }

      if (!userPlayer) {
        console.log('No player profile found for user:', user.email);
        // We still proceed without userPlayer by matching via userId/name against participants below
      }

      console.log('✅ Checking registration status across', tournaments.length, 'tournaments');

      // Check both registrations and requests for each tournament
      const statusChecks = tournaments.map(async (tournament) => {
        try {
          // Check if user is already registered (approved)
          const participantsResponse = await axios.get(`${API}/tournaments/${tournament.id}/participants`);
          const participants = participantsResponse.data || [];

          const isRegistered = participants.some(p => {
            const byId = userPlayer && p.player_id === userPlayer.id;
            const byLinkedUser = p.player?.user_id && p.player.user_id === user.id;
            const byName = normalize(p.player?.name) === normalize(user.name) || normalize(p.player?.name).includes(emailLocal);
            return byId || byLinkedUser || byName;
          });

          if (isRegistered) {
            console.log(`🏆 User is registered for tournament: ${tournament.name}`);
            return { tournamentId: tournament.id, status: 'joined' };
          }

          // Check if user has any request (pending or approved)
          const token = localStorage.getItem('token');
          const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

          const requestsResponse = await axios.get(`${API}/my-requests`, { headers: authHeaders });
          const userRequest = (requestsResponse.data || []).find(r => r.tournament_id === tournament.id);

          if (userRequest) {
            console.log(`📨 Found request for ${tournament.name}: ${userRequest.status}`);
            if (userRequest.status === 'approved') {
              return { tournamentId: tournament.id, status: 'joined' };
            } else if (userRequest.status === 'pending') {
              return { tournamentId: tournament.id, status: 'pending' };
            }
          }

          return { tournamentId: tournament.id, status: null };
        } catch (error) {
          console.error(`❌ Error checking status for ${tournament.name}:`, error.message);
          return { tournamentId: tournament.id, status: null };
        }
      });

      const results = await Promise.all(statusChecks);
      const newStatus = {};
      results.forEach(({ tournamentId, status }) => {
        if (status) newStatus[tournamentId] = status;
      });

      console.log('✅ Final join status:', newStatus);
      setJoinStatus(newStatus);
    } catch (error) {
      console.log('Could not check user registrations:', error.message);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchTournaments();
      return;
    }
    
    try {
      const response = await axios.get(`${API}/tournaments?search=${encodeURIComponent(searchQuery)}`);
      setTournaments(response.data);
      // Note: checkUserRegistrations will be called automatically by useEffect when tournaments change
    } catch (error) {
      console.error("Error searching tournaments:", error);
    }
  };

  const handleJoinTournament = async (tournamentId) => {
    if (!user) {
      alert('Please login to join tournaments');
      navigate('/auth');
      return;
    }

    setLoading(true);
    setJoinStatus(prev => ({ ...prev, [tournamentId]: 'joining' }));

    try {
      console.log('🎯 Joining tournament:', tournamentId, 'for user:', user);
      
      // First, check if user has a player profile
      let playerId = null;
      
      try {
        // Search for existing player by user_id first, then by name
        const searchResponse = await axios.get(`${API}/players`);
        let existingPlayer = searchResponse.data.find(p => p.user_id === user.id);
        
        if (!existingPlayer) {
          // Fallback to name search for backwards compatibility
          existingPlayer = searchResponse.data.find(p => 
            p.name.toLowerCase() === user.name.toLowerCase() || 
            p.name.toLowerCase().includes(user.email.split('@')[0].toLowerCase())
          );
        }
        
        if (existingPlayer) {
          playerId = existingPlayer.id;
          console.log('✅ Found existing player:', existingPlayer);
        }
      } catch (searchError) {
        console.log('🔍 Player search failed:', searchError.message);
      }
      
      // If no player profile exists, this shouldn't happen with new registration system
      if (!playerId) {
        console.error('❌ No player profile found for user. This should not happen with new accounts.');
        alert('❌ Player profile not found. Please contact support or try logging out and back in.');
        return;
      }
      
      // Now submit request to join the tournament using the new request system
      console.log('📋 Submitting join request for player', playerId, 'for tournament', tournamentId);
      
      // Get auth token for the request
      const token = localStorage.getItem('token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.post(`${API}/tournament-requests`, {
        tournament_id: tournamentId,
        player_id: playerId,
        preferred_rating: user.rating || 0,
        notes: `Join request from ${user.name} via tournament listing`
      }, { headers: authHeaders });
      
      console.log('✅ Successfully submitted tournament request:', response.data);
      
      // Refresh user registrations to get the latest status
      await checkUserRegistrations();
      
      // Show success message
      alert('📋 Tournament join request submitted successfully! An admin will review your request and approve it if everything looks good.');
      
    } catch (error) {
      console.error('❌ Error joining tournament:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      setJoinStatus(prev => ({ ...prev, [tournamentId]: 'error' }));
      
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error;
        if (errorMessage?.includes('already registered') || errorMessage?.includes('already approved')) {
          alert('ℹ️ You are already registered for this tournament!');
          // Reflect the correct state in UI immediately
          setJoinStatus(prev => ({ ...prev, [tournamentId]: 'joined' }));
          try {
            // Refresh statuses just in case
            await checkUserRegistrations();
          } catch (_) {}
        } else if (errorMessage?.includes('pending request')) {
          alert('ℹ️ You already have a pending request for this tournament!');
          setJoinStatus(prev => ({ ...prev, [tournamentId]: 'pending' }));
        } else if (errorMessage?.includes('Tournament has already ended')) {
          alert('🏁 Registration is closed. This tournament has already ended.');
          setJoinStatus(prev => ({ ...prev, [tournamentId]: 'ended' }));
        } else if (errorMessage?.includes('Tournament has already started') || errorMessage?.includes('Registration is closed')) {
          alert('⏰ Registration is closed. This tournament has already started.');
          setJoinStatus(prev => ({ ...prev, [tournamentId]: 'started' }));
        } else {
          alert(`❌ Failed to submit request: ${errorMessage}`);
        }
      } else if (error.response?.status === 401) {
        alert('🔒 Authentication required. Please login again.');
        navigate('/auth');
      } else {
        alert(`❌ Failed to submit tournament request: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setLoading(false);
      // Clear the 'joining' state immediately since we've updated with the real status
      setJoinStatus(prev => {
        const newStatus = { ...prev };
        if (newStatus[tournamentId] === 'joining') {
          delete newStatus[tournamentId];
        }
        return newStatus;
      });
    }
  };

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="tournaments" />
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Desktop quick-access theme toggle */}
      <div className="hidden md:block fixed top-3 right-4 z-40">
        <ThemeToggle />
      </div>
      <div className="md:pl-64">
        {/* Top bar for mobile */}
        <div className={`h-16 flex items-center px-4 border-b ${barBg} backdrop-blur sticky top-0 z-30 md:hidden`}>
          <button className="text-slate-300" onClick={() => setSidebarOpen((o) => !o)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <span className="font-semibold">ChessTournaments</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="px-6 md:px-10 py-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">Tournaments</h1>
            <div className="mt-4 flex items-center gap-3">
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-12 pr-4 py-6 rounded-full bg-slate-800/70 border-slate-700 text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <Button onClick={handleSearch} className="rounded-full bg-amber-600 hover:bg-amber-700">Search</Button>
            </div>
          </div>

          <Card className={`${cardBg} rounded-xl`}>
            <CardContent className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className={`${thBg}`}>
                    <TableHead className={`${headText}`}>Tournament</TableHead>
                    <TableHead className={`${headText}`}>Location</TableHead>
                    <TableHead className={`${headText}`}>Start Date</TableHead>
                    <TableHead className={`${headText}`}>End Date</TableHead>
                    <TableHead className={`${headText}`}>Rounds</TableHead>
                    <TableHead className={`${headText}`}>Time Control</TableHead>
                    <TableHead className={`${headText}`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament) => (
                    <TableRow key={tournament.id} className={`${zebra} transition-colors`}>
                      <TableCell className="font-medium">{tournament.name}</TableCell>
                      <TableCell className={`${textSubtle}`}>{tournament.location}</TableCell>
                      <TableCell className={`${textSubtle}`}>{new Date(tournament.start_date).toLocaleDateString()}</TableCell>
                      <TableCell className={`${textSubtle}`}>{new Date(tournament.end_date).toLocaleDateString()}</TableCell>
                      <TableCell className={`${textSubtle}`}>{tournament.rounds}</TableCell>
                      <TableCell className={`${textSubtle}`}>{tournament.time_control}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                            onClick={() => navigate(`/tournaments/${tournament.id}`)}
                          >
                            View
                          </Button>
                          {(() => {
                            const now = new Date();
                            const tournamentStart = new Date(tournament.start_date);
                            const tournamentEnd = new Date(tournament.end_date);
                            const isStarted = now >= tournamentStart;
                            const isEndedByDate = now > tournamentEnd;
                            const endedByRounds = (tournament.tournament_over === true) ||
                              (Array.isArray(tournament.completed_rounds) && tournament.completed_rounds.length >= (tournament.rounds || 0)) ||
                              ((tournament.last_completed_round || 0) >= (tournament.rounds || 0));
                            const currentStatus = joinStatus[tournament.id];
                            const isEnded = isEndedByDate || endedByRounds;
                            
                            if (isEnded) {
                              return (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-slate-400 border-slate-600 cursor-not-allowed bg-slate-800"
                                    disabled={true}
                                    title={endedByRounds ? 'All rounds completed' : `Ended on ${tournamentEnd.toLocaleDateString()}`}
                                  >
                                    Tournament Over 🏁
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                                    onClick={() => navigate(`/tournaments/${tournament.id}?view=final`)}
                                    title="View final standings"
                                  >
                                    Final
                                  </Button>
                                </>
                              );
                            }
                            
                            if (isStarted && currentStatus !== 'joined') {
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-slate-400 border-slate-600 cursor-not-allowed"
                                  disabled={true}
                                  title={`Tournament started on ${tournamentStart.toLocaleDateString()}`}
                                >
                                  Started
                                </Button>
                              );
                            }
                            
                            return (
                              <Button
                                variant="default"
                                size="sm"
                                className={`text-white ${
                                  currentStatus === 'joined' 
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : currentStatus === 'pending'
                                    ? 'bg-yellow-600 hover:bg-yellow-700'
                                    : currentStatus === 'error'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                                onClick={() => currentStatus !== 'joined' ? handleJoinTournament(tournament.id) : null}
                                disabled={
                                  loading && currentStatus === 'joining' || 
                                  currentStatus === 'joined' || 
                                  currentStatus === 'pending' ||
                                  isStarted ||
                                  isEnded
                                }
                              >
                                {currentStatus === 'joining' && (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                )}
                                {currentStatus === 'joining' 
                                  ? 'Submitting...' 
                                  : currentStatus === 'joined'
                                  ? '🏆 Joined'
                                  : currentStatus === 'pending'
                                  ? 'Request Pending 🕰️'
                                  : currentStatus === 'error'
                                  ? 'Try Again'
                                  : 'Request to Join'
                                }
                              </Button>
                            );
                          })()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {tournaments.length === 0 && (
                <div className={`text-center py-8 ${textSubtle} opacity-75`}>
                  No tournaments found.
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

// Profile Page
const Profile = () => {
  const { theme } = useTheme();
  const pageBg = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-100';
  const barBg = theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80';
  const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800 border-slate-700';
  const tableCardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800/60 border-slate-700';
  const thBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/70';
  const headText = theme === 'light' ? 'text-slate-700' : 'text-slate-300';
  const zebra = theme === 'light' ? 'odd:bg-white even:bg-slate-50' : 'odd:bg-slate-800/40 even:bg-slate-800/20';
  const subtle = theme === 'light' ? 'text-slate-600' : 'text-slate-300';
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/my-summary`);
        setSummary(res.data);
      } catch (err) {
        console.error('Failed to load profile summary', err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tmap = React.useMemo(() => {
    const map = new Map();
    (summary?.tournaments || []).forEach((t) => {
      map.set(t.tournament.id, t.tournament);
    });
    return map;
  }, [summary]);

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="profile" />
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Desktop quick-access theme toggle */}
      <div className="hidden md:block fixed top-3 right-4 z-40">
        <ThemeToggle />
      </div>
      <div className="md:pl-64">
        {/* Top bar for mobile */}
        <div className={`h-16 flex items-center px-4 border-b ${barBg} backdrop-blur sticky top-0 z-30 md:hidden`}>
          <button className="text-slate-300" onClick={() => setSidebarOpen((o) => !o)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <span className="font-semibold">ChessTournaments</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="px-6 md:px-10 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className={`${subtle}`}>Your tournaments and game history</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              <p className={`mt-4 ${subtle}`}>Loading your data...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <Card className={`${cardBg} rounded-xl shadow`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
<div className="text-3xl font-extrabold leading-none">{summary?.totals?.tournaments || 0}</div>
                        <div className={`${subtle} text-sm mt-1`}>Tournaments</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`${cardBg} rounded-xl shadow`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-sky-500/15 border border-sky-500/30 grid place-items-center text-sky-400">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
<div className="text-3xl font-extrabold leading-none">{summary?.totals?.games || 0}</div>
                        <div className={`${subtle} text-sm mt-1`}>Games</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`${cardBg} rounded-xl shadow`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-500/15 border border-green-500/30 grid place-items-center text-green-400">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
<div className="text-3xl font-extrabold leading-none">{summary?.totals?.wins || 0}</div>
                        <div className={`${subtle} text-sm mt-1`}>Wins</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className={`${cardBg} rounded-xl shadow`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-yellow-500/15 border border-yellow-500/30 grid place-items-center text-yellow-400">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
<div className="text-3xl font-extrabold leading-none">{summary?.totals?.draws || 0}</div>
                        <div className={`${subtle} text-sm mt-1`}>Draws</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Games */}
              <Card className={`mb-8 ${tableCardBg} rounded-xl`}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2" /> Recent Games
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                  <TableHeader>
                        <TableRow className={`${thBg}`}>
                        <TableHead className={`${headText}`}>Tournament</TableHead>
                        <TableHead className={`${headText}`}>Round</TableHead>
                        <TableHead className={`${headText}`}>Color</TableHead>
                        <TableHead className={`${headText}`}>Opponent</TableHead>
                        <TableHead className={`${headText}`}>Result</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(summary?.games || []).slice().sort((a,b)=>{
                        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                        return db - da;
                      }).slice(0,10).map(g => (
                        <TableRow key={g.id} className={`${zebra}`}>
                          <TableCell className="font-medium">{tmap.get(g.tournament_id)?.name || g.tournament_id}</TableCell>
                          <TableCell className={`${subtle}`}>Round {g.round}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={g.you_color === 'white' ? 'border-amber-400 text-amber-400' : 'border-slate-600 text-slate-300'}>
                              {g.you_color === 'white' ? 'White' : 'Black'}
                            </Badge>
                          </TableCell>
                          <TableCell className={`${subtle}`}>{g.opponent ? `${g.opponent.name} (${g.opponent.rating || 'Unrated'})` : '-'}</TableCell>
                          <TableCell>
                            {g.result ? (
                              g.outcome === 'win' ? <Badge className="bg-green-600">Win</Badge> :
                              g.outcome === 'draw' ? <Badge variant="secondary">Draw</Badge> :
                              <Badge className="bg-red-600">Loss</Badge>
                            ) : <span className={`${subtle} opacity-75`}>Pending</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {(summary?.games || []).length === 0 && (
                    <div className={`text-center py-8 ${subtle} opacity-75`}>No games yet.</div>
                  )}
                </CardContent>
              </Card>

              {/* Tournaments Played */}
              <Card className={`${tableCardBg} rounded-xl`}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2" /> Tournaments Played
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className={`${thBg}`}>
                        <TableHead className={`${headText}`}>Name</TableHead>
                        <TableHead className={`${headText}`}>Dates</TableHead>
                        <TableHead className={`${headText}`}>Status</TableHead>
                        <TableHead className={`${headText}`}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(summary?.tournaments || []).map((tp) => (
                        <TableRow key={`${tp.tournament.id}-${tp.player_id}`} className={`${zebra}`}>
                          <TableCell className="font-medium">{tp.tournament.name}</TableCell>
                          <TableCell className={`${subtle}`}>
                            {new Date(tp.tournament.start_date).toLocaleDateString()} - {new Date(tp.tournament.end_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tp.status === 'registered' ? 'default' : 'secondary'} className={tp.status === 'registered' ? 'bg-green-600' : ''}>
                              {tp.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                          <Button variant="outline" size="sm" className="border-amber-500 text-amber-500 hover:bg-amber-500/10" onClick={() => navigate(`/tournaments/${tp.tournament.id}`)}>View</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {(summary?.tournaments || []).length === 0 && (
                    <div className={`text-center py-8 ${subtle} opacity-75`}>No tournaments joined yet.</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

// Players Page
const Players = () => {
  const [players, setPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error("Error fetching players:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchPlayers();
      return;
    }
    
    try {
      const response = await axios.get(`${API}/players?search=${encodeURIComponent(searchQuery)}`);
      setPlayers(response.data);
    } catch (error) {
      console.error("Error searching players:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} showAuthButton={true} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Players</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Birth Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>{player.rating}</TableCell>
                    <TableCell>
                      {player.title && <Badge variant="secondary">{player.title}</Badge>}
                    </TableCell>
                    <TableCell>{player.birth_year || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {players.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No players found.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// Settings Page
const SettingsPage = () => {
  const { theme } = useTheme();
  const pageBg = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-100';
  const barBg = theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80';
  const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800/60 border-slate-700';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="settings" />
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Desktop quick-access theme toggle */}
      <div className="hidden md:block fixed top-3 right-4 z-40">
        <ThemeToggle />
      </div>
      <div className="md:pl-64">
        {/* Top bar for mobile */}
        <div className={`h-16 flex items-center px-4 border-b ${barBg} backdrop-blur sticky top-0 z-30 md:hidden`}>
          <button className="text-slate-300" onClick={() => setSidebarOpen((o) => !o)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <span className="font-semibold">ChessTournaments</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="px-6 md:px-10 py-8">
          <div className="mb-3">
<Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="px-2 text-amber-400 hover:bg-amber-500/10">
              <ArrowLeft className="h-5 w-5 mr-1" /> Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">Settings</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className={`${cardBg} rounded-xl`}>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Theme</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">Switch light/dark mode</div>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            <Card className={`${cardBg} rounded-xl`}>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div><span className="text-slate-500 dark:text-slate-300">Email: </span><span className="font-medium">{user?.email || '-'}</span></div>
                  <div><span className="text-slate-500 dark:text-slate-300">Role: </span><span className="font-medium">{user?.role || '-'}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

// About Page
const AboutPage = () => {
  const { theme } = useTheme();
  const pageBg = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-100';
  const barBg = theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80';
  const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800/60 border-slate-700';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="about" />
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Desktop quick-access theme toggle */}
      <div className="hidden md:block fixed top-3 right-4 z-40">
        <ThemeToggle />
      </div>
      <div className="md:pl-64">
        {/* Top bar for mobile */}
        <div className={`h-16 flex items-center px-4 border-b ${barBg} backdrop-blur sticky top-0 z-30 md:hidden`}>
          <button className="text-slate-300" onClick={() => setSidebarOpen((o) => !o)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <span className="font-semibold">ChessTournaments</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="px-6 md:px-10 py-10">
          <div className="mb-3">
<Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="px-2 text-amber-400 hover:bg-amber-500/10">
              <ArrowLeft className="h-5 w-5 mr-1" /> Back
            </Button>
          </div>
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-3">
              <Info className="h-8 w-8 text-amber-400" /> About ChessTournaments
            </h1>
            <p className="mt-3 text-lg md:text-xl text-slate-700 dark:text-slate-200 max-w-4xl">
              A modern, accessible platform to organize tournaments, follow games, and share professional-looking results with the chess community.
            </p>
          </div>

          {/* Developer highlight */}
          <div className={`p-6 md:p-7 mb-8 rounded-xl border ${theme === 'light' ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-700/40'}`}>
            <div className="text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-300">
              Made and developed by Tanish Kagathara
            </div>
            <p className="mt-2 text-amber-700/90 dark:text-amber-200/90">
              Thank you for using this project! Your feedback helps make it better with every release.
            </p>
          </div>

          <div className="space-y-6">
            <Card className={`${cardBg} rounded-xl`}>
              <CardHeader>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-200">
                  We aim to make chess tournament management simple and delightful for players, organizers, and clubs. The UI focuses on clarity, speed, and strong dark-mode accessibility.
                </p>
              </CardContent>
            </Card>

            <Card className={`${cardBg} rounded-xl`}>
              <CardHeader>
                <CardTitle className="text-2xl">What You Can Do</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-200">
                  <li>Browse upcoming events and view details</li>
                  <li>Request to join tournaments and track registration status</li>
                  <li>See final standings, player ratings, and round-by-round results</li>
                  <li>Receive notifications for approvals and important updates</li>
                  <li>Use admin tools to create tournaments and manage players</li>
                </ul>
              </CardContent>
            </Card>

            <Card className={`${cardBg} rounded-xl`}>
              <CardHeader>
                <CardTitle className="text-2xl">Tech Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-slate-700 dark:text-slate-200">
                  <div><span className="font-semibold">Frontend:</span> React, Tailwind CSS, shadcn/ui, Lucide icons</div>
                  <div><span className="font-semibold">Backend:</span> Node.js/Express API</div>
                  <div><span className="font-semibold">Design:</span> Accessible dark/light themes with fine-tuned contrast</div>
                  <div><span className="font-semibold">Build:</span> Modern React tooling</div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${cardBg} rounded-xl`}>
              <CardHeader>
                <CardTitle className="text-2xl">Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 dark:text-slate-200">
                  Have ideas or found a bug? Reach out to <span className="font-semibold">Tanish Kagathara</span> with your feedback.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

// Tournament Details Component
const TournamentResults = () => {
  const { id } = useParams();
  const { theme } = useTheme();
  const pageBg = theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-900 text-slate-100';
  const barBg = theme === 'light' ? 'bg-white/80 border-slate-200' : 'bg-slate-900/60 border-slate-800/80';
  const cardBg = theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-800/60 border-slate-700';
  const thBg = theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/70';
  const headText = theme === 'light' ? 'text-slate-700' : 'text-slate-300';
  const zebra = theme === 'light' ? 'odd:bg-white even:bg-slate-50 hover:bg-slate-100' : 'odd:bg-slate-800/40 even:bg-slate-800/20 hover:bg-slate-700/40';
  const navigate = useNavigate();
  console.log('TournamentResults component - Tournament ID:', id);
  console.log('TournamentResults component - Current location:', window.location.pathname);
  
  // Simple test - if this appears, the component is being called
  if (!id) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400">No Tournament ID Found</h1>
          <p className="text-slate-400 mt-2">URL: {window.location.pathname}</p>
          <Button onClick={() => window.history.back()} className="mt-4 bg-amber-600 hover:bg-amber-700">Go Back</Button>
        </div>
      </div>
    );
  }
  
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [finalStandings, setFinalStandings] = useState(null);
  const [standingsLoading, setStandingsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTournamentData();
    }
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      console.log('Fetching tournament data for ID:', id);
      const [tournamentResponse, participantsResponse] = await Promise.all([
        axios.get(`${API}/tournaments/${id}`),
        axios.get(`${API}/tournaments/${id}/participants`)
      ]);
      
      console.log('Tournament data:', tournamentResponse.data);
      console.log('Participants data:', participantsResponse.data);
      
      const t = tournamentResponse.data;
      setTournament(t);
      setParticipants(participantsResponse.data);

      // If tournament ended or caller requested final, fetch final standings
      const params = new URLSearchParams(window.location.search);
      const wantFinal = params.get('view') === 'final';
      const finishedByRounds = (t.tournament_over === true) ||
        (Array.isArray(t.completed_rounds) && t.completed_rounds.length >= (t.rounds || 0)) ||
        ((t.last_completed_round || 0) >= (t.rounds || 0));
      if (wantFinal || finishedByRounds || (t.last_completed_round || 0) > 0) {
        const roundToShow = t.last_completed_round || t.rounds || 1;
        await fetchRoundResults(roundToShow);
      }
      
    } catch (error) {
      console.error("Error fetching tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoundResults = async (roundNum) => {
    try {
      setStandingsLoading(true);
      const res = await axios.get(`${API}/tournaments/${id}/rounds/${roundNum}/results`);
      setFinalStandings(res.data);
    } catch (err) {
      console.error('Error loading standings:', err);
    } finally {
      setStandingsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="tournaments" />
        <div className="md:pl-64">
          <div className="h-16 flex items-center px-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30 md:hidden">
            <button className="text-slate-300" onClick={() => setSidebarOpen(true)} aria-label="Menu">
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-3 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" />
              <span className="font-semibold">ChessTournaments</span>
            </div>
          </div>
          <main className="px-6 md:px-10 py-12">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              <p className="mt-4 text-slate-300">Loading tournament information for ID: {id}...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="tournaments" />
        <div className="md:pl-64">
          <div className="h-16 flex items-center px-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-30 md:hidden">
            <button className="text-slate-300" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-3 flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" />
              <span className="font-semibold">ChessTournaments</span>
            </div>
          </div>
          <main className="px-6 md:px-10 py-12">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-slate-100 mb-4">Tournament Not Found</h1>
              <p className="text-slate-400 mb-4">The tournament you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => window.history.back()} className="bg-amber-600 hover:bg-amber-700">Go Back</Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} onNavigate={(to) => navigate(to)} current="tournaments" />
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Desktop quick-access theme toggle */}
      <div className="hidden md:block fixed top-3 right-4 z-40">
        <ThemeToggle />
      </div>
      <div className="md:pl-64">
        <div className={`h-16 flex items-center px-4 border-b ${barBg} backdrop-blur sticky top-0 z-30 md:hidden`}>
          <button className="text-slate-300" onClick={() => setSidebarOpen((o) => !o)} aria-label="Menu">
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <span className="font-semibold">ChessTournaments</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        
        <main className="px-6 md:px-10 py-8">
          {/* Local back button above tournament name */}
          <div className="mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="px-2 text-amber-400 hover:bg-amber-500/10">
              <ArrowLeft className="h-5 w-5 mr-1" /> Back
            </Button>
          </div>
          {/* Tournament Info */}
          <Card className={`mb-8 ${cardBg} rounded-xl`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
<CardTitle className="text-2xl font-extrabold text-amber-300">{tournament.name}</CardTitle>
                  <p className={`${theme === 'light' ? 'text-slate-700' : 'text-slate-200'} mt-2`}>
                    {tournament.location} • {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {tournament.rounds} rounds • {tournament.time_control} • Arbiter: {tournament.arbiter}
                  </p>
                </div>
                <div className="text-right">
<div className="inline-flex items-center gap-2 text-lg px-3 py-1 rounded-full border border-amber-500 bg-slate-800/70">
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span className="text-slate-900 dark:text-white">{participants.length} players</span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Final Standings (if available) */}
          {finalStandings && (
            <Card className={`mb-8 ${cardBg} rounded-xl`}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Final Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className={`${thBg}`}>
                      <TableHead className={`${headText} text-center px-4`}>Rank</TableHead>
                      <TableHead className={`${headText} px-4`}>Player</TableHead>
                      <TableHead className={`${headText} text-right px-4`}>Rating</TableHead>
                      <TableHead className={`${headText} text-right px-4`}>Points</TableHead>
                      <TableHead className={`${headText} text-center px-4`}>Record</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finalStandings.standings.map((s) => (
                      <TableRow
                        key={`${s.player_id}-${finalStandings.round}`}
                        className={`${zebra} hover:bg-slate-700/40 transition-colors`}
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {s.rank === 1 ? (
                              <span className="text-yellow-500" title="1st">🥇</span>
                            ) : s.rank === 2 ? (
                              <span className="text-slate-400" title="2nd">🥈</span>
                            ) : s.rank === 3 ? (
                              <span className="text-amber-700" title="3rd">🥉</span>
                            ) : null}
                            <span className="font-semibold">#{s.rank}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-full bg-slate-700/60 border border-slate-600 grid place-items-center text-xs text-slate-300">
                              {s.player_name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{s.player_name}</div>
                              <div className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>ID: {s.player_id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums text-slate-900 dark:text-slate-100">
                          {s.player_rating}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                          {s.points}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <span className="px-2 py-0.5 rounded-full border border-green-500/40 bg-green-500/15 text-green-600 dark:text-green-300 text-xs font-medium">
                              W {s.wins}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 text-xs font-medium">
                              D {s.draws}
                            </span>
                            <span className="px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-300 text-xs font-medium">
                              L {s.losses}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex items-center justify-between">
                  <span>
                    Round {finalStandings.round} • Completed games: {finalStandings.round_summary.completed_games}/{finalStandings.round_summary.total_games}
                  </span>
                  <span className="opacity-70">Updated just now</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants List */}
          <Card className="bg-slate-800/60 border-slate-700 rounded-xl">
            <CardHeader>
<CardTitle className="flex items-center text-amber-300">
                <Users className="h-5 w-5 mr-2 text-amber-400" />
                Tournament Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className={`${thBg}`}>
                      <TableHead className={`${headText}`}>Rank</TableHead>
                      <TableHead className={`${headText}`}>Name</TableHead>
                      <TableHead className={`${headText}`}>Rating</TableHead>
                      <TableHead className={`${headText}`}>Title</TableHead>
                      <TableHead className={`${headText}`}>Status</TableHead>
                      <TableHead className={`${headText}`}>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants
                      .sort((a, b) => (b.player?.rating || 0) - (a.player?.rating || 0))
                      .map((participant, index) => (
                      <TableRow key={participant.id} className={`${zebra}`}>
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">#{index + 1}</TableCell>
<TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {participant.player?.name || 'Unknown Player'}
                        </TableCell>
<TableCell className="font-semibold text-slate-900 dark:text-slate-100">{participant.player?.rating || 'Unrated'}</TableCell>
                        <TableCell>
                          {participant.player?.title && (
                            <Badge variant="secondary">{participant.player.title}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={participant.status === 'registered' ? 'default' : 'secondary'}
                            className={participant.status === 'registered' ? 'bg-green-600' : ''}
                          >
                            {participant.status || 'Registered'}
                          </Badge>
                        </TableCell>
<TableCell className="text-slate-900 dark:text-slate-100">
                          {new Date(participant.registration_date || participant.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className={`text-center py-8 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Participants Yet</h3>
                  <p>This tournament doesn't have any registered participants yet.</p>
                  <p className="text-sm mt-2">Players can join this tournament from the tournaments page.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  );
};

// Admin Component
const Admin = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => {}} showAuthButton={true} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Panel</h1>
        <AdminPanel />
      </main>
    </div>
  );
};


// Debug Component for unmatched routes
const NotFound = () => {
  const location = window.location;
  console.log('NotFound component - Current location:', location.pathname);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Route Debug</h1>
        <p className="text-gray-600 mb-4">Current path: {location.pathname}</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    </div>
  );
};

function App() {
  console.log('App component rendering');
  return (
    <div className="App">
      <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
            <Route path="/reset-password" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
            
            {/* Protected routes - require authentication */}
            <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/players" element={
              <AdminRoute>
                <Players />
              </AdminRoute>
            } />
            <Route path="/tournaments" element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            } />
            <Route path="/tournaments/:id" element={
              <ProtectedRoute>
                <TournamentResults />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } />
            <Route path="/about" element={
              <ProtectedRoute>
                <AboutPage />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Search, Trophy, Users, Globe, Plus, Edit, Trash2, Download, LogOut } from "lucide-react";
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

// Backend URL (from env in production, localhost fallback in dev)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

console.log('🔧 App.js Backend URL:', BACKEND_URL);
console.log('🔧 App.js API URL:', API);

// Header Component
const Header = ({ searchQuery, setSearchQuery, onSearch, showAuthButton = false }) => {
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/home" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ChessTournaments</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/home" className="text-gray-600 hover:text-blue-600 font-medium">Home</Link>
              {user?.role !== 'admin' && (
                <Link to="/tournaments" className="text-gray-600 hover:text-blue-600 font-medium">Tournaments</Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-gray-600 hover:text-blue-600 font-medium">Admin</Link>
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
            <Button onClick={onSearch} variant="outline" size="sm">
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

// Home Page
const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [recentTournaments, setRecentTournaments] = useState([]);
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
    <div className="min-h-screen bg-gray-50">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} showAuthButton={true} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Your Chess Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Discover and participate in chess tournaments around the world
          </p>
        </div>

        {/* Quick Actions */}
        <div className={`grid ${user?.role === 'admin' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8 mb-8`}>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/tournaments')}>
            <CardContent className="p-8 text-center">
              <Trophy className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Browse Tournaments</h3>
              <p className="text-gray-600">Find and join chess tournaments that match your skill level and interests</p>
            </CardContent>
          </Card>
          
          {user?.role === 'admin' ? (
            <>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin')}>
                <CardContent className="p-8 text-center">
                  <Plus className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Admin Panel</h3>
                  <p className="text-gray-600">Create and manage tournaments, add players, and oversee competitions</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-8 text-center">
                  <Globe className="h-16 w-16 text-orange-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">My Profile</h3>
                  <p className="text-gray-600">View your tournament history, ratings, and achievements</p>
                  <div className="mt-4">
                    <div className="text-sm text-gray-500">Coming soon...</div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8 text-center">
                <Users className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">My Profile</h3>
                <p className="text-gray-600">View your tournament history, ratings, and achievements</p>
                <div className="mt-4">
                  <div className="text-sm text-gray-500">Coming soon...</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Results</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Tournaments ({searchResults.tournaments?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {searchResults.tournaments?.map((tournament) => (
                  <div key={tournament.id} className="py-3 border-b last:border-b-0 hover:bg-gray-50 rounded px-2">
                    <div className="font-medium text-lg">{tournament.name}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      📍 {tournament.location} • 📅 {new Date(tournament.start_date).toLocaleDateString()}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate(`/tournaments/${tournament.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                )) || <p className="text-gray-500 text-center py-8">No tournaments found. Try a different search term.</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Tournaments */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Tournaments</h2>
          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Rounds</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTournaments.map((tournament) => (
                    <TableRow key={tournament.id}>
                      <TableCell className="font-medium">{tournament.name}</TableCell>
                      <TableCell>{tournament.location}</TableCell>
                      <TableCell>{new Date(tournament.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{tournament.rounds}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        >
                          View Tournament
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {recentTournaments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tournaments available at the moment. Check back soon for new tournaments!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Tournaments Page
const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinStatus, setJoinStatus] = useState({});
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
    
    try {
      // Search for user's player profile
      const searchResponse = await axios.get(`${API}/players`);
      let userPlayer = searchResponse.data.find(p => p.user_id === user.id);
      
      if (!userPlayer) {
        // Fallback to name search for backwards compatibility
        userPlayer = searchResponse.data.find(p => 
          p.name.toLowerCase() === user.name.toLowerCase() || 
          p.name.toLowerCase().includes(user.email.split('@')[0].toLowerCase())
        );
      }
      
      if (!userPlayer) {
        console.log('No player profile found for user:', user.email);
        return;
      }
      
      console.log('✅ Checking registration status for player:', userPlayer.name, 'across', tournaments.length, 'tournaments');
      
      // Check both registrations and requests for each tournament
      const statusChecks = tournaments.map(async (tournament) => {
        try {
          // Check if user is already registered (approved)
          const participantsResponse = await axios.get(`${API}/tournaments/${tournament.id}/participants`);
          const isRegistered = participantsResponse.data.some(p => p.player_id === userPlayer.id);
          
          if (isRegistered) {
            console.log(`🏆 User is registered for tournament: ${tournament.name}`);
            return { tournamentId: tournament.id, status: 'joined' };
          }
          
          // Check if user has any request (pending or approved)
          const token = localStorage.getItem('token');
          const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
          
          const requestsResponse = await axios.get(`${API}/my-requests`, { headers: authHeaders });
          const userRequest = requestsResponse.data.find(r => 
            r.tournament_id === tournament.id
          );
          
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
    <div className="min-h-screen bg-gray-50">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} showAuthButton={true} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tournaments</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tournament</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Rounds</TableHead>
                  <TableHead>Time Control</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell className="font-medium">{tournament.name}</TableCell>
                    <TableCell>{tournament.location}</TableCell>
                    <TableCell>{new Date(tournament.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(tournament.end_date).toLocaleDateString()}</TableCell>
                    <TableCell>{tournament.rounds}</TableCell>
                    <TableCell>{tournament.time_control}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        >
                          View Tournament
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
                          
                          // If tournament has ended, show "Tournament Over" and Final Standings button
                          if (isEnded) {
                            return (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-gray-600 border-gray-400 cursor-not-allowed bg-gray-100"
                                  disabled={true}
                                  title={endedByRounds ? 'All rounds completed' : `Ended on ${tournamentEnd.toLocaleDateString()}`}
                                >
                                  Tournament Over 🏁
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/tournaments/${tournament.id}?view=final`)}
                                  title="View final standings"
                                >
                                  Final Standings
                                </Button>
                              </>
                            );
                          }
                          
                          // If tournament has started but not ended, show "Tournament Started" button
                          if (isStarted && currentStatus !== 'joined') {
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-500 border-gray-300 cursor-not-allowed"
                                disabled={true}
                                title={`Tournament started on ${tournamentStart.toLocaleDateString()}`}
                              >
                                Tournament Started
                              </Button>
                            );
                          }
                          
                          // Show appropriate button based on join status
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
                                  : 'bg-blue-600 hover:bg-blue-700'
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
              <div className="text-center py-8 text-gray-500">
                No tournaments found.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
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

// Tournament Details Component
const TournamentResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  console.log('TournamentResults component - Tournament ID:', id);
  console.log('TournamentResults component - Current location:', window.location.pathname);
  
  // Simple test - if this appears, the component is being called
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">No Tournament ID Found</h1>
          <p className="text-gray-600 mt-2">URL: {window.location.pathname}</p>
          <Button onClick={() => window.history.back()} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }
  
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
      <div className="min-h-screen bg-gray-50">
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => {}} showAuthButton={true} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading tournament information for ID: {id}...</p>
            <p className="mt-2 text-sm text-gray-500">Debug: {window.location.pathname}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => {}} showAuthButton={true} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tournament Not Found</h1>
            <p className="text-gray-600 mb-4">The tournament you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => {}} showAuthButton={true} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tournament Info */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                <p className="text-gray-600 mt-2">
                  {tournament.location} • {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {tournament.rounds} rounds • {tournament.time_control} • Arbiter: {tournament.arbiter}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  <Trophy className="h-4 w-4 mr-1" />
                  {participants.length} players
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Final Standings (if available) */}
        {finalStandings && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="h-5 w-5 mr-2" />
                Final Standings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>W-D-L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finalStandings.standings.map((s) => (
                    <TableRow key={`${s.player_id}-${finalStandings.round}`}>
                      <TableCell>{s.rank}</TableCell>
                      <TableCell>{s.player_name}</TableCell>
                      <TableCell>{s.player_rating}</TableCell>
                      <TableCell>{s.points}</TableCell>
                      <TableCell>{s.wins}-{s.draws}-{s.losses}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-xs text-gray-600 mt-2">
                Round {finalStandings.round} • Completed games: {finalStandings.round_summary.completed_games}/{finalStandings.round_summary.total_games}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Tournament Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants
                    .sort((a, b) => (b.player?.rating || 0) - (a.player?.rating || 0)) // Sort by rating descending
                    .map((participant, index) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {participant.player?.name || 'Unknown Player'}
                      </TableCell>
                      <TableCell>{participant.player?.rating || 'Unrated'}</TableCell>
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
                      <TableCell>
                        {new Date(participant.registration_date || participant.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Participants Yet</h3>
                <p>This tournament doesn't have any registered participants yet.</p>
                <p className="text-sm mt-2">Players can join this tournament from the tournaments page.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </main>
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
            <Route path="/admin" element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
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
    </div>
  );
}

export default App;
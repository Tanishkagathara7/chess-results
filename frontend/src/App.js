import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Search, Trophy, Users, Globe, Plus, Edit, Trash2, Download, LogOut } from "lucide-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPanel from "./components/AdminPanel";
import TournamentRoundResults from "./components/TournamentRoundResults";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Badge } from "./components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";

// Hardcode localhost for development
const BACKEND_URL = 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

console.log('🔧 App.js Backend URL (hardcoded):', BACKEND_URL);
console.log('🔧 App.js API URL (hardcoded):', API);

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
            <Link to="/" className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ChessResults</span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Home</Link>
              <Link to="/tournaments" className="text-gray-600 hover:text-blue-600 font-medium">Tournaments</Link>
              <Link to="/players" className="text-gray-600 hover:text-blue-600 font-medium">Players</Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search players, tournaments..."
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
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Chess Tournament Results
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Find players, tournaments, and chess results from around the world
          </p>
          
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for players, tournaments, federations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-12 h-14 text-lg"
              />
            </div>
            <Button onClick={handleSearch} className="mt-4 px-8 py-3 text-lg">
              Search Now
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Results</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Players */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Players ({searchResults.players?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {searchResults.players?.map((player) => (
                    <div key={player.id} className="py-2 border-b last:border-b-0">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-gray-600">
                        Rating: {player.rating}
                        {player.title && <Badge variant="secondary" className="ml-2">{player.title}</Badge>}
                      </div>
                    </div>
                  )) || <p className="text-gray-500">No players found</p>}
                </CardContent>
              </Card>

              {/* Tournaments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Trophy className="h-5 w-5 mr-2" />
                    Tournaments ({searchResults.tournaments?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {searchResults.tournaments?.map((tournament) => (
                    <div key={tournament.id} className="py-2 border-b last:border-b-0">
                      <div className="font-medium">{tournament.name}</div>
                      <div className="text-sm text-gray-600">
                        {tournament.location} • {new Date(tournament.start_date).toLocaleDateString()}
                      </div>
                    </div>
                  )) || <p className="text-gray-500">No tournaments found</p>}
                </CardContent>
              </Card>
            </div>
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
                          View Results
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {recentTournaments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tournaments found. Create one from the admin panel.
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get(`${API}/tournaments`);
      setTournaments(response.data);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
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
    } catch (error) {
      console.error("Error searching tournaments:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} />
      
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                      >
                        View Results
                      </Button>
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
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={handleSearch} />
      
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

// Tournament Results Component
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
  const [results, setResults] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (id) {
      fetchTournamentData();
    }
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);
      console.log('Fetching tournament data for ID:', id);
      const [tournamentResponse, resultsResponse, participantsResponse] = await Promise.all([
        axios.get(`${API}/tournaments/${id}`),
        axios.get(`${API}/results?tournament_id=${id}`),
        axios.get(`${API}/tournaments/${id}/participants`)
      ]);
      
      console.log('Tournament data:', tournamentResponse.data);
      console.log('Results data:', resultsResponse.data);
      console.log('Participants data:', participantsResponse.data);
      
      setTournament(tournamentResponse.data);
      setResults(resultsResponse.data);
      setParticipants(participantsResponse.data);
    } catch (error) {
      console.error("Error fetching tournament data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => {}} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading tournament results for ID: {id}...</p>
            <p className="mt-2 text-sm text-gray-500">Debug: {window.location.pathname}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => {}} />
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
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} onSearch={() => {}} />
      
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

        {/* Tournament Rounds Navigation */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Tournament Rounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: tournament.rounds }, (_, i) => i + 1).map(roundNum => {
                const isCompleted = tournament.completed_rounds?.includes(roundNum);
                return (
                  <Button
                    key={roundNum}
                    variant={isCompleted ? "default" : "outline"}
                    size="sm"
                    onClick={() => navigate(`/tournaments/${tournament.id}/rounds/${roundNum}`)}
                    className={isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    Round {roundNum}
                    {isCompleted && " ✓"}
                  </Button>
                );
              })}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Click on any round to view detailed results and standings after that round.
            </p>
          </CardContent>
        </Card>

        {/* Overall Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Final Tournament Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h3>
                <p className="text-gray-600">Tournament results will appear here once they are published.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">TB1</TableHead>
                    <TableHead className="text-center">TB2</TableHead>
                    <TableHead className="text-center">TB3</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-bold">
                        {result.rank === 1 && <span className="text-yellow-600">🥇</span>}
                        {result.rank === 2 && <span className="text-gray-500">🥈</span>}
                        {result.rank === 3 && <span className="text-amber-600">🥉</span>}
                        <span className="ml-1">{result.rank}</span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{result.player?.name}</div>
                        {result.player?.title && (
                          <Badge variant="secondary" className="mt-1">
                            {result.player.title}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{result.points}</TableCell>
                      <TableCell className="text-center">{result.tiebreak1}</TableCell>
                      <TableCell className="text-center">{result.tiebreak2}</TableCell>
                      <TableCell className="text-center">{result.tiebreak3}</TableCell>
                      <TableCell className="text-center">{result.player?.rating || '-'}</TableCell>
                      <TableCell className="text-center">{result.performance_rating || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/players" element={<Players />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentResults />} />
            <Route path="/tournaments/:id/rounds/:round" element={<TournamentRoundResults />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
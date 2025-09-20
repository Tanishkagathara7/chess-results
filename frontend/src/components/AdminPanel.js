import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Trophy, Users, Plus, Edit, Trash2, Calendar, MapPin, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateTournamentForm, formatDateError } from '../utils/validation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
    const navigate = useNavigate();
    const todayStr = new Date().toISOString().split('T')[0];
    // State management
    const [activeTab, setActiveTab] = useState('tournaments');
    const [tournaments, setTournaments] = useState([]);
    const [players, setPlayers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form states
    const [tournamentForm, setTournamentForm] = useState({
        name: '',
        location: '',
        start_date: '',
        end_date: '',
        rounds: '',
        time_control: '',
        arbiter: '',
        tournament_type: 'swiss',
        round_eliminations: []
    });
    
    const [playerForm, setPlayerForm] = useState({
        name: '',
        rating: '',
        title: 'none',
        birth_year: ''
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    
    // Tournament participants state
    const [selectedTournament, setSelectedTournament] = useState(null);
    const [tournamentParticipants, setTournamentParticipants] = useState([]);
    const [isAddPlayersDialogOpen, setIsAddPlayersDialogOpen] = useState(false);
    const [selectedPlayers, setSelectedPlayers] = useState([]);
const [availablePlayers, setAvailablePlayers] = useState([]);
    
    // Pairings & Results state
    const [pairingsMap, setPairingsMap] = useState({}); // { [tournamentId]: Array<pairing> }
    const [pairingsExpanded, setPairingsExpanded] = useState({}); // { [tournamentId]: boolean }
    const [pairingsLoadingId, setPairingsLoadingId] = useState(null);
    const [generatingPairingsId, setGeneratingPairingsId] = useState(null);
    const [savingResultId, setSavingResultId] = useState(null);
    const [resultDraft, setResultDraft] = useState({}); // { pairingId: '1-0' | '0-1' | '1/2-1/2' }

    const [resultsExpanded, setResultsExpanded] = useState({}); // { [tournamentId]: boolean }
    const [resultsCache, setResultsCache] = useState({}); // { [tournamentId]: { [round]: resultData } }
    const [resultsLoadingKey, setResultsLoadingKey] = useState(null);
    
    // Manual refresh only - no automatic polling

    // Fetch data
    useEffect(() => {
        fetchAllData();
    }, []);
    
    // Real-time polling disabled - users can manually refresh using the refresh button
    

    const fetchAllData = async () => {
        try {
            // Get auth token
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            const [tournamentsRes, playersRes, requestsRes] = await Promise.all([
                axios.get(`${API}/tournaments`, { headers: authHeaders }),
                axios.get(`${API}/players`, { headers: authHeaders }),
                axios.get(`${API}/tournament-requests`, { headers: authHeaders })
            ]);
            setTournaments(tournamentsRes.data);
            setPlayers(playersRes.data);
            setRequests(requestsRes.data);
        } catch (error) {
            setError('Failed to fetch data');
            console.error('Error fetching data:', error);
            
            // If it's an auth error, redirect to login
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/admin/login');
            }
        }
    };
    
    // Fetch only tournament requests (for real-time polling)
    const fetchRequestsOnly = async (showNotification = false) => {
        try {
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            const requestsRes = await axios.get(`${API}/tournament-requests`, { headers: authHeaders });
            const newRequests = requestsRes.data;
            
            // Check if there are new requests
            if (showNotification && newRequests.length > requests.length) {
                const newRequestCount = newRequests.length - requests.length;
                showMessage(`🔔 ${newRequestCount} new tournament request${newRequestCount > 1 ? 's' : ''} received!`);
            }
            
            setRequests(newRequests);
        } catch (error) {
            console.error('Error fetching requests:', error);
            // Don't show error messages for polling failures to avoid spam
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/admin/login');
            }
        }
    };

    const showMessage = (message, isError = false) => {
        if (isError) {
            setError(message);
            setSuccess('');
        } else {
            setSuccess(message);
            setError('');
        }
        setTimeout(() => {
            setError('');
            setSuccess('');
        }, 3000);
    };

    // Tournament operations
    const handleTournamentSubmit = async (e) => {
        e.preventDefault();
        
        // Client-side validation
        const validation = validateTournamentForm(tournamentForm);
        setValidationErrors(validation.errors);
        
        if (!validation.isValid) {
            showMessage('Please fix the validation errors', true);
            return;
        }
        
        setLoading(true);
        
        try {
            const tournamentData = {
                ...tournamentForm,
                rounds: parseInt(tournamentForm.rounds),
                start_date: new Date(tournamentForm.start_date).toISOString(),
                end_date: new Date(tournamentForm.end_date).toISOString()
            };
            

            if (editingId) {
                await axios.put(`${API}/tournaments/${editingId}`, tournamentData);
                showMessage('Tournament updated successfully');
            } else {
                await axios.post(`${API}/tournaments`, tournamentData);
                showMessage('Tournament created successfully');
            }
            
            resetTournamentForm();
            setIsDialogOpen(false);
            fetchAllData();
        } catch (error) {
            showMessage(error.response?.data?.error || 'Failed to save tournament', true);
        } finally {
            setLoading(false);
        }
    };

    const handleTournamentEdit = (tournament) => {
        setTournamentForm({
            name: tournament.name,
            location: tournament.location,
            start_date: new Date(tournament.start_date).toISOString().split('T')[0],
            end_date: new Date(tournament.end_date).toISOString().split('T')[0],
            rounds: tournament.rounds.toString(),
            time_control: tournament.time_control,
            arbiter: tournament.arbiter,
            tournament_type: tournament.tournament_type || 'swiss',
            round_eliminations: tournament.round_eliminations || []
        });
        setEditingId(tournament.id);
        setIsDialogOpen(true);
    };

    const handleTournamentDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this tournament?')) return;
        
        try {
            await axios.delete(`${API}/tournaments/${id}`);
            showMessage('Tournament deleted successfully');
            fetchAllData();
        } catch (error) {
            showMessage('Failed to delete tournament', true);
        }
    };

    const resetTournamentForm = () => {
        setTournamentForm({
            name: '',
            location: '',
            start_date: '',
            end_date: '',
            rounds: '',
            time_control: '',
            arbiter: '',
            tournament_type: 'swiss',
            round_eliminations: []
        });
        setEditingId(null);
        setValidationErrors({});
    };

    // Real-time validation for tournament form
    const handleTournamentFormChange = (field, value) => {
        const newForm = { ...tournamentForm, [field]: value };
        
        // If tournament type changes to knockout, initialize round eliminations
        if (field === 'tournament_type' && value === 'knockout' && tournamentForm.rounds) {
            const rounds = parseInt(tournamentForm.rounds);
            if (rounds > 0 && newForm.round_eliminations.length === 0) {
                newForm.round_eliminations = Array.from({ length: rounds }, (_, i) => ({
                    round: i + 1,
                    eliminations: i === rounds - 1 ? 0 : 1 // Final round has no eliminations
                }));
            }
        }
        
        // If rounds change and it's knockout, update round eliminations
        if (field === 'rounds' && newForm.tournament_type === 'knockout') {
            const rounds = parseInt(value);
            if (rounds > 0) {
                newForm.round_eliminations = Array.from({ length: rounds }, (_, i) => {
                    const existing = newForm.round_eliminations.find(re => re.round === i + 1);
                    return existing || {
                        round: i + 1,
                        eliminations: i === rounds - 1 ? 0 : 1 // Final round has no eliminations
                    };
                });
            }
        }
        
        setTournamentForm(newForm);
        
        // Re-validate on change to provide real-time feedback
        const validation = validateTournamentForm(newForm);
        setValidationErrors(validation.errors);
    };
    
    // Handle round elimination changes
    const handleRoundEliminationChange = (roundIndex, eliminations) => {
        const newEliminations = [...tournamentForm.round_eliminations];
        newEliminations[roundIndex] = {
            ...newEliminations[roundIndex],
            eliminations: parseInt(eliminations) || 0
        };
        setTournamentForm({
            ...tournamentForm,
            round_eliminations: newEliminations
        });
    };

    // Tournament participants functions
    const fetchTournamentParticipants = async (tournamentId) => {
        try {
            const response = await axios.get(`${API}/tournaments/${tournamentId}/participants`);
            setTournamentParticipants(response.data);
        } catch (error) {
            console.error('Error fetching tournament participants:', error);
            showMessage('Failed to fetch tournament participants', true);
        }
    };

    const handleAddPlayersClick = async (tournament) => {
        console.log('🎯 Opening add players dialog for:', tournament.name);
        setSelectedTournament(tournament);
        setSelectedPlayers([]);
        
        try {
            console.log('📡 Fetching participants and players...');
            // Fetch current participants to filter out already registered players
            const [participantsRes, playersRes] = await Promise.all([
                axios.get(`${API}/tournaments/${tournament.id}/participants`),
                axios.get(`${API}/players`)
            ]);
            
            console.log('✅ Participants:', participantsRes.data);
            console.log('✅ Players:', playersRes.data);
            
            const participantPlayerIds = participantsRes.data.map(p => p.player_id);
            const available = playersRes.data.filter(player => !participantPlayerIds.includes(player.id));
            
            console.log('📋 Available players:', available.length);
            
            setTournamentParticipants(participantsRes.data);
            setAvailablePlayers(available);
            setIsAddPlayersDialogOpen(true);
        } catch (error) {
            console.error('❌ Failed to load players data:', error);
            showMessage('Failed to load players data', true);
        }
    };

    const handleAddSelectedPlayers = async () => {
        if (selectedPlayers.length === 0) {
            showMessage('Please select at least one player', true);
            return;
        }

        console.log('⭕ Adding players:', selectedPlayers, 'to tournament:', selectedTournament.id);
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            const promises = selectedPlayers.map(playerId => {
                console.log('📤 Adding player:', playerId);
                return axios.post(`${API}/tournaments/${selectedTournament.id}/participants`, { player_id: playerId }, { headers: authHeaders });
            });
            
            const results = await Promise.all(promises);
            console.log('✅ Add players results:', results.map(r => r.data));
            
            showMessage(`${selectedPlayers.length} player(s) added to tournament successfully`);
            
            // Refresh participants list and available players
            await fetchTournamentParticipants(selectedTournament.id);
            
            // Update available players by removing the added ones
            setAvailablePlayers(prev => prev.filter(player => !selectedPlayers.includes(player.id)));
            
            setSelectedPlayers([]);
        } catch (error) {
            console.error('❌ Failed to add players:', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            showMessage(error.response?.data?.error || 'Failed to add players', true);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSinglePlayer = async (playerId) => {
        console.log('⭕ Adding single player:', playerId, 'to tournament:', selectedTournament.id);
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            console.log('📤 Adding player:', playerId);
            const response = await axios.post(`${API}/tournaments/${selectedTournament.id}/participants`, { player_id: playerId }, { headers: authHeaders });
            console.log('✅ Add player result:', response.data);
            
            showMessage('Player added to tournament successfully');
            
            // Refresh participants list and available players
            await fetchTournamentParticipants(selectedTournament.id);
            
            // Refresh available players by removing the added player
            setAvailablePlayers(prev => prev.filter(player => player.id !== playerId));
        } catch (error) {
            console.error('❌ Failed to add player:', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            showMessage(error.response?.data?.error || 'Failed to add player', true);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveParticipant = async (tournamentId, playerId) => {
        if (!window.confirm('Are you sure you want to remove this player from the tournament? The player will be notified of their removal.')) return;
        
        try {
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            const response = await axios.delete(`${API}/tournaments/${tournamentId}/participants/${playerId}`, { headers: authHeaders });
            
            // Show different messages based on whether notification was sent
            if (response.data.notification_sent) {
                showMessage(`Player removed from tournament successfully. Notification sent to ${response.data.notified_user}.`);
            } else {
                showMessage('Player removed from tournament successfully. No user notification sent (no associated user found).');
            }
            
            // Refresh participants list
            await fetchTournamentParticipants(tournamentId);
            
            // If we're in the add players dialog, refresh the available players list
            if (tournamentId === selectedTournament?.id && isAddPlayersDialogOpen) {
                // Find the removed player and add them back to available players
                const removedPlayer = players.find(player => player.id === playerId);
                if (removedPlayer) {
                    setAvailablePlayers(prev => [...prev, removedPlayer].sort((a, b) => b.rating - a.rating));
                }
            }
        } catch (error) {
            console.error('❌ Failed to remove player:', error);
            showMessage(error.response?.data?.error || 'Failed to remove player from tournament', true);
        }
    };
    

    const togglePlayerSelection = (playerId) => {
        console.log('🎯 Toggling player selection for:', playerId);
        setSelectedPlayers(prev => {
            const newSelection = prev.includes(playerId) 
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId];
            console.log('📋 Selected players updated:', newSelection);
            return newSelection;
        });
    };


    // Pairings functions
    const fetchTournamentPairings = async (tournamentId) => {
        try {
            setPairingsLoadingId(tournamentId);
            const res = await axios.get(`${API}/tournaments/${tournamentId}/pairings`);
            setPairingsMap(prev => ({ ...prev, [tournamentId]: res.data }));
        } catch (error) {
            console.error('Error fetching pairings:', error);
            showMessage(error.response?.data?.error || 'Failed to fetch pairings', true);
        } finally {
            setPairingsLoadingId(null);
        }
    };

    const getNextRoundNumber = (tournament, pairingsForTournament = []) => {
        if (!pairingsForTournament || pairingsForTournament.length === 0) return 1;
        const maxRound = pairingsForTournament.reduce((m, p) => Math.max(m, p.round || 0), 0);
        return Math.min(maxRound + 1, tournament.rounds || maxRound + 1);
    };

    const handleGeneratePairings = async (tournament) => {
        try {
            const pairingsForTournament = pairingsMap[tournament.id] || [];
            const nextRound = getNextRoundNumber(tournament, pairingsForTournament);

            // Knockout guard: require previous round completion before generating next
            if (tournament.tournament_type === 'knockout' && nextRound > 1) {
                const lastCompleted = (tournament.completed_rounds || []).slice(-1)[0] || 0;
                if (lastCompleted < nextRound - 1) {
                    showMessage(`Please complete round ${nextRound - 1} before generating round ${nextRound} (knockout)`, true);
                    return;
                }
            }

            setGeneratingPairingsId(tournament.id);
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            const body = { round: nextRound, options: { randomize: true } };
            const res = await axios.post(`${API}/tournaments/${tournament.id}/pairings/generate`, body, { headers: authHeaders });
            showMessage(res.data?.message || `Generated pairings for round ${nextRound}`);
            await fetchTournamentPairings(tournament.id);
        } catch (error) {
            console.error('Generate pairings error:', error);
            const status = error.response?.status;
            if (status === 404) {
                showMessage(error.response?.data?.error || 'Endpoint not found or tournament missing. If you recently updated the backend, please restart it and try again.', true);
            } else {
                showMessage(error.response?.data?.error || 'Failed to generate pairings', true);
            }
        } finally {
            setGeneratingPairingsId(null);
        }
    };

    const togglePairingsExpand = async (tournament) => {
        setPairingsExpanded(prev => ({ ...prev, [tournament.id]: !prev[tournament.id] }));
        if (!pairingsMap[tournament.id]) {
            await fetchTournamentPairings(tournament.id);
        }
    };

    const handleCompleteRound = async (tournamentId, round) => {
        try {
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(`${API}/tournaments/${tournamentId}/rounds/${round}/complete`, {}, { headers: authHeaders });
            showMessage(res.data?.message || `Round ${round} completed`);
            await Promise.all([fetchAllData(), fetchTournamentPairings(tournamentId)]);
        } catch (error) {
            console.error('Complete round error:', error);
            showMessage(error.response?.data?.error || 'Failed to complete round', true);
        }
    };

    const isTournamentEnded = (t) => {
        const rounds = t.rounds || 0;
        const completedCount = Array.isArray(t.completed_rounds) ? t.completed_rounds.length : 0;
        const lastCompleted = t.last_completed_round || 0;
        return t.tournament_over === true || (rounds > 0 && (completedCount >= rounds || lastCompleted >= rounds));
    };

    const goToFinalStandings = async (t) => {
        setActiveTab('results');
        setResultsExpanded(prev => ({ ...prev, [t.id]: true }));
        await fetchRoundResults(t.id, t.rounds);
    };

    const handleSavePairingResult = async (tournamentId, pairingId, value) => {
        if (!value) {
            showMessage('Please select a result before saving', true);
            return;
        }
        if (!['1-0','0-1','1/2-1/2'].includes(value)) {
            showMessage('Invalid result value', true);
            return;
        }
        try {
            setSavingResultId(pairingId);
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.put(`${API}/pairings/${pairingId}`, { result: value }, { headers: authHeaders });
            showMessage('Result saved');
            // Clear local draft and refresh list
            setResultDraft(prev => { const n = { ...prev }; delete n[pairingId]; return n; });
            await fetchTournamentPairings(tournamentId);
        } catch (error) {
            console.error('Save pairing result error:', error);
            showMessage(error.response?.data?.error || 'Failed to save result', true);
        } finally {
            setSavingResultId(null);
        }
    };

    // Results functions
    const fetchRoundResults = async (tournamentId, round) => {
        const key = `${tournamentId}:${round}`;
        try {
            setResultsLoadingKey(key);
            const res = await axios.get(`${API}/tournaments/${tournamentId}/rounds/${round}/results`);
            setResultsCache(prev => ({
                ...prev,
                [tournamentId]: { ...(prev[tournamentId] || {}), [round]: res.data }
            }));
        } catch (error) {
            console.error('Error fetching results:', error);
            showMessage(error.response?.data?.error || 'Failed to fetch results', true);
        } finally {
            setResultsLoadingKey(null);
        }
    };

    const toggleResultsExpand = (tournament) => {
        setResultsExpanded(prev => ({ ...prev, [tournament.id]: !prev[tournament.id] }));
    };


    // Player operations
    const handlePlayerSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const playerData = {
                ...playerForm,
                rating: parseInt(playerForm.rating) || 0,
                birth_year: playerForm.birth_year ? parseInt(playerForm.birth_year) : undefined,
                title: playerForm.title === 'none' ? '' : playerForm.title
            };

            if (editingId) {
                await axios.put(`${API}/players/${editingId}`, playerData);
                showMessage('Player updated successfully');
            } else {
                await axios.post(`${API}/players`, playerData);
                showMessage('Player created successfully');
            }
            
            resetPlayerForm();
            setIsDialogOpen(false);
            fetchAllData();
        } catch (error) {
            showMessage(error.response?.data?.error || 'Failed to save player', true);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerEdit = (player) => {
        setPlayerForm({
            name: player.name,
            rating: player.rating.toString(),
            title: player.title || 'none',
            birth_year: player.birth_year ? player.birth_year.toString() : ''
        });
        setEditingId(player.id);
        setIsDialogOpen(true);
    };

    const handlePlayerDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this player?')) return;
        
        try {
            await axios.delete(`${API}/players/${id}`);
            showMessage('Player deleted successfully');
            fetchAllData();
        } catch (error) {
            showMessage('Failed to delete player', true);
        }
    };

    const resetPlayerForm = () => {
        setPlayerForm({
            name: '',
            rating: '',
            title: 'none',
            birth_year: ''
        });
        setEditingId(null);
    };

    // Request management functions
    const handleApproveRequest = async (requestId, playerName, tournamentName) => {
        if (!window.confirm(`Approve ${playerName} for ${tournamentName}?`)) return;
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            await axios.put(`${API}/tournament-requests/${requestId}`, {
                action: 'approve'
            }, { headers: authHeaders });
            
            showMessage('Request approved successfully');
            fetchRequestsOnly(); // Refresh only requests for faster update
        } catch (error) {
            showMessage(error.response?.data?.error || 'Failed to approve request', true);
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRejectRequest = async (requestId, playerName, tournamentName) => {
        const reason = window.prompt(`Reject ${playerName} for ${tournamentName}? (Optional reason):`);
        if (reason === null) return; // User cancelled
        
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            await axios.put(`${API}/tournament-requests/${requestId}`, {
                action: 'reject',
                admin_notes: reason || 'No reason provided'
            }, { headers: authHeaders });
            
            showMessage('Request rejected successfully');
            fetchRequestsOnly(); // Refresh only requests for faster update
        } catch (error) {
            showMessage(error.response?.data?.error || 'Failed to reject request', true);
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/admin/login');
            }
        } finally {
            setLoading(false);
        }
    };
    


    const renderTournamentDialog = () => (
        <Dialog open={isDialogOpen && activeTab === 'tournaments'} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? 'Edit Tournament' : 'Create New Tournament'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTournamentSubmit} className="space-y-4">
                    {validationErrors.dates && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-red-600">
                                {formatDateError(validationErrors.dates)}
                            </AlertDescription>
                        </Alert>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Tournament Name</Label>
                            <Input
                                id="name"
                                value={tournamentForm.name}
                                onChange={(e) => handleTournamentFormChange('name', e.target.value)}
                                className={validationErrors.name ? 'border-red-500' : ''}
                                required
                            />
                            {validationErrors.name && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={tournamentForm.location}
                                onChange={(e) => handleTournamentFormChange('location', e.target.value)}
                                className={validationErrors.location ? 'border-red-500' : ''}
                                required
                            />
                            {validationErrors.location && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.location}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="start_date">Start Date</Label>
<Input
                                id="start_date"
                                type="date"
                                min={todayStr}
                                value={tournamentForm.start_date}
                                onChange={(e) => handleTournamentFormChange('start_date', e.target.value)}
                                className={validationErrors.start_date || validationErrors.dates ? 'border-red-500' : ''}
                                required
                            />
                            {validationErrors.start_date && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.start_date}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="end_date">End Date</Label>
<Input
                                id="end_date"
                                type="date"
                                min={tournamentForm.start_date || todayStr}
                                value={tournamentForm.end_date}
                                onChange={(e) => handleTournamentFormChange('end_date', e.target.value)}
                                className={validationErrors.end_date || validationErrors.dates ? 'border-red-500' : ''}
                                required
                            />
                            {validationErrors.end_date && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.end_date}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="tournament_type">Tournament Type</Label>
                            <Select 
                                value={tournamentForm.tournament_type} 
                                onValueChange={(value) => handleTournamentFormChange('tournament_type', value)}
                            >
                                <SelectTrigger className={validationErrors.tournament_type ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="swiss">Swiss System</SelectItem>
                                    <SelectItem value="knockout">Knockout</SelectItem>
                                </SelectContent>
                            </Select>
                            {validationErrors.tournament_type && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.tournament_type}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="rounds">Rounds</Label>
                            <Input
                                id="rounds"
                                type="number"
                                min="1"
                                max="20"
                                value={tournamentForm.rounds}
                                onChange={(e) => handleTournamentFormChange('rounds', e.target.value)}
                                className={validationErrors.rounds ? 'border-red-500' : ''}
                                required
                            />
                            {validationErrors.rounds && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.rounds}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="time_control">Time Control</Label>
                            <Input
                                id="time_control"
                                placeholder="e.g., 90+30"
                                value={tournamentForm.time_control}
                                onChange={(e) => handleTournamentFormChange('time_control', e.target.value)}
                                className={validationErrors.time_control ? 'border-red-500' : ''}
                                required
                            />
                            {validationErrors.time_control && (
                                <p className="text-sm text-red-600 mt-1">{validationErrors.time_control}</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="arbiter">Chief Arbiter</Label>
                        <Input
                            id="arbiter"
                            value={tournamentForm.arbiter}
                            onChange={(e) => handleTournamentFormChange('arbiter', e.target.value)}
                            className={validationErrors.arbiter ? 'border-red-500' : ''}
                            required
                        />
                        {validationErrors.arbiter && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.arbiter}</p>
                        )}
                    </div>
                    
                    {/* Round Elimination Configuration for Knockout Tournaments */}
                    {tournamentForm.tournament_type === 'knockout' && tournamentForm.rounds && (
                        <div className="space-y-3">
                            <Label>Round Eliminations</Label>
                            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-orange-800">
                                            Knockout Tournament Configuration
                                        </h3>
                                        <div className="mt-2 text-sm text-orange-700">
                                            <p>Configure how many players are eliminated after each round. The final round typically has 0 eliminations (winner determined by game result).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {tournamentForm.round_eliminations.map((roundElim, index) => (
                                    <div key={index} className="space-y-1">
                                        <Label className="text-xs font-medium">
                                            Round {roundElim.round}
                                            {index === tournamentForm.round_eliminations.length - 1 && (
                                                <span className="text-gray-500"> (Final)</span>
                                            )}
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={roundElim.eliminations}
                                            onChange={(e) => handleRoundEliminationChange(index, e.target.value)}
                                            className="text-sm"
                                            placeholder="0"
                                        />
                                        <p className="text-xs text-gray-500">
                                            {index === tournamentForm.round_eliminations.length - 1 
                                                ? "Players eliminated" 
                                                : "Eliminated"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="text-xs text-gray-600 mt-2">
                                <strong>Tip:</strong> For a proper knockout tournament, ensure the total eliminations across all rounds leaves exactly 1 winner.
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <div className={`${tournamentForm.tournament_type === 'swiss' ? "bg-blue-50 border border-blue-200" : "bg-orange-50 border border-orange-200"} rounded-md p-3`}>
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className={`h-5 w-5 ${tournamentForm.tournament_type === 'swiss' ? 'text-blue-400' : 'text-orange-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className={`text-sm font-medium ${tournamentForm.tournament_type === 'swiss' ? 'text-blue-800' : 'text-orange-800'}`}>
                                        {tournamentForm.tournament_type === 'swiss' ? 'Swiss Tournament System' : 'Knockout Tournament System'}
                                    </h3>
                                    <div className={`mt-2 text-sm ${tournamentForm.tournament_type === 'swiss' ? 'text-blue-700' : 'text-orange-700'}`}>
                                        <p>
                                            {tournamentForm.tournament_type === 'swiss' 
                                                ? 'This tournament will use the Swiss pairing system with color alternation and no eliminations.'
                                                : 'This tournament will eliminate players after each round according to the configuration above, culminating in a final winner.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                resetTournamentForm();
                                setIsDialogOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );

    const renderPlayerDialog = () => (
        <Dialog open={isDialogOpen && activeTab === 'players'} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? 'Edit Player' : 'Create New Player'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePlayerSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="player_name">Player Name</Label>
                        <Input
                            id="player_name"
                            value={playerForm.name}
                            onChange={(e) => setPlayerForm({...playerForm, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="rating">Rating</Label>
                        <Input
                            id="rating"
                            type="number"
                            min="0"
                            max="3000"
                            value={playerForm.rating}
                            onChange={(e) => setPlayerForm({...playerForm, rating: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Select 
                                value={playerForm.title} 
                                onValueChange={(value) => setPlayerForm({...playerForm, title: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select title" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No title</SelectItem>
                                    <SelectItem value="GM">GM</SelectItem>
                                    <SelectItem value="IM">IM</SelectItem>
                                    <SelectItem value="FM">FM</SelectItem>
                                    <SelectItem value="CM">CM</SelectItem>
                                    <SelectItem value="WGM">WGM</SelectItem>
                                    <SelectItem value="WIM">WIM</SelectItem>
                                    <SelectItem value="WFM">WFM</SelectItem>
                                    <SelectItem value="WCM">WCM</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="birth_year">Birth Year</Label>
                            <Input
                                id="birth_year"
                                type="number"
                                min="1900"
                                max="2020"
                                value={playerForm.birth_year}
                                onChange={(e) => setPlayerForm({...playerForm, birth_year: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                setIsDialogOpen(false);
                                resetPlayerForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );


    const renderAddPlayersDialog = () => (
        <Dialog open={isAddPlayersDialogOpen} onOpenChange={setIsAddPlayersDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>
                        Add Players to {selectedTournament?.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 h-[500px]">
                    {/* Available Players */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium">Available Players</h3>
                            <span className="text-sm text-gray-500">
                                {availablePlayers.length} players
                            </span>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">Select</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Rating</TableHead>
                                            <TableHead className="w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {availablePlayers.map((player) => (
                                            <TableRow key={player.id}>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPlayers.includes(player.id)}
                                                        onChange={() => togglePlayerSelection(player.id)}
                                                        className="rounded border-gray-300"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{player.name}</TableCell>
                                                <TableCell>{player.rating}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleAddSinglePlayer(player.id)}
                                                        disabled={loading || tournamentParticipants.some(p => p.player_id === player.id)}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        {loading ? 'Adding...' : 
                                                         tournamentParticipants.some(p => p.player_id === player.id) ? 'Added' : 'Add'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {availablePlayers.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No available players to add
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Current Participants */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium">Current Participants</h3>
                            <span className="text-sm text-gray-500">
                                {tournamentParticipants.length} players
                            </span>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Rating</TableHead>
                                            <TableHead className="w-12">Remove</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tournamentParticipants
                                            .filter((participant, index, array) => 
                                                // Remove duplicates based on player_id
                                                array.findIndex(p => p.player_id === participant.player_id) === index
                                            )
                                            .map((participant, index) => (
                                            <TableRow key={`participant-${participant.player_id}-${index}`}>
                                                <TableCell className="font-medium">
                                                    {participant.player.name}
                                                </TableCell>
                                                <TableCell>{participant.player.rating}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRemoveParticipant(selectedTournament.id, participant.player_id)}
                                                        disabled={loading}
                                                        className="text-red-600 hover:text-red-700"
                                                        title="Remove Player"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {tournamentParticipants.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No participants yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-gray-600">
                        {selectedPlayers.length > 0 && (
                            <span>{selectedPlayers.length} player(s) selected</span>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                setIsAddPlayersDialogOpen(false);
                                setSelectedPlayers([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleAddSelectedPlayers}
                            disabled={loading || selectedPlayers.length === 0}
                        >
                            {loading ? 'Adding...' : `Add ${selectedPlayers.length} Player(s)`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );

    return (
        <div className="space-y-6">
            {/* Messages */}
            {error && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('tournaments')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'tournaments'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Trophy className="h-4 w-4 inline mr-2" />
                        Tournaments ({tournaments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'players'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Users className="h-4 w-4 inline mr-2" />
                        Players ({players.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'requests'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Clock className="h-4 w-4 inline mr-2" />
                        Requests ({requests.filter(r => r.status === 'pending').length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pairings')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'pairings'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Pairings
                    </button>
                    <button
                        onClick={() => setActiveTab('results')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'results'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Results
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'tournaments' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Tournament Management</CardTitle>
                        <Button 
                            onClick={() => {
                                resetTournamentForm();
                                setIsDialogOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Tournament
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Dates</TableHead>
                                    <TableHead>Rounds</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Time Control</TableHead>
                                    <TableHead>Players</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tournaments.map((tournament) => (
                                    <TableRow key={tournament.id}>
                                        <TableCell className="font-medium">{tournament.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                                                {tournament.location}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                                                {new Date(tournament.start_date).toLocaleDateString()} - {new Date(tournament.end_date).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>{tournament.rounds}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {tournament.tournament_type || 'swiss'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{tournament.time_control}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {tournament.participant_count || 0} players
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleAddPlayersClick(tournament)}
                                                    className="text-blue-600 hover:text-blue-700"
                                                    title="Add Players"
                                                >
                                                    <Users className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTournamentEdit(tournament)}
                                                    title="Edit Tournament"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTournamentDelete(tournament.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                    title="Delete Tournament"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {tournaments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No tournaments found. Create your first tournament!
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'players' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Player Management</CardTitle>
                        <Button 
                            onClick={() => {
                                resetPlayerForm();
                                setIsDialogOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Player
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Birth Year</TableHead>
                                    <TableHead>Actions</TableHead>
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
                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePlayerEdit(player)}
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePlayerDelete(player.id)}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {players.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No players found. Add your first player!
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'requests' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>
                                    Tournament Join Requests
                                </CardTitle>
                                <p className="text-sm text-gray-600 mt-1">
                                    Manage user requests to join tournaments.
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchRequestsOnly(true)}
                                    className="text-xs"
                                    disabled={loading}
                                >
                                    🔄 Refresh
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Player</TableHead>
                                    <TableHead>Tournament</TableHead>
                                    <TableHead>Rating</TableHead>
                                    <TableHead>Request Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell className="font-medium">
                                            <div>
                                                <div>{request.player.name}</div>
                                                <div className="text-xs text-gray-500">{request.user.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{request.tournament.name}</div>
                                                <div className="text-xs text-gray-500">{request.tournament.location}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{request.player.rating}</TableCell>
                                        <TableCell>{new Date(request.request_date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={request.status === 'pending' ? 'secondary' : 
                                                       request.status === 'approved' ? 'default' : 'destructive'}
                                                className={request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                          request.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                                          'bg-red-100 text-red-800'}
                                            >
                                                {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                                {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                                                {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                                                {request.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {request.status === 'pending' ? (
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleApproveRequest(
                                                            request.id, 
                                                            request.player.name, 
                                                            request.tournament.name
                                                        )}
                                                        className="text-green-600 hover:text-green-700"
                                                        disabled={loading}
                                                        title="Approve Request"
                                                    >
                                                        <CheckCircle className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRejectRequest(
                                                            request.id, 
                                                            request.player.name, 
                                                            request.tournament.name
                                                        )}
                                                        className="text-red-600 hover:text-red-700"
                                                        disabled={loading}
                                                        title="Reject Request"
                                                    >
                                                        <XCircle className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500">
                                                    {request.status === 'approved' && 'Approved'}
                                                    {request.status === 'rejected' && (
                                                        <span title={request.admin_notes || 'No reason provided'}>
                                                            Rejected
                                                        </span>
                                                    )}
                                                    {request.approved_date && (
                                                        <div className="text-xs mt-1">
                                                            on {new Date(request.approved_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {requests.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Clock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Requests Yet</h3>
                                <p>Tournament join requests will appear here when users request to join tournaments.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'pairings' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Pairings</CardTitle>
                        <Button variant="outline" size="sm" onClick={fetchAllData}>🔄 Refresh</Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tournament</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Rounds</TableHead>
                                    <TableHead>Players</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tournaments.map((t) => {
                                    const pairingsForT = pairingsMap[t.id] || [];
                                    const nextRound = getNextRoundNumber(t, pairingsForT);
                                    const ended = isTournamentEnded(t) || nextRound > (t.rounds || 0);
                                    const canGenerate = !ended && nextRound <= (t.rounds || 0);
                                    const genDisabled = generatingPairingsId === t.id || !canGenerate;
                                    return (
                                        <React.Fragment key={`pair-row-${t.id}`}>
                                            <TableRow>
                                                <TableCell className="font-medium">{t.name}</TableCell>
                                                <TableCell className="capitalize">{t.tournament_type || 'swiss'}</TableCell>
                                                <TableCell>{t.rounds}</TableCell>
                                                <TableCell>{t.participant_count || 0}</TableCell>
                                                <TableCell>
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => togglePairingsExpand(t)}
                                                            disabled={pairingsLoadingId === t.id}
                                                        >
                                                            {pairingsExpanded[t.id] ? 'Hide' : 'View'}
                                                        </Button>
                                                        {ended ? (
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary">Tournament ended</Badge>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => goToFinalStandings(t)}
                                                                >
                                                                    Final Standings
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleGeneratePairings(t)}
                                                                disabled={genDisabled}
                                                                title={canGenerate ? '' : 'All rounds are generated'}
                                                            >
                                                                {generatingPairingsId === t.id ? 'Generating...' : `Generate Round ${nextRound}`}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {pairingsExpanded[t.id] && (
                                                <TableRow>
                                                    <TableCell colSpan={5}>
                                                        {pairingsForT.length === 0 ? (
                                                            <div className="text-gray-500 py-4">No pairings yet.</div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                {[...new Set(pairingsForT.map(p => p.round))].sort((a,b)=>a-b).map((round) => (
                                                                    <div key={`round-${t.id}-${round}`} className="border rounded p-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="font-medium">Round {round}</div>
                                                                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                                                                <span>Boards: {pairingsForT.filter(p => p.round === round).length}</span>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => handleCompleteRound(t.id, round)}
                                                                                >
                                                                                    Complete Round
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow>
                                                                                    <TableHead>Board</TableHead>
                                                                                    <TableHead>White</TableHead>
                                                                                    <TableHead>Black</TableHead>
                                                                                    <TableHead>Result</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {pairingsForT.filter(p => p.round === round).sort((a,b)=>a.board_number-b.board_number).map(p => (
                                                                                    <TableRow key={p.id}>
                                                                                        <TableCell>{p.board_number}</TableCell>
                                                                                        <TableCell>{p.white_player?.name || p.white_player_id}</TableCell>
                                                                                        <TableCell>{p.black_player ? (p.black_player?.name || p.black_player_id) : <Badge variant="secondary">BYE</Badge>}</TableCell>
                                                                                        <TableCell>
                                                                                            {p.black_player ? (
                                                                                                <div className="flex items-center gap-2">
<Select
                                                                                                        value={resultDraft[p.id] ?? p.result}
                                                                                                        onValueChange={(v) => setResultDraft(prev => ({ ...prev, [p.id]: v }))}
                                                                                                    >
                                                                                                        <SelectTrigger className="h-8 w-32 text-sm">
                                                                                                            <SelectValue placeholder="Set result" />
                                                                                                        </SelectTrigger>
                                                                                                        <SelectContent>
                                                                                                            <SelectItem value="1-0">1-0 (White)</SelectItem>
                                                                                                            <SelectItem value="1/2-1/2">1/2-1/2 (Draw)</SelectItem>
                                                                                                            <SelectItem value="0-1">0-1 (Black)</SelectItem>
                                                                                                        </SelectContent>
                                                                                                    </Select>
                                                                                                    <Button
                                                                                                        size="sm"
                                                                                                        onClick={() => handleSavePairingResult(t.id, p.id, resultDraft[p.id] ?? p.result)}
                                                                                                        disabled={savingResultId === p.id || !(resultDraft[p.id] ?? p.result)}
                                                                                                    >
                                                                                                        {savingResultId === p.id ? 'Saving...' : (p.result ? 'Update' : 'Save')}
                                                                                                    </Button>
                                                                                                </div>
                                                                                            ) : (
                                                                                                '1 (bye)'
                                                                                            )}
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        {tournaments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No tournaments found.</div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'results' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Results</CardTitle>
                        <Button variant="outline" size="sm" onClick={fetchAllData}>🔄 Refresh</Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tournament</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Rounds</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tournaments.map((t) => (
                                    <React.Fragment key={`res-row-${t.id}`}>
                                        <TableRow>
                                            <TableCell className="font-medium">{t.name}</TableCell>
                                            <TableCell className="capitalize">{t.tournament_type || 'swiss'}</TableCell>
                                            <TableCell>{t.rounds}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => toggleResultsExpand(t)}>
                                                        {resultsExpanded[t.id] ? 'Hide' : 'View'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => fetchRoundResults(t.id, t.rounds)}
                                                        disabled={resultsLoadingKey === `${t.id}:${t.rounds}`}
                                                    >
                                                        {resultsLoadingKey === `${t.id}:${t.rounds}` ? 'Loading...' : 'Final Standings'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {resultsExpanded[t.id] && (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <div className="space-y-4">
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {Array.from({ length: t.rounds }, (_, i) => i + 1).map((r) => (
                                                                <Button
                                                                    key={`btn-${t.id}-${r}`}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => fetchRoundResults(t.id, r)}
                                                                    disabled={resultsLoadingKey === `${t.id}:${r}`}
                                                                >
                                                                    {resultsLoadingKey === `${t.id}:${r}` ? `Round ${r}...` : `Round ${r}`}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                        {(resultsCache[t.id] && Object.keys(resultsCache[t.id]).length > 0) ? (
                                                            Object.keys(resultsCache[t.id]).sort((a,b)=>Number(a)-Number(b)).map((rKey) => {
                                                                const data = resultsCache[t.id][rKey];
                                                                if (!data) return null;
                                                                return (
                                                                    <div key={`res-${t.id}-${rKey}`} className="border rounded p-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="font-medium">Round {data.round} Standings</div>
                                                                            <div className="text-sm text-gray-500">Tournament: {data.tournament_name}</div>
                                                                        </div>
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
                                                                                {data.standings.map((s) => (
                                                                                    <TableRow key={`${s.player_id}-${data.round}`}>
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
                                                                            Completed games in round {data.round}: {data.round_summary.completed_games} / {data.round_summary.total_games}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-gray-500 py-2">Select a round to load results.</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                        {tournaments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No tournaments found.</div>
                        )}
                    </CardContent>
                </Card>
            )}


            {/* Dialogs */}
            {renderTournamentDialog()}
            {renderPlayerDialog()}
            {renderAddPlayersDialog()}
        </div>
    );
};

export default AdminPanel;

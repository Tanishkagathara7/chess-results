import React, { useState, useEffect, useMemo } from 'react';
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
import { Trophy, Users, Plus, Edit, Trash2, Calendar, MapPin, AlertCircle, Clock, CheckCircle, XCircle, Menu, X, ArrowLeft, Eye, Phone, Mail, Target, BarChart3, Gamepad2, Crown, Save } from 'lucide-react';
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
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
        birth_year: '',
        email: '',
        phone: ''
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
    const [savingAllResults, setSavingAllResults] = useState(false);
    const [resultDraft, setResultDraft] = useState({}); // { pairingId: '1-0' | '0-1' | '1/2-1/2' }
    const [roundAccordion, setRoundAccordion] = useState({}); // { [tournamentId]: { [round]: boolean } }
    const [selectedPairingTournamentId, setSelectedPairingTournamentId] = useState(null);
    const [selectedResultsTournamentId, setSelectedResultsTournamentId] = useState(null);

    const [resultsExpanded, setResultsExpanded] = useState({}); // { [tournamentId]: boolean }
    const [resultsCache, setResultsCache] = useState({}); // { [tournamentId]: { [round]: resultData } }
    const [resultsLoadingKey, setResultsLoadingKey] = useState(null);
    const [finalStandings, setFinalStandings] = useState({}); // { [tournamentId]: finalStandingsData }
    const [loadingFinalStandings, setLoadingFinalStandings] = useState(false);
    const [resultsViewMode, setResultsViewMode] = useState({}); // { [tournamentId]: 'final' | 'rounds' }
    
    // Player details UI state
    const [isPlayerDetailsOpen, setIsPlayerDetailsOpen] = useState(false);
    const [selectedPlayerDetails, setSelectedPlayerDetails] = useState(null);
    const [playerHistory, setPlayerHistory] = useState([]);
    const [playerStats, setPlayerStats] = useState(null);
    const [playerDetailsLoading, setPlayerDetailsLoading] = useState(false);
    const [playerDetailsError, setPlayerDetailsError] = useState('');
    
    // Tournaments UI filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // all | swiss | knockout
    const [statusFilter, setStatusFilter] = useState('all'); // all | upcoming | ongoing | completed
    const [sortKey, setSortKey] = useState('start_desc'); // start_desc | start_asc | name_asc
    
    // Players UI filters
    const [playerSearchTerm, setPlayerSearchTerm] = useState('');
    const [playerSortKey, setPlayerSortKey] = useState('name_asc'); // name_asc | name_desc | rating_desc | rating_asc
    
    // Manual refresh only - no automatic polling

    // Fetch data
    useEffect(() => {
        fetchAllData();
    }, []);
    
    // Real-time polling disabled - users can manually refresh using the refresh button
    
    // Default selected tournament for Pairings view
    useEffect(() => {
        if (!selectedPairingTournamentId && tournaments.length > 0) {
            setSelectedPairingTournamentId(tournaments[0].id);
        }
    }, [tournaments, selectedPairingTournamentId]);

    // Fetch pairings when a tournament is selected in Pairings view
    useEffect(() => {
        if (selectedPairingTournamentId && !pairingsMap[selectedPairingTournamentId]) {
            fetchTournamentPairings(selectedPairingTournamentId);
        }
        if (selectedPairingTournamentId) {
            setPairingsExpanded(prev => ({ ...prev, [selectedPairingTournamentId]: true }));
        }
    }, [selectedPairingTournamentId]);

    // Default selected tournament for Results view
    useEffect(() => {
        if (!selectedResultsTournamentId && tournaments.length > 0) {
            setSelectedResultsTournamentId(tournaments[0].id);
        }
    }, [tournaments, selectedResultsTournamentId]);

    // Expand selected tournament by default in Results view
    useEffect(() => {
        if (selectedResultsTournamentId) {
            setResultsExpanded(prev => ({ ...prev, [selectedResultsTournamentId]: true }));
        }
    }, [selectedResultsTournamentId]);
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
            const available = playersRes.data
                .filter(player => !participantPlayerIds.includes(player.id))
                .map(p => ({ ...p, _linked: !!p.user_id }))
                .sort((a, b) => (b._linked - a._linked) || (b.rating - a.rating));
            
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

    // Accordion toggle per-round inside a tournament
    const toggleRoundAccordion = (tournamentId, round) => {
        setRoundAccordion(prev => ({
            ...prev,
            [tournamentId]: {
                ...(prev[tournamentId] || {}),
                [round]: !(prev[tournamentId]?.[round])
            }
        }));
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

    // Derive tournament status for UI
    const getTournamentStatus = (t) => {
        const now = Date.now();
        const start = new Date(t.start_date).getTime();
        const end = new Date(t.end_date).getTime();
        if (Number.isFinite(start) && now < start) return 'upcoming';
        if ((Number.isFinite(end) && now > end) || isTournamentEnded(t)) return 'completed';
        return 'ongoing';
    };

    // Filter, sort, and search tournaments for display
    const filteredTournaments = useMemo(() => {
        let list = Array.isArray(tournaments) ? [...tournaments] : [];
        const q = searchTerm.trim().toLowerCase();
        if (q) {
            list = list.filter(t => (t.name || '').toLowerCase().includes(q) || (t.location || '').toLowerCase().includes(q));
        }
        if (typeFilter !== 'all') {
            list = list.filter(t => (t.tournament_type || 'swiss') === typeFilter);
        }
        if (statusFilter !== 'all') {
            list = list.filter(t => getTournamentStatus(t) === statusFilter);
        }
        switch (sortKey) {
            case 'start_asc':
                list.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
                break;
            case 'name_asc':
                list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'start_desc':
            default:
                list.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        }
        return list;
    }, [tournaments, searchTerm, typeFilter, statusFilter, sortKey]);

    // Filter, sort, and search players for display
    const filteredPlayers = useMemo(() => {
        let list = Array.isArray(players) ? [...players] : [];
        const q = playerSearchTerm.trim().toLowerCase();
        if (q) {
            list = list.filter(p => 
                (p.name || '').toLowerCase().includes(q) ||
                (p.email || '').toLowerCase().includes(q) ||
                (p.phone || '').toLowerCase().includes(q)
            );
        }
        switch (playerSortKey) {
            case 'name_desc':
                list.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                break;
            case 'rating_desc':
                list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'rating_asc':
                list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
                break;
            case 'name_asc':
            default:
                list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return list;
    }, [players, playerSearchTerm, playerSortKey]);

    const fetchFinalStandings = async (tournamentId) => {
        try {
            setLoadingFinalStandings(true);
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
            
            // Fetch all pairings for the tournament to calculate final standings
            const pairingsRes = await axios.get(`${API}/tournaments/${tournamentId}/pairings/all`, { headers: authHeaders });
            const allPairings = pairingsRes.data || [];
            
            // Get participants for this tournament
            const participantsRes = await axios.get(`${API}/tournaments/${tournamentId}/participants`, { headers: authHeaders });
            const participants = participantsRes.data || [];
            
            // Calculate final standings
            const playerStats = new Map();
            
            // Initialize stats for all participants
            participants.forEach(participant => {
                playerStats.set(participant.player_id, {
                    player_id: participant.player_id,
                    player_name: participant.player.name,
                    player_rating: participant.player.rating,
                    player_title: participant.player.title,
                    player_email: participant.player.email,
                    player_phone: participant.player.phone,
                    points: 0,
                    games_played: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    byes: 0,
                    opponents: [],
                    performance_rating: 0
                });
            });
            
            // Process all pairings to calculate stats
            allPairings.forEach(pairing => {
                const whiteId = pairing.white_player_id;
                const blackId = pairing.black_player_id;
                const result = pairing.result;
                
                // Handle white player
                if (whiteId && playerStats.has(whiteId)) {
                    const whiteStat = playerStats.get(whiteId);
                    
                    if (!blackId) {
                        // Bye
                        whiteStat.points += 1;
                        whiteStat.byes += 1;
                    } else {
                        whiteStat.games_played += 1;
                        whiteStat.opponents.push(blackId);
                        
                        if (result === '1-0') {
                            whiteStat.points += 1;
                            whiteStat.wins += 1;
                        } else if (result === '1/2-1/2') {
                            whiteStat.points += 0.5;
                            whiteStat.draws += 1;
                        } else if (result === '0-1') {
                            whiteStat.losses += 1;
                        }
                    }
                }
                
                // Handle black player
                if (blackId && playerStats.has(blackId)) {
                    const blackStat = playerStats.get(blackId);
                    blackStat.games_played += 1;
                    blackStat.opponents.push(whiteId);
                    
                    if (result === '0-1') {
                        blackStat.points += 1;
                        blackStat.wins += 1;
                    } else if (result === '1/2-1/2') {
                        blackStat.points += 0.5;
                        blackStat.draws += 1;
                    } else if (result === '1-0') {
                        blackStat.losses += 1;
                    }
                }
            });
            
            // Calculate tiebreaks and sort standings
            const standings = Array.from(playerStats.values())
                .map(player => {
                    // Calculate Buchholz (sum of opponents' scores)
                    const buchholz = player.opponents.reduce((sum, oppId) => {
                        const opponent = playerStats.get(oppId);
                        return sum + (opponent ? opponent.points : 0);
                    }, 0);
                    
                    // Calculate Sonneborn-Berger (sum of defeated opponents' scores + 0.5 * drawn opponents' scores)
                    let sonnebornBerger = 0;
                    allPairings.forEach(pairing => {
                        if (pairing.white_player_id === player.player_id) {
                            if (pairing.result === '1-0') {
                                // Won as white - add full opponent score
                                const opponent = playerStats.get(pairing.black_player_id);
                                if (opponent) sonnebornBerger += opponent.points;
                            } else if (pairing.result === '1/2-1/2') {
                                // Drew as white - add half opponent score
                                const opponent = playerStats.get(pairing.black_player_id);
                                if (opponent) sonnebornBerger += opponent.points * 0.5;
                            }
                        } else if (pairing.black_player_id === player.player_id) {
                            if (pairing.result === '0-1') {
                                // Won as black - add full opponent score
                                const opponent = playerStats.get(pairing.white_player_id);
                                if (opponent) sonnebornBerger += opponent.points;
                            } else if (pairing.result === '1/2-1/2') {
                                // Drew as black - add half opponent score
                                const opponent = playerStats.get(pairing.white_player_id);
                                if (opponent) sonnebornBerger += opponent.points * 0.5;
                            }
                        }
                    });
                    
                    // Calculate head-to-head result vs direct competitors (for same points)
                    const directResults = new Map(); // opponent_id -> result
                    allPairings.forEach(pairing => {
                        if (pairing.white_player_id === player.player_id && pairing.black_player_id) {
                            const result = pairing.result;
                            if (result === '1-0') directResults.set(pairing.black_player_id, 1);
                            else if (result === '1/2-1/2') directResults.set(pairing.black_player_id, 0.5);
                            else if (result === '0-1') directResults.set(pairing.black_player_id, 0);
                        } else if (pairing.black_player_id === player.player_id && pairing.white_player_id) {
                            const result = pairing.result;
                            if (result === '0-1') directResults.set(pairing.white_player_id, 1);
                            else if (result === '1/2-1/2') directResults.set(pairing.white_player_id, 0.5);
                            else if (result === '1-0') directResults.set(pairing.white_player_id, 0);
                        }
                    });
                    
                    return {
                        ...player,
                        buchholz,
                        sonnebornBerger,
                        directResults,
                        total_games: player.games_played + player.byes
                    };
                })
                .sort((a, b) => {
                    // Multi-criteria tiebreaking system:
                    // 1. Points (descending)
                    if (b.points !== a.points) return b.points - a.points;
                    
                    // 2. Head-to-head result (if they played each other)
                    if (a.directResults.has(b.player_id)) {
                        const aVsB = a.directResults.get(b.player_id);
                        const bVsA = b.directResults.has(a.player_id) ? b.directResults.get(a.player_id) : (1 - aVsB);
                        if (aVsB !== bVsA) return bVsA - aVsB; // Higher score wins
                    }
                    
                    // 3. Buchholz Score (sum of opponents' scores) - descending
                    if (Math.abs(b.buchholz - a.buchholz) > 0.001) return b.buchholz - a.buchholz;
                    
                    // 4. Sonneborn-Berger Score - descending
                    if (Math.abs(b.sonnebornBerger - a.sonnebornBerger) > 0.001) return b.sonnebornBerger - a.sonnebornBerger;
                    
                    // 5. Number of wins - descending
                    if (b.wins !== a.wins) return b.wins - a.wins;
                    
                    // 6. Number of games played (fewer byes is better) - descending
                    if (b.games_played !== a.games_played) return b.games_played - a.games_played;
                    
                    // 7. Initial rating - descending
                    return (b.player_rating || 0) - (a.player_rating || 0);
                })
                .map((player, index) => ({ ...player, rank: index + 1 }));
                
            setFinalStandings(prev => ({ ...prev, [tournamentId]: standings }));
            return standings;
            
        } catch (error) {
            console.error('Error fetching final standings:', error);
            showMessage(error.response?.data?.error || 'Failed to fetch final standings', true);
            return [];
        } finally {
            setLoadingFinalStandings(false);
        }
    };

    const goToFinalStandings = async (t) => {
        setActiveTab('results');
        setSelectedResultsTournamentId(t.id);
        setResultsExpanded(prev => ({ ...prev, [t.id]: true }));
        setResultsViewMode(prev => ({ ...prev, [t.id]: 'final' }));
        await fetchFinalStandings(t.id);
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

    const handleSaveAllResults = async (tournamentId, round, roundPairings) => {
        // Get all pairings for this round that have results set (either from draft or existing)
        const pairingsWithResults = roundPairings
            .filter(p => p.black_player) // Only real games, not byes
            .filter(p => {
                const result = resultDraft[p.id] ?? p.result;
                return result && ['1-0', '0-1', '1/2-1/2'].includes(result);
            });

        if (pairingsWithResults.length === 0) {
            showMessage('No results to save for this round', true);
            return;
        }

        if (!window.confirm(`Save all ${pairingsWithResults.length} result(s) for Round ${round}?`)) {
            return;
        }

        try {
            setSavingAllResults(true);
            const token = localStorage.getItem('token');
            const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

            // Save all results concurrently
            const savePromises = pairingsWithResults.map(pairing => {
                const result = resultDraft[pairing.id] ?? pairing.result;
                return axios.put(`${API}/pairings/${pairing.id}`, { result }, { headers: authHeaders });
            });

            await Promise.all(savePromises);
            
            showMessage(`Successfully saved ${pairingsWithResults.length} result(s) for Round ${round}`);
            
            // Clear all drafts for this round and refresh
            setResultDraft(prev => {
                const newDraft = { ...prev };
                pairingsWithResults.forEach(p => delete newDraft[p.id]);
                return newDraft;
            });
            
            await fetchTournamentPairings(tournamentId);
        } catch (error) {
            console.error('Save all results error:', error);
            showMessage(error.response?.data?.error || 'Failed to save some results', true);
        } finally {
            setSavingAllResults(false);
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
                title: playerForm.title === 'none' ? '' : playerForm.title,
                email: playerForm.email ? playerForm.email : undefined,
                phone: playerForm.phone ? playerForm.phone : undefined
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
            birth_year: player.birth_year ? player.birth_year.toString() : '',
            email: player.email || '',
            phone: player.phone || ''
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
            birth_year: '',
            email: '',
            phone: ''
        });
        setEditingId(null);
    };

    // Player details helpers
    const computePlayerStats = (history = []) => {
        let wins = 0, draws = 0, losses = 0, byes = 0, white = 0, black = 0;
        history.forEach(h => {
            if (h.is_bye) { byes += 1; return; }
            if (h.color === 'white') white += 1; else if (h.color === 'black') black += 1;
            if (h.result === 'win') wins += 1; else if (h.result === 'draw') draws += 1; else if (h.result === 'loss') losses += 1;
        });
        return { total: wins + draws + losses + byes, wins, draws, losses, byes, white, black };
    };

    const fetchPlayerHistoryData = async (player) => {
        setPlayerDetailsError('');
        setPlayerDetailsLoading(true);
        try {
            // Try dedicated endpoint if exists
            try {
                const res = await axios.get(`${API}/players/${player.id}/history`);
                const hist = Array.isArray(res.data) ? res.data : (res.data?.history || []);
                if (hist.length > 0) {
                    setPlayerHistory(hist);
                    setPlayerStats(computePlayerStats(hist));
                    return;
                }
            } catch (e) {
                // Fallback below
            }
            // Fallback: aggregate from existing tournament pairings
            const tournamentsRes = await axios.get(`${API}/tournaments`);
            const ts = tournamentsRes.data || [];
            const all = [];
            // limit concurrency by sequential fetch to avoid hammering
            for (const t of ts) {
                try {
                    const pr = await axios.get(`${API}/tournaments/${t.id}/pairings`);
                    const pairs = pr.data || [];
                    pairs.forEach(p => {
                        const isWhite = p.white_player_id === player.id;
                        const isBlack = p.black_player_id === player.id;
                        if (!isWhite && !isBlack) return;
                        const color = isWhite ? 'white' : (isBlack ? 'black' : null);
                        let result = null;
                        if (!p.black_player_id && isWhite) {
                            // bye counted as point
                            result = 'win';
                        } else if (p.result === '1-0') {
                            result = isWhite ? 'win' : 'loss';
                        } else if (p.result === '0-1') {
                            result = isBlack ? 'win' : 'loss';
                        } else if (p.result === '1/2-1/2') {
                            result = 'draw';
                        }
                        all.push({
                            tournament_id: t.id,
                            tournament_name: t.name,
                            round: p.round,
                            color,
                            opponent_name: isWhite ? (p.black_player?.name || p.black_player_id || 'BYE') : (p.white_player?.name || p.white_player_id),
                            opponent_rating: isWhite ? (p.black_player?.rating || null) : (p.white_player?.rating || null),
                            result,
                            is_bye: !p.black_player_id && isWhite,
                        });
                    });
                } catch (e) {
                    // ignore tournaments without pairings
                }
            }
            setPlayerHistory(all);
            setPlayerStats(computePlayerStats(all));
        } catch (err) {
            setPlayerDetailsError(err.response?.data?.error || 'Failed to load player history');
            setPlayerHistory([]);
            setPlayerStats(computePlayerStats([]));
        } finally {
            setPlayerDetailsLoading(false);
        }
    };

    const openPlayerDetails = async (player) => {
        setSelectedPlayerDetails(player);
        setIsPlayerDetailsOpen(true);
        try {
            const res = await axios.get(`${API}/players/${player.id}`);
            if (res.data) setSelectedPlayerDetails(res.data);
        } catch (e) {
            // ignore
        }
        await fetchPlayerHistoryData(player);
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
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={playerForm.email}
                                onChange={(e) => setPlayerForm({ ...playerForm, email: e.target.value })}
                                placeholder="user@example.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={playerForm.phone}
                                onChange={(e) => setPlayerForm({ ...playerForm, phone: e.target.value })}
                                placeholder="+1 555 123 4567"
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

    const renderPlayerDetailsDialog = () => (
        <Dialog open={isPlayerDetailsOpen} onOpenChange={setIsPlayerDetailsOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Player Details</DialogTitle>
                </DialogHeader>
                {!selectedPlayerDetails ? (
                    <div className="text-gray-500">No player selected</div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-lg font-semibold flex items-center gap-2">
                                    {selectedPlayerDetails.name}
                                    {selectedPlayerDetails.title && <Badge variant="secondary">{selectedPlayerDetails.title}</Badge>}
                                </div>
                                <div className="text-sm text-gray-600">Rating: {selectedPlayerDetails.rating}</div>
                                <div className="text-sm text-gray-600">Birth Year: {selectedPlayerDetails.birth_year || '-'}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span>{selectedPlayerDetails.phone || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span>{selectedPlayerDetails.email || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Card>
                                <CardContent className="p-3">
                                    <div className="text-xs text-gray-500">Total Games</div>
                                    <div className="text-lg font-semibold">{playerStats?.total ?? 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-3">
                                    <div className="text-xs text-gray-500">W-D-L</div>
                                    <div className="text-lg font-semibold">{playerStats ? `${playerStats.wins}-${playerStats.draws}-${playerStats.losses}` : '0-0-0'}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-3">
                                    <div className="text-xs text-gray-500">Byes</div>
                                    <div className="text-lg font-semibold">{playerStats?.byes ?? 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-3">
                                    <div className="text-xs text-gray-500">Colors</div>
                                    <div className="text-lg font-semibold">{playerStats ? `${playerStats.white}W / ${playerStats.black}B` : '0W / 0B'}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* History */}
                        <div className="border rounded-md">
                            <div className="p-3 flex items-center justify-between">
                                <div className="font-medium">Recent Games</div>
                                {playerDetailsLoading && <div className="text-xs text-gray-500">Loading...</div>}
                                {playerDetailsError && <div className="text-xs text-red-600">{playerDetailsError}</div>}
                            </div>
                            <div className="max-h-[320px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tournament</TableHead>
                                            <TableHead>Round</TableHead>
                                            <TableHead>Opponent</TableHead>
                                            <TableHead>Color</TableHead>
                                            <TableHead>Result</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {playerHistory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5}>
                                                    <div className="text-center text-gray-500 py-6">No history found.</div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            playerHistory.slice().reverse().slice(0, 20).map((h, idx) => (
                                                <TableRow key={`hist-${idx}`}>
                                                    <TableCell className="font-medium">{h.tournament_name}</TableCell>
                                                    <TableCell>{h.round}</TableCell>
                                                    <TableCell>{h.opponent_name}{h.opponent_rating ? ` (${h.opponent_rating})` : ''}</TableCell>
                                                    <TableCell className="capitalize">{h.is_bye ? '—' : h.color}</TableCell>
                                                    <TableCell className={`${h.result === 'win' ? 'text-green-700' : h.result === 'loss' ? 'text-red-700' : 'text-gray-700'}`}>{h.is_bye ? 'BYE' : (h.result ? h.result.toUpperCase() : '-')}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}
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
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    {player.name}
                                                    {player._linked && (
                                                        <Badge variant="secondary" className="text-[10px]">Linked</Badge>
                                                    )}
                                                </TableCell>
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
        <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
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

            {/* Layout with sidebar */}
            <div className="md:grid md:grid-cols-[240px,1fr] items-start gap-6">
                {/* Mobile top bar */}
                <div className="md:hidden flex items-center justify-between mb-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="px-2">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setMobileNavOpen(true)} className="px-3">
                        <Menu className="h-4 w-4 mr-2" /> Sections
                    </Button>
                </div>
                {/* Desktop back button */}
                <div className="hidden md:flex mb-2 md:col-span-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/home')} className="px-2">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                </div>
                {/* Sidebar (desktop) */}
                <aside className="hidden md:block rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border border-slate-200/50 dark:border-gray-700/50 shadow-2xl shadow-slate-200/30 dark:shadow-black/40 backdrop-blur-xl p-5 h-fit sticky top-20 transition-all duration-300 hover:shadow-3xl hover:shadow-slate-200/40 dark:hover:shadow-black/50">
                    {/* Header */}
                    <div className="mb-6 pb-4 border-b border-slate-200/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 ring-2 ring-white/20 dark:ring-gray-800/20">
                                <Crown className="h-5 w-5 text-white drop-shadow-sm" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 dark:text-gray-100 tracking-tight">Admin Panel</h2>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Online</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">Manage your chess tournaments with powerful admin tools</p>
                    </div>

                    {/* Navigation */}
                    <nav className="space-y-2">
                        <button
                            onClick={() => setActiveTab('tournaments')}
                            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md ${
                                activeTab === 'tournaments'
                                    ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/30 shadow-lg shadow-amber-100/50 dark:shadow-amber-900/20'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                            }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                activeTab === 'tournaments'
                                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                                    : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                                <Trophy className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <span>Tournaments</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    activeTab === 'tournaments'
                                        ? 'bg-amber-200/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                        : 'bg-slate-200/80 text-slate-500 dark:bg-gray-700/50 dark:text-gray-400'
                                }`}>
                                    {tournaments.length}
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('players')}
                            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md ${
                                activeTab === 'players'
                                    ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/30 shadow-lg shadow-blue-100/50 dark:shadow-blue-900/20'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                            }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                activeTab === 'players'
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                                    : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                                <Users className="h-4 w-4" />
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <span>Players</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    activeTab === 'players'
                                        ? 'bg-blue-200/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        : 'bg-slate-200/80 text-slate-500 dark:bg-gray-700/50 dark:text-gray-400'
                                }`}>
                                    {players.length}
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md ${
                                activeTab === 'requests'
                                    ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/30 shadow-lg shadow-purple-100/50 dark:shadow-purple-900/20'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                            }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative ${
                                activeTab === 'requests'
                                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                                    : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                                <Clock className="h-4 w-4" />
                                {requests.filter(r => r.status === 'pending').length > 0 && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                                )}
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <span>Requests</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    requests.filter(r => r.status === 'pending').length > 0
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse'
                                        : activeTab === 'requests'
                                            ? 'bg-purple-200/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-slate-200/80 text-slate-500 dark:bg-gray-700/50 dark:text-gray-400'
                                }`}>
                                    {requests.filter(r => r.status === 'pending').length}
                                </span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('pairings')}
                            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md ${
                                activeTab === 'pairings'
                                    ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-500/30 shadow-lg shadow-green-100/50 dark:shadow-green-900/20'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                            }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                activeTab === 'pairings'
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                                    : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                                <Target className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <span>Pairings</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveTab('results')}
                            className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:shadow-md ${
                                activeTab === 'results'
                                    ? 'bg-gradient-to-r from-rose-500/10 to-pink-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/30 shadow-lg shadow-rose-100/50 dark:shadow-rose-900/20'
                                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                            }`}
                        >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                activeTab === 'results'
                                    ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white'
                                    : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                                <BarChart3 className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <span>Results</span>
                            </div>
                        </button>
                    </nav>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-gray-700/50">
                        <div className="flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-gray-500">
                            <Gamepad2 className="h-3 w-3" />
                            <span>Chess Results</span>
                        </div>
                    </div>
                </aside>

                {/* Content */}
                <div className="min-w-0 space-y-6">
            {activeTab === 'tournaments' && (
                <Card className="w-full">
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                            <div className="flex flex-wrap gap-2">
                                <Input
                                    placeholder="Search by name or location"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-[220px]"
                                />
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        <SelectItem value="swiss">Swiss</SelectItem>
                                        <SelectItem value="knockout">Knockout</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All status</SelectItem>
                                        <SelectItem value="upcoming">Upcoming</SelectItem>
                                        <SelectItem value="ongoing">Ongoing</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={sortKey} onValueChange={setSortKey}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="start_desc">Start date (newest)</SelectItem>
                                        <SelectItem value="start_asc">Start date (oldest)</SelectItem>
                                        <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || sortKey !== 'start_desc') && (
                                    <Button type="button" variant="outline" onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all'); setSortKey('start_desc'); }}>Reset</Button>
                                )}
                            </div>
                            <div className="text-sm text-gray-600">{filteredTournaments.length} of {tournaments.length} shown</div>
                        </div>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
<Table className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="hidden sm:table-cell">Location</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead className="hidden sm:table-cell">Rounds</TableHead>
                                        <TableHead className="hidden md:table-cell">Type</TableHead>
                                        <TableHead className="hidden md:table-cell">Time Control</TableHead>
                                        <TableHead className="hidden md:table-cell">Players</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTournaments.map((tournament) => (
                                        <TableRow key={tournament.id}>
                                            <TableCell className="font-medium">{tournament.name}</TableCell>
                                            <TableCell className="hidden sm:table-cell">
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
                                            <TableCell className="hidden sm:table-cell">
                                                <div className="space-y-1">
                                                    <div>{tournament.rounds}</div>
                                                    <div className="h-1 bg-gray-200 rounded">
                                                        <div className="h-full bg-amber-500 rounded" style={{ width: `${Math.min(100, Math.round(((Math.max(tournament.last_completed_round || 0, (Array.isArray(tournament.completed_rounds) ? tournament.completed_rounds.length : 0))) / (tournament.rounds || 1)) * 100))}%` }} />
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">
                                                        {Math.max(tournament.last_completed_round || 0, (Array.isArray(tournament.completed_rounds) ? tournament.completed_rounds.length : 0))} / {tournament.rounds || 0}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="capitalize">
                                                        {tournament.tournament_type || 'swiss'}
                                                    </Badge>
                                                    <Badge 
                                                        variant="secondary" 
                                                        className={`${getTournamentStatus(tournament) === 'upcoming' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : getTournamentStatus(tournament) === 'ongoing' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                                                    >
                                                        {getTournamentStatus(tournament)}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{tournament.time_control}</TableCell>
                                            <TableCell className="hidden md:table-cell">
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
                        </div>
                        {tournaments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No tournaments found. Create your first tournament!
                            </div>
                        )}
                        {tournaments.length > 0 && filteredTournaments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No tournaments match your filters.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'players' && (
                <Card className="w-full">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Player Management</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline"
                                className="px-2 sm:px-3 text-xs sm:text-sm"
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
                                        const res = await axios.post(`${API}/admin/link-players-to-users`, {}, { headers: authHeaders });
                                        showMessage(`Linked: ${res.data.linked_count}, already linked: ${res.data.already_linked}, ambiguous: ${res.data.ambiguous_count}`);
                                        fetchAllData();
                                    } catch (err) {
                                        showMessage(err.response?.data?.error || 'Failed to link players', true);
                                    }
                                }}
                            >
                                Link Players to Users
                            </Button>
                            <Button 
                                variant="outline"
                                className="px-2 sm:px-3 text-xs sm:text-sm"
                                onClick={async () => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
                                        const res = await axios.post(`${API}/admin/cleanup-duplicates`, {}, { headers: authHeaders });
                                        showMessage(`Cleanup done. Cleaned: ${res.data.records_cleaned}`);
                                    } catch (err) {
                                        showMessage(err.response?.data?.error || 'Cleanup failed', true);
                                    }
                                }}
                            >
                                Cleanup Duplicates
                            </Button>
                            <Button 
                                className="px-2 sm:px-3 text-xs sm:text-sm"
                                onClick={() => {
                                    resetPlayerForm();
                                    setIsDialogOpen(true);
                                }}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Player
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                            <div className="flex flex-wrap gap-2">
                                <Input
                                    placeholder="Search by name, email, or phone"
                                    value={playerSearchTerm}
                                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                                    className="w-[220px]"
                                />
                                <Select value={playerSortKey} onValueChange={setPlayerSortKey}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                                        <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                                        <SelectItem value="rating_desc">Rating (High-Low)</SelectItem>
                                        <SelectItem value="rating_asc">Rating (Low-High)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(playerSearchTerm || playerSortKey !== 'name_asc') && (
                                    <Button type="button" variant="outline" onClick={() => { setPlayerSearchTerm(''); setPlayerSortKey('name_asc'); }}>Reset</Button>
                                )}
                            </div>
                            <div className="text-sm text-gray-600">{filteredPlayers.length} of {players.length} shown</div>
                        </div>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
<Table className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead className="hidden sm:table-cell">Title</TableHead>
                                        <TableHead className="hidden sm:table-cell">Birth Year</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPlayers.map((player) => (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-medium">{player.name}</TableCell>
                                            <TableCell>{player.rating}</TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                {player.title && <Badge variant="secondary">{player.title}</Badge>}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">{player.birth_year || '-'}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openPlayerDetails(player)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-3 w-3" />
                                                    </Button>
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
                        </div>
                        {players.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No players found. Add your first player!
                            </div>
                        )}
                        {players.length > 0 && filteredPlayers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No players match your search criteria.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === 'requests' && (
                <Card className="w-full">
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
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
<Table className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Player</TableHead>
                                        <TableHead>Tournament</TableHead>
                                        <TableHead className="hidden sm:table-cell">Rating</TableHead>
                                        <TableHead className="hidden sm:table-cell">Request Date</TableHead>
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
                                        <TableCell className="hidden sm:table-cell">{request.player.rating}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{new Date(request.request_date).toLocaleDateString()}</TableCell>
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
                        </div>
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
                <Card className="w-full">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle>Pairings</CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Select tournament</span>
                            <Select value={selectedPairingTournamentId ? String(selectedPairingTournamentId) : ''} onValueChange={(v) => setSelectedPairingTournamentId(v)}>
                                <SelectTrigger className="w-[220px]">
                                    <SelectValue placeholder="Select tournament" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tournaments.map((t) => (
                                        <SelectItem key={`pairing-sel-${t.id}`} value={String(t.id)}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={fetchAllData}>🔄 Refresh</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {selectedPairingTournamentId ? (
                                tournaments.filter(t => t.id === selectedPairingTournamentId).map((t) => {
                                    const pairingsForT = pairingsMap[t.id] || [];
                                    const nextRound = getNextRoundNumber(t, pairingsForT);
                                    const ended = isTournamentEnded(t) || nextRound > (t.rounds || 0);
                                    const canGenerate = !ended && nextRound <= (t.rounds || 0);
                                    const genDisabled = generatingPairingsId === t.id || !canGenerate;
                                    return (
                                        <div key={`pair-card-${t.id}`} className="border rounded-lg p-4 bg-white/70 dark:bg-gray-900/60">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="text-base font-semibold">{t.name}</div>
                                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                                    <Badge variant="outline" className="capitalize">{t.tournament_type === 'knockout' ? '⚔ Knockout' : '♟ Swiss'}</Badge>
                                                    <Badge variant="outline">👥 Players: {t.participant_count || 0}</Badge>
                                                    <Badge variant="secondary" className="text-[11px]">{ended ? 'All rounds completed' : `Rounds: ${t.rounds} • Next: ${nextRound}`}</Badge>
                                                </div>
                                                <div className="pt-1">
                                                    <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                                        <span>{ended ? `Round ${t.rounds || 0} of ${t.rounds || 0}` : `Round ${Math.min(nextRound, t.rounds || nextRound)} of ${t.rounds || 0}`}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-200 rounded">
                                                        <div className="h-full bg-amber-500 rounded" style={{ width: `${Math.min(100, Math.round(((Math.max(t.last_completed_round || 0, (Array.isArray(t.completed_rounds) ? t.completed_rounds.length : 0))) / (t.rounds || 1)) * 100))}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => togglePairingsExpand(t)} disabled={pairingsLoadingId === t.id}>
                                                    {pairingsExpanded[t.id] ? 'Hide' : 'View'}
                                                </Button>
                                                {ended ? (
                                                    <>
                                                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Tournament ended</Badge>
                                                        <Button size="sm" variant="outline" onClick={() => goToFinalStandings(t)}>
                                                            <Trophy className="h-3 w-3 mr-1" /> Final Standings
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button size="sm" onClick={() => handleGeneratePairings(t)} disabled={genDisabled} title={canGenerate ? '' : 'All rounds are generated'}>
                                                        {generatingPairingsId === t.id
                                                            ? 'Generating...'
                                                            : (pairingsForT.length === 0 ? 'Start Tournament' : 'Generate Next Round')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {pairingsExpanded[t.id] && (
                                            <div className="mt-3 space-y-4">
                                                {pairingsForT.length === 0 ? (
                                                    <div className="text-gray-500 py-4">No pairings yet.</div>
                                                ) : (
                                                    [...new Set(pairingsForT.map(p => p.round))].sort((a,b)=>a-b).map((round) => (
                                                        <div key={`round-${t.id}-${round}`} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900/40">
                                                            <div className="flex items-center justify-between mb-2 cursor-pointer select-none" onClick={() => toggleRoundAccordion(t.id, round)}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs">{(roundAccordion[t.id]?.[round]) ? '▾' : '▸'}</span>
                                                                    <div className="font-medium">Round {round}</div>
                                                                    <Badge variant={(t.completed_rounds || []).includes(round) || (t.last_completed_round || 0) >= round ? 'secondary' : 'outline'} className={(t.completed_rounds || []).includes(round) || (t.last_completed_round || 0) >= round ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                                                        {(t.completed_rounds || []).includes(round) || (t.last_completed_round || 0) >= round ? 'Completed' : 'Open'}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-sm text-gray-600 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                                    <Badge variant="outline" className="text-xs">Boards: {pairingsForT.filter(p => p.round === round).length}</Badge>
                                                                    <div className="flex items-center gap-1">
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            onClick={(e) => { 
                                                                                e.stopPropagation(); 
                                                                                const roundPairings = pairingsForT.filter(p => p.round === round);
                                                                                handleSaveAllResults(t.id, round, roundPairings); 
                                                                            }} 
                                                                            disabled={savingAllResults}
                                                                            className="text-blue-600 hover:text-blue-700"
                                                                            title="Save all results for this round"
                                                                        >
                                                                            <Save className="h-3 w-3 mr-1" />
                                                                            {savingAllResults ? 'Saving...' : 'Save All'}
                                                                        </Button>
                                                                        {!((t.completed_rounds || []).includes(round) || (t.last_completed_round || 0) >= round) && (
                                                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleCompleteRound(t.id, round); }} className="text-green-600 hover:text-green-700">
                                                                                <CheckCircle className="h-3 w-3 mr-1" /> Complete Round
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {(roundAccordion[t.id]?.[round]) && (
                                                            <div className="overflow-x-auto -mx-2 sm:mx-0">
                                                                <Table className="w-full">
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Board</TableHead>
                                                                            <TableHead>White</TableHead>
                                                                            <TableHead>Black</TableHead>
                                                                            <TableHead>Result</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {pairingsForT
                                                                            .filter(p => p.round === round)
                                                                            .sort((a,b)=>a.board_number-b.board_number)
                                                                            .map(p => (
                                                                                <TableRow key={p.id}>
                                                                                    <TableCell>{p.board_number}</TableCell>
                                                                                    <TableCell className={`flex items-center ${((resultDraft[p.id] ?? p.result) === '1-0') ? 'font-semibold text-green-700' : ''}`}>
                                                                                        <span className="mr-1">♔</span>
                                                                                        <span>{p.white_player?.name || p.white_player_id}</span>
                                                                                        {((resultDraft[p.id] ?? p.result) === '1-0') && <CheckCircle className="h-3 w-3 ml-1 text-green-600" />}
                                                                                        {((resultDraft[p.id] ?? p.result) === '1/2-1/2') && <Badge variant="secondary" className="ml-1 text-[10px]">Draw</Badge>}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {p.black_player ? (
                                                                                            <div className={`flex items-center ${((resultDraft[p.id] ?? p.result) === '0-1') ? 'font-semibold text-green-700' : ''}`}>
                                                                                                <span className="mr-1">♚</span>
                                                                                                <span>{p.black_player?.name || p.black_player_id}</span>
                                                                                                {((resultDraft[p.id] ?? p.result) === '0-1') && <CheckCircle className="h-3 w-3 ml-1 text-green-600" />}
                                                                                                {((resultDraft[p.id] ?? p.result) === '1/2-1/2') && <Badge variant="secondary" className="ml-1 text-[10px]">Draw</Badge>}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <Badge variant="secondary">BYE</Badge>
                                                                                        )}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        {p.black_player ? (
                                                                                            <div className="flex items-center gap-2">
                                                                                                <div className="hidden sm:flex gap-1">
                                                                                                    <Button size="sm" variant="ghost" className="px-2" onClick={() => setResultDraft(prev => ({ ...prev, [p.id]: '1-0' }))}>1-0</Button>
                                                                                                    <Button size="sm" variant="ghost" className="px-2" onClick={() => setResultDraft(prev => ({ ...prev, [p.id]: '1/2-1/2' }))}>1/2-1/2</Button>
                                                                                                    <Button size="sm" variant="ghost" className="px-2" onClick={() => setResultDraft(prev => ({ ...prev, [p.id]: '0-1' }))}>0-1</Button>
                                                                                                </div>
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
                                                                                                <Button size="sm" variant="outline" onClick={() => handleSavePairingResult(t.id, p.id, resultDraft[p.id] ?? p.result)} disabled={savingResultId === p.id || !(resultDraft[p.id] ?? p.result)} className="text-blue-600 hover:text-blue-700">
                                                                                                    {savingResultId === p.id ? 'Saving...' : (p.result ? 'Update' : 'Save')}
                                                                                                </Button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <Badge variant="secondary" className="text-[11px]">1 (bye)</Badge>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                    </TableBody>
                                                                </Table>
                                                                {/* Save All button below table - Always show for open rounds */}
                                                                {(() => {
                                                                    const isCompleted = (t.completed_rounds || []).includes(round) || (t.last_completed_round || 0) >= round;
                                                                    return !isCompleted && (
                                                                    <div className="mt-3 flex justify-center">
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            onClick={() => {
                                                                                const roundPairings = pairingsForT.filter(p => p.round === round);
                                                                                handleSaveAllResults(t.id, round, roundPairings); 
                                                                            }} 
                                                                            disabled={savingAllResults}
                                                                            className="text-blue-600 hover:text-blue-700"
                                                                        >
                                                                            <Save className="h-3 w-3 mr-1" />
                                                                            {savingAllResults ? 'Saving All Results...' : 'Save All Results for Round ' + round}
                                                                        </Button>
                                                                    </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                            ) : (
                                <div className="text-gray-500 py-6">Select a tournament to view pairings.</div>
                            )}
                            {tournaments.length === 0 && (
                                <div className="text-center py-8 text-gray-500">No tournaments found.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'results' && (
                <Card className="w-full">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle>Results</CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Select tournament</span>
                            <Select value={selectedResultsTournamentId ? String(selectedResultsTournamentId) : ''} onValueChange={(v) => setSelectedResultsTournamentId(v)}>
                                <SelectTrigger className="w-[220px]">
                                    <SelectValue placeholder="Select tournament" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tournaments.map((t) => (
                                        <SelectItem key={`results-sel-${t.id}`} value={String(t.id)}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={fetchAllData}>🔄 Refresh</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto -mx-2 sm:mx-0">
<Table className="w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tournament</TableHead>
                                        <TableHead className="hidden sm:table-cell">Type</TableHead>
                                        <TableHead>Rounds</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {selectedResultsTournamentId ? (
                                    tournaments.filter(t => t.id === selectedResultsTournamentId).map((t) => (
                                        <React.Fragment key={`res-row-${t.id}`}>
                                            <TableRow>
                                                <TableCell className="font-medium">{t.name}</TableCell>
                                            <TableCell className="capitalize">{t.tournament_type || 'swiss'}</TableCell>
                                            <TableCell>{t.rounds}</TableCell>
                                            <TableCell>
                                                <div className="flex space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => toggleResultsExpand(t)}>
                                                        {resultsExpanded[t.id] ? 'Hide Results' : 'View Results'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {resultsExpanded[t.id] && (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <div className="space-y-4">
                                                        {/* Tab Navigation */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                                                <Button
                                                                    variant={(resultsViewMode[t.id] || 'final') === 'final' ? 'default' : 'ghost'}
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setResultsViewMode(prev => ({ ...prev, [t.id]: 'final' }));
                                                                        if (!finalStandings[t.id]) {
                                                                            fetchFinalStandings(t.id);
                                                                        }
                                                                    }}
                                                                    className="relative"
                                                                >
                                                                    <Trophy className="h-3 w-3 mr-1" />
                                                                    Final Standings
                                                                </Button>
                                                                <Button
                                                                    variant={(resultsViewMode[t.id] || 'final') === 'rounds' ? 'default' : 'ghost'}
                                                                    size="sm"
                                                                    onClick={() => setResultsViewMode(prev => ({ ...prev, [t.id]: 'rounds' }))}
                                                                >
                                                                    <BarChart3 className="h-3 w-3 mr-1" />
                                                                    Round Results
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Final Standings View */}
                                                        {(resultsViewMode[t.id] || 'final') === 'final' && (
                                                            <div className="space-y-4">
                                                                {finalStandings[t.id] ? (
                                                                    <>
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <h3 className="text-lg font-semibold">Final Standings - {t.name}</h3>
                                                                                <p className="text-sm text-gray-600">Tournament completed with {finalStandings[t.id].length} participants</p>
                                                                            </div>
                                                                            <Button variant="outline" size="sm" onClick={() => fetchFinalStandings(t.id)} disabled={loadingFinalStandings}>
                                                                                {loadingFinalStandings ? 'Refreshing...' : '🔄 Refresh'}
                                                                            </Button>
                                                                        </div>
                                                                        
                                                                        <div className="border rounded-lg overflow-hidden">
                                                                            <Table>
                                                                                <TableHeader>
                                                                                    <TableRow className="bg-gray-50 dark:bg-gray-800">
                                                                                        <TableHead className="font-semibold">Rank</TableHead>
                                                                                        <TableHead className="font-semibold">Player</TableHead>
                                                                                        <TableHead className="font-semibold">Rating</TableHead>
                                                                                        <TableHead className="font-semibold">Points</TableHead>
                                                                                        <TableHead className="font-semibold">Games</TableHead>
                                                                                        <TableHead className="font-semibold">W-D-L</TableHead>
                                                                                        <TableHead className="font-semibold">Tiebreaks</TableHead>
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {finalStandings[t.id].map((player, index) => (
                                                                                        <TableRow 
                                                                                            key={player.player_id} 
                                                                                            className={`${index < 3 ? (index === 0 ? 'bg-yellow-50 hover:bg-yellow-100' : index === 1 ? 'bg-gray-50 hover:bg-gray-100' : 'bg-orange-50 hover:bg-orange-100') : 'hover:bg-gray-50'} cursor-pointer`}
                                                                                            onClick={() => openPlayerDetails({
                                                                                                id: player.player_id,
                                                                                                name: player.player_name,
                                                                                                rating: player.player_rating,
                                                                                                title: player.player_title,
                                                                                                email: player.player_email,
                                                                                                phone: player.player_phone
                                                                                            })}
                                                                                        >
                                                                                            <TableCell className="font-semibold">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {index === 0 && <span className="text-yellow-600">🏆</span>}
                                                                                                    {index === 1 && <span className="text-gray-600">🥈</span>}
                                                                                                    {index === 2 && <span className="text-orange-600">🥉</span>}
                                                                                                    {player.rank}
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div>
                                                                                                        <div className="font-medium text-blue-600 hover:text-blue-800">
                                                                                                            {player.player_title && (
                                                                                                                <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded mr-1">
                                                                                                                    {player.player_title}
                                                                                                                </span>
                                                                                                            )}
                                                                                                            {player.player_name}
                                                                                                        </div>
                                                                                                        <div className="text-xs text-gray-500">Click for details</div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell className="text-gray-600">{player.player_rating || 'Unrated'}</TableCell>
                                                                                            <TableCell className="font-semibold text-lg">{player.points}</TableCell>
                                                                                            <TableCell>{player.total_games}</TableCell>
                                                                                            <TableCell>
                                                                                                <span className="text-green-600">{player.wins}</span>-
                                                                                                <span className="text-yellow-600">{player.draws}</span>-
                                                                                                <span className="text-red-600">{player.losses}</span>
                                                                                                {player.byes > 0 && (
                                                                                                    <span className="text-blue-600"> (+{player.byes}B)</span>
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-gray-600">
                                                                                                <div className="text-sm">
                                                                                                    <div>B: {player.buchholz.toFixed(1)}</div>
                                                                                                    <div className="text-xs text-gray-500">S-B: {player.sonnebornBerger.toFixed(1)}</div>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    ))}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </div>
                                                                        
                                                                        <div className="text-xs text-gray-500 space-y-1">
                                                                            <p><strong>Tiebreaking System:</strong> 1) Points 2) Head-to-head result 3) Buchholz (B) 4) Sonneborn-Berger (S-B) 5) Wins 6) Games played 7) Rating</p>
                                                                            <p>• <strong>Buchholz:</strong> Sum of all opponents' final scores • <strong>Sonneborn-Berger:</strong> Sum of defeated opponents' scores + half of drawn opponents' scores</p>
                                                                            <p>• Click on any player name to view detailed statistics • B = Bye games</p>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="text-center py-8 text-gray-500">
                                                                        <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Final Standings Yet</h3>
                                                                        <p>Final standings will be calculated automatically.</p>
                                                                        <Button 
                                                                            className="mt-3" 
                                                                            onClick={() => fetchFinalStandings(t.id)} 
                                                                            disabled={loadingFinalStandings}
                                                                        >
                                                                            <Trophy className="h-3 w-3 mr-1" />
                                                                            {loadingFinalStandings ? 'Loading...' : 'Calculate Final Standings'}
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Round Results View */}
                                                        {(resultsViewMode[t.id] || 'final') === 'rounds' && (
                                                            <div className="space-y-4">
                                                                <div className="flex flex-wrap gap-2 mb-4">
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
                                                                            <div key={`res-${t.id}-${rKey}`} className="border rounded-lg p-4">
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <div className="font-medium text-lg">Round {data.round} Standings</div>
                                                                                    <div className="text-sm text-gray-500">Tournament: {data.tournament_name}</div>
                                                                                </div>
                                                                                <div className="border rounded-lg overflow-hidden">
                                                                                    <Table>
                                                                                        <TableHeader>
                                                                                            <TableRow className="bg-gray-50">
                                                                                                <TableHead>Rank</TableHead>
                                                                                                <TableHead>Player</TableHead>
                                                                                                <TableHead>Rating</TableHead>
                                                                                                <TableHead>Points</TableHead>
                                                                                                <TableHead>W-D-L</TableHead>
                                                                                            </TableRow>
                                                                                        </TableHeader>
                                                                                        <TableBody>
                                                                                            {data.standings.map((s) => (
                                                                                                <TableRow 
                                                                                                    key={`${s.player_id}-${data.round}`}
                                                                                                    className="hover:bg-gray-50 cursor-pointer"
                                                                                                    onClick={() => openPlayerDetails({
                                                                                                        id: s.player_id,
                                                                                                        name: s.player_name,
                                                                                                        rating: s.player_rating
                                                                                                    })}
                                                                                                >
                                                                                                    <TableCell className="font-semibold">{s.rank}</TableCell>
                                                                                                    <TableCell className="text-blue-600 hover:text-blue-800 font-medium">{s.player_name}</TableCell>
                                                                                                    <TableCell>{s.player_rating}</TableCell>
                                                                                                    <TableCell className="font-semibold">{s.points}</TableCell>
                                                                                                    <TableCell>
                                                                                                        <span className="text-green-600">{s.wins}</span>-
                                                                                                        <span className="text-yellow-600">{s.draws}</span>-
                                                                                                        <span className="text-red-600">{s.losses}</span>
                                                                                                    </TableCell>
                                                                                                </TableRow>
                                                                                            ))}
                                                                                        </TableBody>
                                                                                    </Table>
                                                                                </div>
                                                                                <div className="text-xs text-gray-600 mt-2">
                                                                                    Completed games in round {data.round}: {data.round_summary.completed_games} / {data.round_summary.total_games}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="text-center py-8 text-gray-500">
                                                                        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Round Results Yet</h3>
                                                                        <p>Click on a round button above to load standings for that round.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <div className="text-gray-500 py-4">Select a tournament to view results.</div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>
                        {tournaments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No tournaments found.</div>
                        )}
                    </CardContent>
                </Card>
            )}

                </div>
            </div>

            {/* Dialogs */}
            {renderTournamentDialog()}
            {renderPlayerDialog()}
            {renderAddPlayersDialog()}
            {renderPlayerDetailsDialog()}
            {/* Mobile drawer */}
            {mobileNavOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
                    <div className="absolute left-0 top-0 h-full w-80 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-slate-200/50 dark:border-gray-700/50 shadow-2xl p-6">
                        {/* Mobile Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/50 dark:border-gray-700/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30 ring-2 ring-white/20 dark:ring-gray-800/20">
                                    <Crown className="h-5 w-5 text-white drop-shadow-sm" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-gray-100 tracking-tight">Admin Panel</div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Online</span>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Mobile Navigation */}
                        <nav className="space-y-2">
                            <button 
                                onClick={() => { setActiveTab('tournaments'); setMobileNavOpen(false); }} 
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'tournaments'
                                        ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/30 shadow-lg'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    activeTab === 'tournaments'
                                        ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                                        : 'bg-slate-200/80 text-slate-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    <Trophy className="h-4 w-4" />
                                </div>
                                <div className="flex-1 flex items-center justify-between">
                                    <span>Tournaments</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        activeTab === 'tournaments'
                                            ? 'bg-amber-200/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                            : 'bg-slate-200/80 text-slate-500 dark:bg-gray-700/50 dark:text-gray-400'
                                    }`}>
                                        {tournaments.length}
                                    </span>
                                </div>
                            </button>

                            <button 
                                onClick={() => { setActiveTab('players'); setMobileNavOpen(false); }} 
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'players'
                                        ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/30 shadow-lg'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    activeTab === 'players'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                                        : 'bg-slate-200/80 text-slate-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    <Users className="h-4 w-4" />
                                </div>
                                <div className="flex-1 flex items-center justify-between">
                                    <span>Players</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        activeTab === 'players'
                                            ? 'bg-blue-200/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'bg-slate-200/80 text-slate-500 dark:bg-gray-700/50 dark:text-gray-400'
                                    }`}>
                                        {players.length}
                                    </span>
                                </div>
                            </button>

                            <button 
                                onClick={() => { setActiveTab('requests'); setMobileNavOpen(false); }} 
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'requests'
                                        ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/30 shadow-lg'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative ${
                                    activeTab === 'requests'
                                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                                        : 'bg-slate-200/80 text-slate-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    <Clock className="h-4 w-4" />
                                    {requests.filter(r => r.status === 'pending').length > 0 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></div>
                                    )}
                                </div>
                                <div className="flex-1 flex items-center justify-between">
                                    <span>Requests</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        requests.filter(r => r.status === 'pending').length > 0
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse'
                                            : activeTab === 'requests'
                                                ? 'bg-purple-200/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                : 'bg-slate-200/80 text-slate-500 dark:bg-gray-700/50 dark:text-gray-400'
                                    }`}>
                                        {requests.filter(r => r.status === 'pending').length}
                                    </span>
                                </div>
                            </button>

                            <button 
                                onClick={() => { setActiveTab('pairings'); setMobileNavOpen(false); }} 
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'pairings'
                                        ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-500/30 shadow-lg'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    activeTab === 'pairings'
                                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                                        : 'bg-slate-200/80 text-slate-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    <Target className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <span>Pairings</span>
                                </div>
                            </button>

                            <button 
                                onClick={() => { setActiveTab('results'); setMobileNavOpen(false); }} 
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'results'
                                        ? 'bg-gradient-to-r from-rose-500/10 to-pink-500/10 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/30 shadow-lg'
                                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/80'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    activeTab === 'results'
                                        ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white'
                                        : 'bg-slate-200/80 text-slate-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    <BarChart3 className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <span>Results</span>
                                </div>
                            </button>
                        </nav>

                        {/* Mobile Footer */}
                        <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-gray-700/50">
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-gray-500">
                                <Gamepad2 className="h-3 w-3" />
                                <span>Chess Results Admin</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;

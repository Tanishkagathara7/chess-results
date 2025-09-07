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
import { Trophy, Users, Plus, Edit, Trash2, Calendar, MapPin, AlertCircle, Shuffle, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateTournamentForm, formatDateError } from '../utils/validation';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
    const navigate = useNavigate();
    // State management
    const [activeTab, setActiveTab] = useState('tournaments');
    const [tournaments, setTournaments] = useState([]);
    const [players, setPlayers] = useState([]);
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
        elimination_per_round: '0',
        tournament_type: 'swiss',
        use_round_specific: false,
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
    
    // Pairings state
    const [pairings, setPairings] = useState([]);
    const [currentRound, setCurrentRound] = useState(1);
    const [selectedTournamentForPairing, setSelectedTournamentForPairing] = useState(null);
    const [pairingTournaments, setPairingTournaments] = useState([]);
    const [roundPairings, setRoundPairings] = useState([]);
    const [isGeneratingPairings, setIsGeneratingPairings] = useState(false);
    
    // Results state
    const [selectedTournamentForResults, setSelectedTournamentForResults] = useState(null);
    const [resultsTournaments, setResultsTournaments] = useState([]);
    const [tournamentResults, setTournamentResults] = useState([]);
    const [filteredResults, setFilteredResults] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerResults, setPlayerResults] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch data
    useEffect(() => {
        fetchAllData();
    }, []);
    
    // Note: Results are fetched manually or via refresh button to avoid loops

    const fetchAllData = async () => {
        try {
            const [tournamentsRes, playersRes] = await Promise.all([
                axios.get(`${API}/tournaments`),
                axios.get(`${API}/players`)
            ]);
            setTournaments(tournamentsRes.data);
            setPlayers(playersRes.data);
        } catch (error) {
            setError('Failed to fetch data');
            console.error('Error fetching data:', error);
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
            
            // Handle elimination logic
            if (tournamentForm.use_round_specific) {
                // Use round-specific eliminations, remove the general elimination field
                delete tournamentData.elimination_per_round;
                tournamentData.round_eliminations = tournamentForm.round_eliminations.map(re => ({
                    round: parseInt(re.round),
                    eliminations: parseInt(re.eliminations)
                }));
            } else {
                // Use general elimination per round
                tournamentData.elimination_per_round = parseInt(tournamentForm.elimination_per_round) || 0;
                delete tournamentData.round_eliminations;
            }
            
            // Remove UI-only fields
            delete tournamentData.use_round_specific;

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
            elimination_per_round: (tournament.elimination_per_round || 0).toString(),
            tournament_type: tournament.tournament_type || 'swiss',
            use_round_specific: Boolean(tournament.round_eliminations && tournament.round_eliminations.length > 0),
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
            elimination_per_round: '0',
            tournament_type: 'swiss',
            use_round_specific: false,
            round_eliminations: []
        });
        setEditingId(null);
        setValidationErrors({});
    };

    // Real-time validation for tournament form
    const handleTournamentFormChange = (field, value) => {
        const newForm = { ...tournamentForm, [field]: value };
        
        // If rounds changed, update round eliminations array
        if (field === 'rounds' && value && newForm.use_round_specific) {
            const numRounds = parseInt(value);
            const currentEliminations = newForm.round_eliminations || [];
            const newEliminations = [];
            
            for (let i = 1; i <= numRounds; i++) {
                const existing = currentEliminations.find(re => re.round === i);
                newEliminations.push({
                    round: i,
                    eliminations: existing ? existing.eliminations : 0
                });
            }
            newForm.round_eliminations = newEliminations;
        }
        
        setTournamentForm(newForm);
        
        // Re-validate on change to provide real-time feedback
        const validation = validateTournamentForm(newForm);
        setValidationErrors(validation.errors);
    };
    
    // Helper functions for round-specific eliminations
    const handleRoundEliminationChange = (roundNumber, eliminations) => {
        const newEliminations = tournamentForm.round_eliminations.map(re => 
            re.round === roundNumber ? { ...re, eliminations: parseInt(eliminations) || 0 } : re
        );
        setTournamentForm({ ...tournamentForm, round_eliminations: newEliminations });
    };
    
    const toggleRoundSpecific = (useRoundSpecific) => {
        const newForm = { ...tournamentForm, use_round_specific: useRoundSpecific };
        
        if (useRoundSpecific && tournamentForm.rounds) {
            // Initialize round eliminations based on current rounds
            const numRounds = parseInt(tournamentForm.rounds);
            const eliminations = [];
            for (let i = 1; i <= numRounds; i++) {
                eliminations.push({ round: i, eliminations: 0 });
            }
            newForm.round_eliminations = eliminations;
        }
        
        setTournamentForm(newForm);
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
            const promises = selectedPlayers.map(playerId => {
                console.log('📤 Adding player:', playerId);
                return axios.post(`${API}/tournaments/${selectedTournament.id}/participants`, { player_id: playerId });
            });
            
            const results = await Promise.all(promises);
            console.log('✅ Add players results:', results.map(r => r.data));
            
            showMessage(`${selectedPlayers.length} player(s) added to tournament successfully`);
            
            // Refresh participants list
            await fetchTournamentParticipants(selectedTournament.id);
            
            setIsAddPlayersDialogOpen(false);
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
            console.log('📤 Adding player:', playerId);
            const response = await axios.post(`${API}/tournaments/${selectedTournament.id}/participants`, { player_id: playerId });
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
        if (!window.confirm('Are you sure you want to remove this player from the tournament?')) return;
        
        try {
            await axios.delete(`${API}/tournaments/${tournamentId}/participants/${playerId}`);
            showMessage('Player removed from tournament successfully');
            
            // Refresh participants list
            await fetchTournamentParticipants(tournamentId);
        } catch (error) {
            showMessage('Failed to remove player from tournament', true);
        }
    };
    
    const handleEliminatePlayer = async (tournamentId, playerId) => {
        if (!window.confirm('Are you sure you want to eliminate this player? They will not be paired in future rounds.')) return;
        
        try {
            await axios.put(`${API}/tournaments/${tournamentId}/participants/${playerId}`, {
                status: 'eliminated'
            });
            showMessage('Player eliminated from tournament');
            
            // Refresh participants list
            await fetchTournamentParticipants(tournamentId);
        } catch (error) {
            showMessage('Failed to eliminate player', true);
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
    const fetchTournamentsForPairing = async () => {
        try {
            const response = await axios.get(`${API}/tournaments`);
            setPairingTournaments(response.data);
        } catch (error) {
            console.error('Error fetching tournaments for pairing:', error);
            showMessage('Failed to fetch tournaments', true);
        }
    };

    const fetchRoundPairings = async (tournamentId, round) => {
        try {
            const response = await axios.get(`${API}/tournaments/${tournamentId}/pairings/${round}`);
            setRoundPairings(response.data);
        } catch (error) {
            if (error.response?.status === 404) {
                setRoundPairings([]);
            } else {
                console.error('Error fetching round pairings:', error);
                showMessage('Failed to fetch round pairings', true);
            }
        }
    };

    const generateSimplePairings = (participants) => {
        // Simple Swiss-style pairing algorithm
        const shuffled = [...participants].sort((a, b) => {
            // Sort by score (if available) then by rating
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return (b.player.rating || 0) - (a.player.rating || 0);
        });

        const pairings = [];
        const paired = new Set();

        for (let i = 0; i < shuffled.length; i++) {
            if (paired.has(shuffled[i].id)) continue;

            let opponent = null;
            for (let j = i + 1; j < shuffled.length; j++) {
                if (!paired.has(shuffled[j].id)) {
                    opponent = shuffled[j];
                    break;
                }
            }

            if (opponent) {
                pairings.push({
                    white_player_id: shuffled[i].player_id,
                    black_player_id: opponent.player_id,
                    result: null
                });
                paired.add(shuffled[i].id);
                paired.add(opponent.id);
            } else {
                // Bye for odd number of players
                pairings.push({
                    white_player_id: shuffled[i].player_id,
                    black_player_id: null,
                    result: '1-0' // Bye = win for white
                });
                paired.add(shuffled[i].id);
            }
        }

        return pairings;
    };

    const handleGeneratePairings = async () => {
        if (!selectedTournamentForPairing) {
            showMessage('Please select a tournament first', true);
            return;
        }

        setIsGeneratingPairings(true);
        try {
            // Fetch current participants
            const participantsRes = await axios.get(`${API}/tournaments/${selectedTournamentForPairing.id}/participants`);
            const allParticipants = participantsRes.data;
            
            // Filter out eliminated players
            const activeParticipants = allParticipants.filter(p => p.status !== 'eliminated');

            if (activeParticipants.length < 2) {
                showMessage('At least 2 active players are required to generate pairings', true);
                return;
            }
            
            console.log(`💡 Total participants: ${allParticipants.length}, Active: ${activeParticipants.length}`);
            const participants = activeParticipants;

            // Generate pairings using our algorithm
            const generatedPairings = generateSimplePairings(participants);
            console.log('🎲 Generated pairings:', generatedPairings);

            // Save pairings to backend
            const pairingData = {
                tournament_id: selectedTournamentForPairing.id,
                round: currentRound,
                pairings: generatedPairings
            };
            console.log('📤 Sending pairing data:', pairingData);

            await axios.post(`${API}/tournaments/${selectedTournamentForPairing.id}/pairings`, pairingData);
            
            showMessage(`Pairings generated successfully for Round ${currentRound}`);
            
            // Refresh pairings display
            await fetchRoundPairings(selectedTournamentForPairing.id, currentRound);
            
        } catch (error) {
            console.error('Failed to generate pairings:', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
                config: error.config
            });
            const errorMessage = error.response?.data?.error || `Failed to generate pairings (${error.response?.status || 'Unknown error'})`;
            showMessage(errorMessage, true);
        } finally {
            setIsGeneratingPairings(false);
        }
    };

    const handleResultChange = async (pairingId, result) => {
        try {
            await axios.put(`${API}/pairings/${pairingId}`, { result });
            showMessage('Result updated successfully');
            
            // Refresh pairings display
            await fetchRoundPairings(selectedTournamentForPairing.id, currentRound);
            
        } catch (error) {
            console.error('Failed to update result:', error);
            showMessage('Failed to update result', true);
        }
    };
    
    const handleCompleteRound = async () => {
        if (!selectedTournamentForPairing || !currentRound) {
            showMessage('Please select a tournament and round first', true);
            return;
        }
        
        try {
            // Check if all games have results
            const incompleteGames = roundPairings.filter(pairing => 
                pairing.black_player && !pairing.result // Has opponent but no result
            );
            
            if (incompleteGames.length > 0) {
                showMessage(`Cannot complete round: ${incompleteGames.length} game(s) still pending results`, true);
                return;
            }
            
            // Mark round as complete
            await axios.post(`${API}/tournaments/${selectedTournamentForPairing.id}/rounds/${currentRound}/complete`);
            
            showMessage(`Round ${currentRound} completed successfully! Results have been updated.`);
            
            // Refresh the pairings display
            await fetchRoundPairings(selectedTournamentForPairing.id, currentRound);
            
            // Auto-refresh Results section if it's loaded
            if (selectedTournamentForResults && selectedTournamentForResults.id === selectedTournamentForPairing.id) {
                console.log('🔄 Auto-refreshing Results section after round completion');
                await fetchTournamentResults(selectedTournamentForResults.id);
            }
            
        } catch (error) {
            console.error('Failed to complete round:', error);
            showMessage(error.response?.data?.error || 'Failed to complete round', true);
        }
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
    
    // Results functions
    const fetchTournamentsForResults = async () => {
        try {
            const response = await axios.get(`${API}/tournaments`);
            setResultsTournaments(response.data);
        } catch (error) {
            showMessage('Failed to fetch tournaments for results', true);
            console.error('Error fetching tournaments for results:', error);
        }
    };
    
    const fetchTournamentResults = async (tournamentId) => {
        if (!tournamentId) return;
        
        setLoadingResults(true);
        try {
            console.log('🔄 Fetching tournament results for:', tournamentId);
            const [participantsRes, pairingsRes] = await Promise.all([
                axios.get(`${API}/tournaments/${tournamentId}/participants`),
                axios.get(`${API}/tournaments/${tournamentId}/pairings/all`).catch(error => {
                    console.error('❌ Error fetching pairings:', error);
                    return { data: [] };
                })
            ]);
            
            const participants = participantsRes.data;
            const allPairings = pairingsRes.data;
            
            console.log('👥 Participants found:', participants.length);
            console.log('🎯 Pairings found:', allPairings.length);
            console.log('📋 Sample pairing data:', allPairings.slice(0, 1));
            
            // Debug participant structure
            if (participants.length > 0) {
                console.log('📋 Participant structure:', {
                    player_id: participants[0].player_id,
                    player_name: participants[0].player?.name,
                    full_participant: participants[0]
                });
            }
            
            // Debug pairing structure  
            if (allPairings.length > 0) {
                console.log('📋 Pairing structure:', {
                    white_player_id: allPairings[0].white_player_id,
                    black_player_id: allPairings[0].black_player_id,
                    result: allPairings[0].result,
                    round: allPairings[0].round,
                    full_pairing: allPairings[0]
                });
            }
            
            // Calculate results for each player
            const results = participants.map((participant, index) => {
                console.log(`\n👤 Processing player ${index + 1}/${participants.length}:`, participant.player.name, `(ID: ${participant.player_id})`);
                
                const playerPairings = allPairings.filter(p => {
                    const isWhitePlayer = p.white_player_id === participant.player_id;
                    const isBlackPlayer = p.black_player_id === participant.player_id;
                    const isPlayerInPairing = isWhitePlayer || isBlackPlayer;
                    
                    if (index === 0) { // Only log for first player to avoid spam
                        console.log(`\t�\udfd5 Checking pairing: white=${p.white_player_id}, black=${p.black_player_id}, participant=${participant.player_id}, match=${isPlayerInPairing}`);
                    }
                    
                    return isPlayerInPairing;
                });
                
                console.log(`\ud83c\udfaf Found ${playerPairings.length} pairings for ${participant.player.name}`);
                if (playerPairings.length > 0) {
                    console.log('\ud83d\udcdd Sample pairing:', {
                        round: playerPairings[0].round,
                        white: playerPairings[0].white_player?.name,
                        black: playerPairings[0].black_player?.name,
                        result: playerPairings[0].result
                    });
                }
                
                let points = 0;
                let gamesPlayed = 0;
                const roundResults = [];
                
                // Group pairings by round
                const rounds = {};
                playerPairings.forEach(pairing => {
                    if (!rounds[pairing.round]) {
                        rounds[pairing.round] = [];
                    }
                    rounds[pairing.round].push(pairing);
                });
                
                // Calculate points for each round
                for (let round = 1; round <= (selectedTournamentForResults?.rounds || 1); round++) {
                    const roundPairings = rounds[round] || [];
                    console.log(`\t�\udfb2 Round ${round}: ${roundPairings.length} pairings found`);
                    
                    let roundPoints = 0;
                    let opponent = null;
                    let result = '-';
                    let color = '';
                    
                    if (roundPairings.length > 0) {
                        const pairing = roundPairings[0];
                        const isWhite = pairing.white_player_id === participant.player_id;
                        
                        color = isWhite ? 'White' : 'Black';
                        opponent = isWhite ? pairing.black_player : pairing.white_player;
                        
                        if (pairing.result) {
                            gamesPlayed++;
                            console.log(`\t\t�\udfb9 Game result: ${pairing.result}, Player is ${isWhite ? 'White' : 'Black'}`);
                            
                            if (pairing.result === '1/2-1/2') {
                                roundPoints = 0.5;
                                result = '½';
                            } else if (
                                (isWhite && pairing.result === '1-0') ||
                                (!isWhite && pairing.result === '0-1')
                            ) {
                                roundPoints = 1;
                                result = '1';
                            } else {
                                roundPoints = 0;
                                result = '0';
                            }
                            points += roundPoints;
                            console.log(`\t\t�\udfaf Round points: ${roundPoints}, Total points: ${points}`);
                            
                        } else if (!opponent) {
                            // Bye
                            roundPoints = 1;
                            points += roundPoints;
                            result = '1';
                            opponent = { name: 'BYE' };
                            gamesPlayed++;
                        }
                    }
                    
                    roundResults.push({
                        round,
                        opponent: opponent?.name || '-',
                        color,
                        result,
                        points: roundPoints
                    });
                }
                
                const playerResult = {
                    ...participant,
                    totalPoints: points,
                    gamesPlayed,
                    roundResults,
                    percentage: gamesPlayed > 0 ? (points / gamesPlayed * 100).toFixed(1) : '0.0'
                };
                
                console.log(`\t�\udfc6 Final result for ${participant.player.name}: ${points} points from ${gamesPlayed} games (${playerResult.percentage}%)`);
                return playerResult;
            });
            
            // Sort by points (descending), then by rating (descending)
            results.sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) {
                    return b.totalPoints - a.totalPoints;
                }
                return (b.player?.rating || 0) - (a.player?.rating || 0);
            });
            
            console.log('�\udfc6 Final calculation complete:');
            console.log('	- Total players processed:', results.length);
            console.log('	- Players with points:', results.filter(r => r.totalPoints > 0).length);
            console.log('	- Players with games:', results.filter(r => r.gamesPlayed > 0).length);
            
            if (results.length > 0 && results.every(r => r.totalPoints === 0)) {
                console.warn('⚠️ WARNING: All players have 0 points - possible data issue!');
                console.log('	- Check if participant player_id matches pairing player IDs');
                console.log('	- Check if pairings have result field populated');
            }
            
            setTournamentResults(results);
            setFilteredResults(results);
        } catch (error) {
            showMessage('Failed to fetch tournament results', true);
            console.error('Error fetching tournament results:', error);
        } finally {
            setLoadingResults(false);
        }
    };
    
    const handlePlayerResultsClick = (player) => {
        setSelectedPlayer(player);
        const playerResultsData = tournamentResults.find(r => r.player_id === player.player_id);
        setPlayerResults(playerResultsData ? [playerResultsData] : []);
    };
    
    const handleSearchChange = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setFilteredResults(tournamentResults);
        } else {
            const filtered = tournamentResults.filter(result => 
                result.player.name.toLowerCase().includes(query.toLowerCase()) ||
                (result.player.title && result.player.title.toLowerCase().includes(query.toLowerCase()))
            );
            setFilteredResults(filtered);
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="tournament_type">Tournament Type</Label>
                            <Select 
                                value={tournamentForm.tournament_type} 
                                onValueChange={(value) => handleTournamentFormChange('tournament_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="swiss">Swiss System</SelectItem>
                                    <SelectItem value="knockout">Knockout</SelectItem>
                                    <SelectItem value="round_robin">Round Robin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="use_round_specific"
                                    checked={tournamentForm.use_round_specific}
                                    onChange={(e) => toggleRoundSpecific(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <Label htmlFor="use_round_specific" className="text-sm font-medium">
                                    Use round-specific eliminations
                                </Label>
                            </div>
                            
                            {!tournamentForm.use_round_specific ? (
                                <div>
                                    <Label htmlFor="elimination_per_round">Players Eliminated Per Round</Label>
                                    <Input
                                        id="elimination_per_round"
                                        type="number"
                                        min="0"
                                        value={tournamentForm.elimination_per_round}
                                        onChange={(e) => handleTournamentFormChange('elimination_per_round', e.target.value)}
                                        placeholder="0 = No elimination"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Set to 0 for no elimination. Same for all rounds.</p>
                                </div>
                            ) : (
                                <div>
                                    <Label>Eliminations by Round</Label>
                                    {tournamentForm.rounds && parseInt(tournamentForm.rounds) > 0 ? (
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                                            {tournamentForm.round_eliminations.map((roundElim, index) => (
                                                <div key={roundElim.round} className="flex items-center space-x-2">
                                                    <Label className="text-xs min-w-0">R{roundElim.round}:</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={roundElim.eliminations}
                                                        onChange={(e) => handleRoundEliminationChange(roundElim.round, e.target.value)}
                                                        className="h-8 text-xs"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">Set the number of rounds first to configure eliminations</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">Set eliminations for each round individually.</p>
                                </div>
                            )}
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
                                                        disabled={loading}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        {loading ? 'Adding...' : 'Add'}
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
                                        {tournamentParticipants.map((participant) => (
                                                    <TableRow key={participant.id} className={participant.status === 'eliminated' ? 'bg-red-50' : ''}>
                                                        <TableCell className="font-medium">
                                                            {participant.player.name}
                                                            {participant.status === 'eliminated' && (
                                                                <Badge variant="destructive" className="ml-2 text-xs">Eliminated</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{participant.player.rating}</TableCell>
                                                        <TableCell>
                                                            <div className="flex space-x-1">
                                                                {participant.status !== 'eliminated' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleEliminatePlayer(selectedTournament.id, participant.player_id)}
                                                                        className="text-yellow-600 hover:text-yellow-700"
                                                                        title="Eliminate Player"
                                                                    >
                                                                        ⚠️
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleRemoveParticipant(selectedTournament.id, participant.player_id)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                    title="Remove Player"
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>
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
                        onClick={() => {
                            setActiveTab('pairings');
                            if (pairingTournaments.length === 0) {
                                fetchTournamentsForPairing();
                            }
                        }}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'pairings'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Shuffle className="h-4 w-4 inline mr-2" />
                        Pairings
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('results');
                            if (resultsTournaments.length === 0) {
                                fetchTournamentsForResults();
                            }
                        }}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'results'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Trophy className="h-4 w-4 inline mr-2" />
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
                                    <TableHead>Elimination</TableHead>
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
                                        <TableCell>
                                            {tournament.round_eliminations && tournament.round_eliminations.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="destructive" className="text-xs">
                                                        Round-specific
                                                    </Badge>
                                                    {tournament.round_eliminations.some(re => re.eliminations > 0) && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {tournament.round_eliminations.filter(re => re.eliminations > 0).length} rounds
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : tournament.elimination_per_round > 0 ? (
                                                <Badge variant="destructive">
                                                    -{tournament.elimination_per_round}/round
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">No elimination</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{tournament.time_control}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                0 players
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
                                                {tournament.registration?.enabled && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate(`/tournaments/${tournament.id}/registrations`)}
                                                        className="text-green-600 hover:text-green-700"
                                                        title="Manage Registrations"
                                                    >
                                                        <Settings className="h-3 w-3" />
                                                    </Button>
                                                )}
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

            {activeTab === 'pairings' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Tournament Pairings</CardTitle>
                        <div className="flex items-center space-x-4">
                            {selectedTournamentForPairing && (
                                <div className="flex items-center space-x-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (currentRound > 1) {
                                                const newRound = currentRound - 1;
                                                setCurrentRound(newRound);
                                                fetchRoundPairings(selectedTournamentForPairing.id, newRound);
                                            }
                                        }}
                                        disabled={currentRound <= 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium">Round {currentRound}</span>
                                        {selectedTournamentForPairing.completed_rounds?.includes(currentRound) && (
                                            <Badge className="bg-green-100 text-green-800 text-xs">
                                                ✓ Completed
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (currentRound < (selectedTournamentForPairing?.rounds || 1)) {
                                                const newRound = currentRound + 1;
                                                setCurrentRound(newRound);
                                                fetchRoundPairings(selectedTournamentForPairing.id, newRound);
                                            }
                                        }}
                                        disabled={currentRound >= (selectedTournamentForPairing?.rounds || 1)}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                            <div className="flex space-x-2">
                                <Button
                                    onClick={handleGeneratePairings}
                                    disabled={!selectedTournamentForPairing || isGeneratingPairings}
                                >
                                    <Shuffle className="h-4 w-4 mr-2" />
                                    {isGeneratingPairings ? 'Generating...' : 'Generate Pairings'}
                                </Button>
                                {roundPairings.length > 0 && (() => {
                                    const isRoundCompleted = selectedTournamentForPairing?.completed_rounds?.includes(currentRound);
                                    const incompleteGames = roundPairings.filter(pairing => 
                                        pairing.black_player && !pairing.result
                                    ).length;
                                    
                                    if (isRoundCompleted) {
                                        return (
                                            <Button
                                                disabled
                                                className="bg-green-600 text-white opacity-75 cursor-not-allowed"
                                            >
                                                <Trophy className="h-4 w-4 mr-2" />
                                                Round {currentRound} Completed ✓
                                            </Button>
                                        );
                                    }
                                    
                                    return (
                                        <Button
                                            onClick={handleCompleteRound}
                                            disabled={!selectedTournamentForPairing || incompleteGames > 0}
                                            className={incompleteGames > 0 
                                                ? "bg-gray-400 text-white cursor-not-allowed" 
                                                : "bg-green-600 hover:bg-green-700 text-white"
                                            }
                                            title={incompleteGames > 0 
                                                ? `${incompleteGames} game(s) need results before completing round` 
                                                : `Complete Round ${currentRound}`
                                            }
                                        >
                                            <Trophy className="h-4 w-4 mr-2" />
                                            {incompleteGames > 0 
                                                ? `${incompleteGames} game(s) pending` 
                                                : `Complete Round ${currentRound}`
                                            }
                                        </Button>
                                    );
                                })()}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Tournament Selection */}
                        <div className="mb-6">
                            <Label htmlFor="tournament-select">Select Tournament</Label>
                            <Select
                                value={selectedTournamentForPairing?.id?.toString() || ''}
                                onValueChange={(value) => {
                                    const tournament = pairingTournaments.find(t => t.id.toString() === value);
                                    setSelectedTournamentForPairing(tournament);
                                    setCurrentRound(1);
                                    if (tournament) {
                                        fetchRoundPairings(tournament.id, 1);
                                    } else {
                                        setRoundPairings([]);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full max-w-md">
                                    <SelectValue placeholder="Select a tournament" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pairingTournaments.map((tournament) => (
                                        <SelectItem key={tournament.id} value={tournament.id.toString()}>
                                            {tournament.name} ({tournament.location})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Round Overview */}
                        {selectedTournamentForPairing && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="text-sm font-medium mb-3">Tournament Progress</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {Array.from({ length: selectedTournamentForPairing.rounds }, (_, i) => i + 1).map(roundNum => {
                                        const isCompleted = selectedTournamentForPairing.completed_rounds?.includes(roundNum);
                                        const isCurrent = roundNum === currentRound;
                                        return (
                                            <div
                                                key={roundNum}
                                                className={`p-2 rounded text-center text-sm cursor-pointer transition-colors ${
                                                    isCurrent 
                                                        ? 'bg-blue-500 text-white' 
                                                        : isCompleted 
                                                        ? 'bg-green-500 text-white' 
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                                onClick={() => {
                                                    setCurrentRound(roundNum);
                                                    fetchRoundPairings(selectedTournamentForPairing.id, roundNum);
                                                }}
                                            >
                                                <div>R{roundNum}</div>
                                                <div className="text-xs">
                                                    {isCompleted ? '✓' : isCurrent ? '●' : '○'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
                                    <div className="flex space-x-4">
                                        <span><span className="inline-block w-2 h-2 bg-green-500 rounded mr-1"></span>Completed</span>
                                        <span><span className="inline-block w-2 h-2 bg-blue-500 rounded mr-1"></span>Current</span>
                                        <span><span className="inline-block w-2 h-2 bg-gray-300 rounded mr-1"></span>Upcoming</span>
                                    </div>
                                    <span>
                                        {selectedTournamentForPairing.completed_rounds?.length || 0} of {selectedTournamentForPairing.rounds} rounds completed
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        {/* Pairings Display */}
                        {selectedTournamentForPairing && (
                            <div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold">
                                        {selectedTournamentForPairing.name} - Round {currentRound}
                                    </h3>
                                    <p className="text-gray-600">
                                        {selectedTournamentForPairing.location} • {selectedTournamentForPairing.time_control}
                                    </p>
                                </div>

                                {roundPairings.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Elimination Management */}
                                        {(() => {
                                            const currentRoundElimination = selectedTournamentForPairing.round_eliminations?.find(re => re.round === currentRound);
                                            const eliminationCount = currentRoundElimination ? currentRoundElimination.eliminations : 
                                                                    selectedTournamentForPairing.elimination_per_round || 0;
                                            
                                            return eliminationCount > 0 && (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                                                        🏆 Elimination Round {currentRound} - {eliminationCount} players to be eliminated
                                                    </h4>
                                                    <p className="text-xs text-yellow-600">
                                                        After this round, mark the bottom {eliminationCount} players as eliminated in the participant management section.
                                                        {selectedTournamentForPairing.round_eliminations && (
                                                            <span className="block mt-1">
                                                                Round-specific elimination: {eliminationCount} players this round.
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                        
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">Board</TableHead>
                                                    <TableHead>White</TableHead>
                                                    <TableHead>Black</TableHead>
                                                    <TableHead>Result</TableHead>
                                                    <TableHead className="w-32">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {roundPairings.map((pairing, index) => (
                                                    <TableRow key={pairing.id || index}>
                                                        <TableCell className="font-mono">{index + 1}</TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center">
                                                                <div className="w-3 h-3 bg-white border border-gray-400 rounded-sm mr-2"></div>
                                                                {pairing.white_player?.name || 'Unknown'}
                                                                {pairing.white_player?.rating && (
                                                                    <span className="text-sm text-gray-500 ml-1">({pairing.white_player.rating})</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {pairing.black_player ? (
                                                                <div className="flex items-center">
                                                                    <div className="w-3 h-3 bg-black rounded-sm mr-2"></div>
                                                                    {pairing.black_player.name}
                                                                    {pairing.black_player.rating && (
                                                                        <span className="text-sm text-gray-500 ml-1">({pairing.black_player.rating})</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Badge variant="secondary">Bye</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {pairing.result ? (
                                                                <Badge 
                                                                    variant={pairing.result === '1/2-1/2' ? 'secondary' : 'default'}
                                                                    className={`font-mono ${
                                                                        pairing.result === '1-0' ? 'bg-green-100 text-green-800' :
                                                                        pairing.result === '0-1' ? 'bg-red-100 text-red-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                    }`}
                                                                >
                                                                    {pairing.result}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline">Pending</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {!pairing.black_player ? (
                                                                <span className="text-sm text-gray-500">Auto 1-0</span>
                                                            ) : (
                                                                <Select
                                                                    value={pairing.result || ''}
                                                                    onValueChange={(value) => handleResultChange(pairing.id, value)}
                                                                >
                                                                    <SelectTrigger className="w-24 h-8">
                                                                        <SelectValue placeholder="Result" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="1-0">1-0</SelectItem>
                                                                        <SelectItem value="1/2-1/2">1/2-1/2</SelectItem>
                                                                        <SelectItem value="0-1">0-1</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <Shuffle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600 mb-4">No pairings generated for Round {currentRound}</p>
                                        <Button
                                            onClick={handleGeneratePairings}
                                            disabled={isGeneratingPairings}
                                        >
                                            <Shuffle className="h-4 w-4 mr-2" />
                                            {isGeneratingPairings ? 'Generating...' : 'Generate Pairings'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {!selectedTournamentForPairing && (
                            <div className="text-center py-12 text-gray-500">
                                <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                Select a tournament to manage pairings
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
            
            {/* Results Section */}
            {activeTab === 'results' && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Tournament Results & Standings</CardTitle>
                        {selectedTournamentForResults && (
                            <Button
                                onClick={() => fetchTournamentResults(selectedTournamentForResults.id)}
                                disabled={loadingResults}
                                variant="outline"
                                size="sm"
                            >
                                {loadingResults ? 'Refreshing...' : 'Refresh Results'}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {/* Tournament Selection */}
                        <div className="mb-6">
                            <Label htmlFor="results-tournament-select">Select Tournament</Label>
                            <Select
                                value={selectedTournamentForResults?.id?.toString() || ''}
                                onValueChange={(value) => {
                                    const tournament = resultsTournaments.find(t => t.id.toString() === value);
                                    setSelectedTournamentForResults(tournament);
                                    setSelectedPlayer(null);
                                    setSearchQuery('');
                                    if (tournament) {
                                        fetchTournamentResults(tournament.id);
                                    } else {
                                        setTournamentResults([]);
                                        setFilteredResults([]);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full max-w-md">
                                    <SelectValue placeholder="Select a tournament" />
                                </SelectTrigger>
                                <SelectContent>
                                    {resultsTournaments.map((tournament) => (
                                        <SelectItem key={tournament.id} value={tournament.id.toString()}>
                                            {tournament.name} ({tournament.location})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {/* Results Display */}
                        {selectedTournamentForResults && (
                            <div>
                                <div className="mb-4">
                                    <h3 className="text-lg font-semibold">
                                        {selectedTournamentForResults.name} - Standings
                                    </h3>
                                    <p className="text-gray-600">
                                        {selectedTournamentForResults.location} • {selectedTournamentForResults.rounds} rounds • {selectedTournamentForResults.time_control}
                                    </p>
                                </div>
                                
                                {loadingResults ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                        <p className="mt-2 text-gray-600">Loading results...</p>
                                    </div>
                                ) : tournamentResults.length > 0 ? (
                                    <div className="space-y-6">
                                        {/* Search and Filter */}
                                        <div className="mb-4">
                                            <Label htmlFor="player-search">Search Players</Label>
                                            <Input
                                                id="player-search"
                                                placeholder="Search by player name or title..."
                                                value={searchQuery}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                className="max-w-md"
                                            />
                                        </div>
                                        
                                        {/* Overall Standings Table */}
                                        <div>
                                            <h4 className="text-md font-medium mb-3">
                                                Overall Standings {filteredResults.length !== tournamentResults.length && 
                                                    <span className="text-sm text-gray-500">({filteredResults.length} of {tournamentResults.length})</span>
                                                }
                                            </h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-12">Rank</TableHead>
                                                        <TableHead>Player</TableHead>
                                                        <TableHead>Rating</TableHead>
                                                        <TableHead>Points</TableHead>
                                                        <TableHead>Games</TableHead>
                                                        <TableHead>%</TableHead>
                                                        <TableHead>Action</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredResults.map((result, index) => (
                                                        <TableRow key={result.player_id}>
                                                            <TableCell className="font-medium">{index + 1}</TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <div className="font-medium">{result.player.name}</div>
                                                                    {result.player.title && (
                                                                        <Badge variant="outline" className="text-xs mt-1">
                                                                            {result.player.title}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{result.player.rating || '-'}</TableCell>
                                                            <TableCell>
                                                                <span className="font-mono text-lg">{result.totalPoints}</span>
                                                            </TableCell>
                                                            <TableCell>{result.gamesPlayed}</TableCell>
                                                            <TableCell>{result.percentage}%</TableCell>
                                                            <TableCell>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handlePlayerResultsClick(result)}
                                                                    className="text-blue-600 hover:text-blue-700"
                                                                >
                                                                    View Details
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        
                                        {/* Individual Player Results */}
                                        {selectedPlayer && (
                                            <div className="bg-gray-50 rounded-lg p-6">
                                                <h4 className="text-md font-medium mb-4">
                                                    Round-by-Round Results: {selectedPlayer.player.name}
                                                </h4>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Round</TableHead>
                                                            <TableHead>Opponent</TableHead>
                                                            <TableHead>Color</TableHead>
                                                            <TableHead>Result</TableHead>
                                                            <TableHead>Points</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {selectedPlayer.roundResults.map((roundResult) => (
                                                            <TableRow key={roundResult.round}>
                                                                <TableCell className="font-medium">Round {roundResult.round}</TableCell>
                                                                <TableCell>{roundResult.opponent}</TableCell>
                                                                <TableCell>
                                                                    {roundResult.color && (
                                                                        <div className="flex items-center">
                                                                            <div className={`w-3 h-3 rounded-sm mr-2 ${
                                                                                roundResult.color === 'White' ? 'bg-white border border-gray-400' : 'bg-black'
                                                                            }`}></div>
                                                                            {roundResult.color}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge 
                                                                        variant={roundResult.result === '1' ? 'default' : 
                                                                                roundResult.result === '½' ? 'secondary' : 'outline'}
                                                                        className={`font-mono ${
                                                                            roundResult.result === '1' ? 'bg-green-100 text-green-800' :
                                                                            roundResult.result === '0' ? 'bg-red-100 text-red-800' :
                                                                            roundResult.result === '½' ? 'bg-yellow-100 text-yellow-800' : ''
                                                                        }`}
                                                                    >
                                                                        {roundResult.result}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="font-mono">
                                                                    {roundResult.points || 0}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                <div className="mt-4 p-4 bg-blue-50 rounded">
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-medium">Total Points:</span>
                                                            <span className="ml-2 font-mono text-lg">{selectedPlayer.totalPoints}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Games Played:</span>
                                                            <span className="ml-2">{selectedPlayer.gamesPlayed}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Performance:</span>
                                                            <span className="ml-2">{selectedPlayer.percentage}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setSelectedPlayer(null)}
                                                    className="mt-4"
                                                >
                                                    Close Details
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                                        <Trophy className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-600">No results available for this tournament</p>
                                        <p className="text-sm text-gray-500 mt-1">Results will appear after games are completed</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {!selectedTournamentForResults && (
                            <div className="text-center py-12 text-gray-500">
                                <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                Select a tournament to view results and standings
                            </div>
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

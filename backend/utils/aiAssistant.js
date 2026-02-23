/**
 * AI Assistant for Tournament Management
 * Handles natural language commands for admin operations
 */

const { v4: uuidv4 } = require('uuid');

class TournamentAIAssistant {
    constructor(db) {
        this.db = db;
    }

    /**
     * Process natural language command and execute appropriate action
     */
    async processCommand(command, context = {}) {
        const lower = command.toLowerCase().trim();
        
        try {
            // Create tournament
            if (this.isCreateTournamentCommand(lower)) {
                return await this.handleCreateTournament(command, context);
            }
            
            // Add player
            if (this.isAddPlayerCommand(lower)) {
                return await this.handleAddPlayer(command, context);
            }
            
            // Start tournament / Generate pairings
            if (this.isStartTournamentCommand(lower)) {
                return await this.handleStartTournament(command, context);
            }
            
            // Get player details
            if (this.isGetPlayerCommand(lower)) {
                return await this.handleGetPlayer(command, context);
            }
            
            // List tournaments
            if (this.isListTournamentsCommand(lower)) {
                return await this.handleListTournaments(context);
            }
            
            // List players
            if (this.isListPlayersCommand(lower)) {
                return await this.handleListPlayers(context);
            }
            
            // Add player to tournament
            if (this.isAddPlayerToTournamentCommand(lower)) {
                return await this.handleAddPlayerToTournament(command, context);
            }
            
            // Generate next round
            if (this.isGenerateRoundCommand(lower)) {
                return await this.handleGenerateRound(command, context);
            }
            
            return {
                success: false,
                message: "I didn't understand that command. Try:\n" +
                    "• 'Create tournament [name] at [location] from [date] to [date] with [rounds] rounds'\n" +
                    "• 'Add player [name] with rating [rating]'\n" +
                    "• 'Start tournament [name]'\n" +
                    "• 'Get player details for [name]'\n" +
                    "• 'List all tournaments'\n" +
                    "• 'Add [player name] to [tournament name]'"
            };
        } catch (error) {
            console.error('AI Assistant error:', error);
            return {
                success: false,
                message: `Error: ${error.message}`
            };
        }
    }

    // Command detection methods
    isCreateTournamentCommand(lower) {
        return lower.includes('create tournament') || lower.includes('make tournament') || 
               lower.includes('new tournament');
    }

    isAddPlayerCommand(lower) {
        return (lower.includes('add player') || lower.includes('create player') || 
                lower.includes('new player')) && !lower.includes(' to ');
    }

    isStartTournamentCommand(lower) {
        return lower.includes('start tournament') || lower.includes('begin tournament');
    }

    isGetPlayerCommand(lower) {
        return lower.includes('get player') || lower.includes('show player') || 
               lower.includes('player details') || lower.includes('find player');
    }

    isListTournamentsCommand(lower) {
        return lower.includes('list tournament') || lower.includes('show tournament') || 
               lower.includes('all tournament');
    }

    isListPlayersCommand(lower) {
        return lower.includes('list player') || lower.includes('show player') || 
               lower.includes('all player');
    }

    isAddPlayerToTournamentCommand(lower) {
        return (lower.includes('add') && lower.includes(' to ')) || 
               (lower.includes('register') && lower.includes('for'));
    }

    isGenerateRoundCommand(lower) {
        return lower.includes('generate round') || lower.includes('create round') || 
               lower.includes('next round') || lower.includes('generate pairing');
    }

    // Command handlers
    async handleCreateTournament(command, context) {
        const parsed = this.parseTournamentCommand(command);
        
        if (!parsed.name) {
            return { success: false, message: "Please specify a tournament name" };
        }

        const tournament = {
            id: uuidv4(),
            name: parsed.name,
            location: parsed.location || 'TBD',
            start_date: parsed.start_date || new Date().toISOString(),
            end_date: parsed.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            rounds: parsed.rounds || 5,
            time_control: parsed.time_control || '90+30',
            arbiter: parsed.arbiter || 'TBD',
            tournament_type: parsed.type || 'swiss',
            created_at: new Date().toISOString()
        };

        await this.db.collection('tournaments').insertOne(tournament);

        return {
            success: true,
            message: `✅ Tournament "${tournament.name}" created successfully!`,
            data: tournament
        };
    }

    async handleAddPlayer(command, context) {
        const parsed = this.parsePlayerCommand(command);
        
        if (!parsed.name) {
            return { success: false, message: "Please specify a player name" };
        }

        const player = {
            id: uuidv4(),
            name: parsed.name,
            rating: parsed.rating || 0,
            title: parsed.title || '',
            birth_year: parsed.birth_year,
            email: parsed.email,
            phone: parsed.phone,
            created_at: new Date().toISOString()
        };

        await this.db.collection('players').insertOne(player);

        return {
            success: true,
            message: `✅ Player "${player.name}" added successfully! (Rating: ${player.rating})`,
            data: player
        };
    }

    async handleStartTournament(command, context) {
        const tournamentName = this.extractTournamentName(command);
        
        if (!tournamentName) {
            return { success: false, message: "Please specify which tournament to start" };
        }

        const tournament = await this.db.collection('tournaments').findOne({
            name: { $regex: new RegExp(tournamentName, 'i') }
        });

        if (!tournament) {
            return { success: false, message: `Tournament "${tournamentName}" not found` };
        }

        // Generate first round pairings
        const participants = await this.db.collection('tournament_participants')
            .find({ tournament_id: tournament.id, status: { $ne: 'withdrawn' } })
            .toArray();

        if (participants.length < 2) {
            return { 
                success: false, 
                message: `Cannot start tournament - only ${participants.length} participant(s) registered. Need at least 2.` 
            };
        }

        return {
            success: true,
            message: `✅ Tournament "${tournament.name}" is ready to start with ${participants.length} participants. Use "generate round 1 for ${tournament.name}" to create pairings.`,
            data: { tournament, participantCount: participants.length }
        };
    }

    async handleGetPlayer(command, context) {
        const playerName = this.extractPlayerName(command);
        
        if (!playerName) {
            return { success: false, message: "Please specify a player name" };
        }

        const player = await this.db.collection('players').findOne({
            name: { $regex: new RegExp(playerName, 'i') }
        });

        if (!player) {
            return { success: false, message: `Player "${playerName}" not found` };
        }

        return {
            success: true,
            message: `📋 Player Details:\n` +
                `Name: ${player.name}\n` +
                `Rating: ${player.rating}\n` +
                `Title: ${player.title || 'None'}\n` +
                `Email: ${player.email || 'N/A'}\n` +
                `Phone: ${player.phone || 'N/A'}`,
            data: player
        };
    }

    async handleListTournaments(context) {
        const tournaments = await this.db.collection('tournaments')
            .find({})
            .sort({ start_date: -1 })
            .limit(10)
            .toArray();

        if (tournaments.length === 0) {
            return { success: true, message: "No tournaments found", data: [] };
        }

        const list = tournaments.map((t, i) => 
            `${i + 1}. ${t.name} (${t.location}) - ${new Date(t.start_date).toLocaleDateString()}`
        ).join('\n');

        return {
            success: true,
            message: `📋 Tournaments:\n${list}`,
            data: tournaments
        };
    }

    async handleListPlayers(context) {
        const players = await this.db.collection('players')
            .find({})
            .sort({ rating: -1 })
            .limit(20)
            .toArray();

        if (players.length === 0) {
            return { success: true, message: "No players found", data: [] };
        }

        const list = players.map((p, i) => 
            `${i + 1}. ${p.name} (${p.rating})`
        ).join('\n');

        return {
            success: true,
            message: `📋 Players:\n${list}`,
            data: players
        };
    }

    async handleAddPlayerToTournament(command, context) {
        const { playerName, tournamentName } = this.parseAddToTournamentCommand(command);
        
        if (!playerName || !tournamentName) {
            return { 
                success: false, 
                message: "Please specify both player and tournament names. Example: 'Add John Doe to Summer Championship'" 
            };
        }

        const player = await this.db.collection('players').findOne({
            name: { $regex: new RegExp(playerName, 'i') }
        });

        if (!player) {
            return { success: false, message: `Player "${playerName}" not found` };
        }

        const tournament = await this.db.collection('tournaments').findOne({
            name: { $regex: new RegExp(tournamentName, 'i') }
        });

        if (!tournament) {
            return { success: false, message: `Tournament "${tournamentName}" not found` };
        }

        // Check if already registered
        const existing = await this.db.collection('tournament_participants').findOne({
            tournament_id: tournament.id,
            player_id: player.id,
            status: { $ne: 'withdrawn' }
        });

        if (existing) {
            return { 
                success: false, 
                message: `${player.name} is already registered for ${tournament.name}` 
            };
        }

        // Add participant
        const participant = {
            id: uuidv4(),
            tournament_id: tournament.id,
            player_id: player.id,
            registration_date: new Date().toISOString(),
            status: 'registered',
            created_at: new Date().toISOString()
        };

        await this.db.collection('tournament_participants').insertOne(participant);

        return {
            success: true,
            message: `✅ ${player.name} added to ${tournament.name}!`,
            data: { player, tournament, participant }
        };
    }

    async handleGenerateRound(command, context) {
        const { tournamentName, round } = this.parseGenerateRoundCommand(command);
        
        if (!tournamentName) {
            return { success: false, message: "Please specify which tournament" };
        }

        const tournament = await this.db.collection('tournaments').findOne({
            name: { $regex: new RegExp(tournamentName, 'i') }
        });

        if (!tournament) {
            return { success: false, message: `Tournament "${tournamentName}" not found` };
        }

        return {
            success: true,
            message: `To generate round ${round || 'next'} for ${tournament.name}, use the Pairings tab in the admin panel.`,
            data: { tournament, round }
        };
    }

    // Parsing helpers
    parseTournamentCommand(command) {
        const result = {
            name: null,
            location: null,
            start_date: null,
            end_date: null,
            rounds: null,
            time_control: null,
            arbiter: null,
            type: 'swiss'
        };

        // Extract name (between "tournament" and "at/from/with")
        const nameMatch = command.match(/tournament\s+([^at|from|with]+?)(?:\s+at|\s+from|\s+with|$)/i);
        if (nameMatch) result.name = nameMatch[1].trim();

        // Extract location
        const locationMatch = command.match(/at\s+([^from|with]+?)(?:\s+from|\s+with|$)/i);
        if (locationMatch) result.location = locationMatch[1].trim();

        // Extract rounds
        const roundsMatch = command.match(/(\d+)\s+rounds?/i);
        if (roundsMatch) result.rounds = parseInt(roundsMatch[1]);

        // Extract type
        if (command.toLowerCase().includes('knockout')) result.type = 'knockout';
        if (command.toLowerCase().includes('round robin')) result.type = 'round_robin';

        return result;
    }

    parsePlayerCommand(command) {
        const result = {
            name: null,
            rating: 0,
            title: '',
            birth_year: null,
            email: null,
            phone: null
        };

        // Extract name
        const nameMatch = command.match(/player\s+([^with|rating]+?)(?:\s+with|\s+rating|$)/i);
        if (nameMatch) result.name = nameMatch[1].trim();

        // Extract rating
        const ratingMatch = command.match(/rating\s+(\d+)/i);
        if (ratingMatch) result.rating = parseInt(ratingMatch[1]);

        // Extract email
        const emailMatch = command.match(/email\s+([^\s]+@[^\s]+)/i);
        if (emailMatch) result.email = emailMatch[1];

        // Extract phone
        const phoneMatch = command.match(/phone\s+([\d\s\-\+\(\)]+)/i);
        if (phoneMatch) result.phone = phoneMatch[1].trim();

        return result;
    }

    extractTournamentName(command) {
        const match = command.match(/tournament\s+([^for|with]+?)(?:\s+for|\s+with|$)/i);
        return match ? match[1].trim() : null;
    }

    extractPlayerName(command) {
        const match = command.match(/player\s+(?:details\s+for\s+)?([^for|with]+?)(?:\s+for|\s+with|$)/i);
        return match ? match[1].trim() : null;
    }

    parseAddToTournamentCommand(command) {
        // Pattern: "Add [player] to [tournament]"
        const match = command.match(/add\s+([^to]+?)\s+to\s+(.+)/i);
        if (match) {
            return {
                playerName: match[1].trim(),
                tournamentName: match[2].trim()
            };
        }
        return { playerName: null, tournamentName: null };
    }

    parseGenerateRoundCommand(command) {
        const roundMatch = command.match(/round\s+(\d+)/i);
        const tournamentMatch = command.match(/for\s+(.+)/i);
        
        return {
            round: roundMatch ? parseInt(roundMatch[1]) : null,
            tournamentName: tournamentMatch ? tournamentMatch[1].trim() : null
        };
    }
}

module.exports = TournamentAIAssistant;

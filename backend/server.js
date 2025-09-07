const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
let db;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'test_database';

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.CORS_ORIGINS || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Player Title Enum
const PlayerTitle = {
    GM: 'GM',
    IM: 'IM',
    FM: 'FM',
    CM: 'CM',
    WGM: 'WGM',
    WIM: 'WIM',
    WFM: 'WFM',
    WCM: 'WCM',
    NONE: ''
};

// Validation Schemas
const playerCreateSchema = Joi.object({
    name: Joi.string().required(),
    rating: Joi.number().integer().min(0).default(0),
    title: Joi.string().valid(...Object.values(PlayerTitle)).default(''),
    birth_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional()
});

const tournamentCreateSchema = Joi.object({
    name: Joi.string().required(),
    location: Joi.string().required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).required().messages({
        'date.min': 'End date must be after or equal to start date'
    }),
    rounds: Joi.number().integer().min(1).max(20).required(),
    time_control: Joi.string().required(),
    arbiter: Joi.string().required()
}).custom((value, helpers) => {
    const { start_date, end_date } = value;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    
    // Check if start date is not too far in the past (allow 1 day grace period for editing)
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    if (new Date(start_date) < oneDayAgo) {
        return helpers.message('Start date cannot be more than 1 day in the past');
    }
    
    // Check if dates are reasonable (not more than 2 years in the future)
    const twoYearsFromNow = new Date(today);
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    
    if (new Date(start_date) > twoYearsFromNow || new Date(end_date) > twoYearsFromNow) {
        return helpers.message('Tournament dates cannot be more than 2 years in the future');
    }
    
    // Check tournament duration (max 30 days)
    const durationMs = new Date(end_date) - new Date(start_date);
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    
    if (durationDays > 30) {
        return helpers.message('Tournament duration cannot exceed 30 days');
    }
    
    return value;
});

const tournamentResultCreateSchema = Joi.object({
    tournament_id: Joi.string().required(),
    player_id: Joi.string().required(),
    points: Joi.number().min(0).required(),
    rank: Joi.number().integer().min(1).required(),
    tiebreak1: Joi.number().default(0.0),
    tiebreak2: Joi.number().default(0.0),
    tiebreak3: Joi.number().default(0.0),
    performance_rating: Joi.number().integer().optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const tournamentParticipantSchema = Joi.object({
    tournament_id: Joi.string().required(),
    player_id: Joi.string().required(),
    registration_date: Joi.date().iso().default(() => new Date().toISOString()),
    seed_number: Joi.number().integer().min(1).optional(),
    status: Joi.string().valid('registered', 'confirmed', 'withdrawn').default('registered')
});

const pairingSchema = Joi.object({
    white_player_id: Joi.string().required(),
    black_player_id: Joi.string().allow(null).optional(), // null for bye
    result: Joi.string().valid('1-0', '0-1', '1/2-1/2').allow(null).optional()
});

const pairingCreateSchema = Joi.object({
    tournament_id: Joi.string().required(),
    round: Joi.number().integer().min(1).required(),
    pairings: Joi.array().items(pairingSchema).min(1).required()
});

const pairingUpdateSchema = Joi.object({
    result: Joi.string().valid('1-0', '0-1', '1/2-1/2').required()
});

// Helper functions
const createDocument = (data, schema = null) => {
    const document = {
        id: uuidv4(),
        ...data,
        created_at: new Date().toISOString()
    };
    return document;
};

const handleValidationError = (error) => {
    const message = error.details.map(detail => detail.message).join(', ');
    return { error: message };
};

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Connect to MongoDB
const connectDB = async () => {
    try {
        const client = new MongoClient(mongoUrl);
        await client.connect();
        db = client.db(dbName);
        console.log(`✅ Connected to MongoDB: ${dbName}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Routes

// Authentication Routes
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const { email, password } = value;
    
    // Check if credentials match admin credentials
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
        { email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        message: 'Login successful',
        token,
        user: {
            email,
            role: 'admin'
        }
    });
}));

app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user
    });
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});

// Player Routes
app.post('/api/players', authenticateToken, asyncHandler(async (req, res) => {
    const { error, value } = playerCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const player = createDocument(value);
    await db.collection('players').insertOne(player);
    res.json(player);
}));

app.get('/api/players', asyncHandler(async (req, res) => {
    let query = {};
    if (req.query.search) {
        query.name = { $regex: req.query.search, $options: 'i' };
    }

    const players = await db.collection('players').find(query).limit(1000).toArray();
    res.json(players);
}));

app.get('/api/players/:player_id', asyncHandler(async (req, res) => {
    const player = await db.collection('players').findOne({ id: req.params.player_id });
    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
}));

app.put('/api/players/:player_id', authenticateToken, asyncHandler(async (req, res) => {
    const { error, value } = playerCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const result = await db.collection('players').updateOne(
        { id: req.params.player_id },
        { $set: value }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Player not found' });
    }

    const updatedPlayer = await db.collection('players').findOne({ id: req.params.player_id });
    res.json(updatedPlayer);
}));

app.delete('/api/players/:player_id', authenticateToken, asyncHandler(async (req, res) => {
    const result = await db.collection('players').deleteOne({ id: req.params.player_id });
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ message: 'Player deleted successfully' });
}));

// Tournament Routes
app.post('/api/tournaments', authenticateToken, asyncHandler(async (req, res) => {
    const { error, value } = tournamentCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const tournament = createDocument(value);
    await db.collection('tournaments').insertOne(tournament);
    res.json(tournament);
}));

app.get('/api/tournaments', asyncHandler(async (req, res) => {
    const tournaments = await db.collection('tournaments').find({}).limit(1000).toArray();
    res.json(tournaments);
}));

app.get('/api/tournaments/:tournament_id', asyncHandler(async (req, res) => {
    const tournament = await db.collection('tournaments').findOne({ id: req.params.tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(tournament);
}));

app.put('/api/tournaments/:tournament_id', authenticateToken, asyncHandler(async (req, res) => {
    const { error, value } = tournamentCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const result = await db.collection('tournaments').updateOne(
        { id: req.params.tournament_id },
        { $set: value }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
    }

    const updatedTournament = await db.collection('tournaments').findOne({ id: req.params.tournament_id });
    res.json(updatedTournament);
}));

app.delete('/api/tournaments/:tournament_id', authenticateToken, asyncHandler(async (req, res) => {
    const result = await db.collection('tournaments').deleteOne({ id: req.params.tournament_id });
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json({ message: 'Tournament deleted successfully' });
}));

// Tournament Participants Routes
app.post('/api/tournaments/:tournament_id/participants', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    const { player_id } = req.body;
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Validate player exists
    const player = await db.collection('players').findOne({ id: player_id });
    if (!player) {
        return res.status(404).json({ error: 'Player not found' });
    }
    
    // Check if player is already registered
    const existingParticipant = await db.collection('tournament_participants').findOne({
        tournament_id,
        player_id,
        status: { $ne: 'withdrawn' }
    });
    
    if (existingParticipant) {
        return res.status(400).json({ error: 'Player is already registered for this tournament' });
    }
    
    const { error, value } = tournamentParticipantSchema.validate({
        tournament_id,
        player_id,
        registration_date: new Date().toISOString(),
        status: 'registered'
    });
    
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }
    
    const participant = createDocument(value);
    await db.collection('tournament_participants').insertOne(participant);
    
    res.json({ 
        message: 'Player added to tournament successfully',
        participant: {
            ...participant,
            player_name: player.name,
            player_rating: player.rating
        }
    });
}));

app.get('/api/tournaments/:tournament_id/participants', asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    
    const participants = await db.collection('tournament_participants').aggregate([
        { 
            $match: { 
                tournament_id, 
                status: { $ne: 'withdrawn' } 
            } 
        },
        {
            $lookup: {
                from: 'players',
                localField: 'player_id',
                foreignField: 'id',
                as: 'player'
            }
        },
        { $unwind: '$player' },
        { $sort: { 'player.rating': -1 } } // Sort by rating (highest first)
    ]).toArray();
    
    res.json(participants);
}));

app.delete('/api/tournaments/:tournament_id/participants/:player_id', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id, player_id } = req.params;
    
    const result = await db.collection('tournament_participants').updateOne(
        { tournament_id, player_id },
        { $set: { status: 'withdrawn', withdrawn_date: new Date().toISOString() } }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Participant not found' });
    }
    
    res.json({ message: 'Player removed from tournament successfully' });
}));

// Tournament Results Routes
app.post('/api/results', authenticateToken, asyncHandler(async (req, res) => {
    const { error, value } = tournamentResultCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const result = createDocument(value);
    await db.collection('results').insertOne(result);
    res.json(result);
}));

app.get('/api/results', asyncHandler(async (req, res) => {
    let query = {};
    if (req.query.tournament_id) {
        query.tournament_id = req.query.tournament_id;
    }
    if (req.query.player_id) {
        query.player_id = req.query.player_id;
    }

    const results = await db.collection('results').find(query).limit(1000).toArray();
    res.json(results);
}));

app.get('/api/results/:result_id', asyncHandler(async (req, res) => {
    const result = await db.collection('results').findOne({ id: req.params.result_id });
    if (!result) {
        return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
}));

app.put('/api/results/:result_id', authenticateToken, asyncHandler(async (req, res) => {
    const { error, value } = tournamentResultCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const result = await db.collection('results').updateOne(
        { id: req.params.result_id },
        { $set: value }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Result not found' });
    }

    const updatedResult = await db.collection('results').findOne({ id: req.params.result_id });
    res.json(updatedResult);
}));

app.delete('/api/results/:result_id', authenticateToken, asyncHandler(async (req, res) => {
    const result = await db.collection('results').deleteOne({ id: req.params.result_id });
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Result not found' });
    }
    res.json({ message: 'Result deleted successfully' });
}));

// Pairings Routes
app.post('/api/tournaments/:tournament_id/pairings', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    const { error, value } = pairingCreateSchema.validate({ ...req.body, tournament_id });
    
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }
    
    const { round, pairings } = value;
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Check if round is valid
    if (round > tournament.rounds) {
        return res.status(400).json({ error: `Round ${round} exceeds tournament rounds (${tournament.rounds})` });
    }
    
    // Check if pairings already exist for this round
    const existingPairings = await db.collection('pairings').findOne({ tournament_id, round });
    if (existingPairings) {
        return res.status(400).json({ error: `Pairings for round ${round} already exist` });
    }
    
    // Validate all players exist and fetch player data
    const playerIds = [];
    pairings.forEach(pairing => {
        playerIds.push(pairing.white_player_id);
        if (pairing.black_player_id) {
            playerIds.push(pairing.black_player_id);
        }
    });
    
    const players = await db.collection('players').find({ id: { $in: playerIds } }).toArray();
    const playerMap = players.reduce((map, player) => {
        map[player.id] = player;
        return map;
    }, {});
    
    // Create pairings with player data
    const pairingDocuments = pairings.map((pairing, index) => {
        return createDocument({
            tournament_id,
            round,
            board_number: index + 1,
            white_player_id: pairing.white_player_id,
            black_player_id: pairing.black_player_id,
            white_player: playerMap[pairing.white_player_id],
            black_player: pairing.black_player_id ? playerMap[pairing.black_player_id] : null,
            result: pairing.result || null,
            status: 'scheduled'
        });
    });
    
    // Insert all pairings
    await db.collection('pairings').insertMany(pairingDocuments);
    
    res.json({
        message: `Pairings created successfully for round ${round}`,
        pairings: pairingDocuments
    });
}));

app.get('/api/tournaments/:tournament_id/pairings/:round', asyncHandler(async (req, res) => {
    const { tournament_id, round } = req.params;
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const pairings = await db.collection('pairings').find({
        tournament_id,
        round: parseInt(round)
    }).sort({ board_number: 1 }).toArray();
    
    if (pairings.length === 0) {
        return res.status(404).json({ error: `No pairings found for round ${round}` });
    }
    
    res.json(pairings);
}));

app.get('/api/tournaments/:tournament_id/pairings', asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const pairings = await db.collection('pairings').find({ tournament_id })
        .sort({ round: 1, board_number: 1 }).toArray();
    
    res.json(pairings);
}));

app.put('/api/pairings/:pairing_id', authenticateToken, asyncHandler(async (req, res) => {
    const { pairing_id } = req.params;
    const { error, value } = pairingUpdateSchema.validate(req.body);
    
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }
    
    const result = await db.collection('pairings').updateOne(
        { id: pairing_id },
        { 
            $set: { 
                result: value.result,
                status: 'completed',
                updated_at: new Date().toISOString()
            }
        }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Pairing not found' });
    }
    
    const updatedPairing = await db.collection('pairings').findOne({ id: pairing_id });
    res.json({
        message: 'Result updated successfully',
        pairing: updatedPairing
    });
}));

app.delete('/api/tournaments/:tournament_id/pairings/:round', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id, round } = req.params;
    
    const result = await db.collection('pairings').deleteMany({
        tournament_id,
        round: parseInt(round)
    });
    
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: `No pairings found for round ${round}` });
    }
    
    res.json({ 
        message: `Pairings for round ${round} deleted successfully`,
        deletedCount: result.deletedCount
    });
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Chess Results API'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`🚀 Chess Results API server running on port ${PORT}`);
        console.log(`📖 Health check: http://localhost:${PORT}/health`);
        console.log(`🔧 API endpoints: http://localhost:${PORT}/api`);
    });
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

if (require.main === module) {
    startServer().catch(console.error);
}

module.exports = app;

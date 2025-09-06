const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
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
const federationCreateSchema = Joi.object({
    code: Joi.string().required(),
    name: Joi.string().required()
});

const playerCreateSchema = Joi.object({
    name: Joi.string().required(),
    federation: Joi.string().required(),
    rating: Joi.number().integer().min(0).default(0),
    title: Joi.string().valid(...Object.values(PlayerTitle)).default(''),
    birth_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional()
});

const tournamentCreateSchema = Joi.object({
    name: Joi.string().required(),
    location: Joi.string().required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().required(),
    rounds: Joi.number().integer().min(1).required(),
    time_control: Joi.string().required(),
    arbiter: Joi.string().required()
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

// Federation Routes
app.post('/api/federations', asyncHandler(async (req, res) => {
    const { error, value } = federationCreateSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const federation = createDocument(value);
    await db.collection('federations').insertOne(federation);
    res.json(federation);
}));

app.get('/api/federations', asyncHandler(async (req, res) => {
    const federations = await db.collection('federations').find({}).toArray();
    res.json(federations);
}));

app.get('/api/federations/:code', asyncHandler(async (req, res) => {
    const federation = await db.collection('federations').findOne({ code: req.params.code });
    if (!federation) {
        return res.status(404).json({ error: 'Federation not found' });
    }
    res.json(federation);
}));

// Player Routes
app.post('/api/players', asyncHandler(async (req, res) => {
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

app.put('/api/players/:player_id', asyncHandler(async (req, res) => {
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

app.delete('/api/players/:player_id', asyncHandler(async (req, res) => {
    const result = await db.collection('players').deleteOne({ id: req.params.player_id });
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ message: 'Player deleted successfully' });
}));

// Tournament Routes
app.post('/api/tournaments', asyncHandler(async (req, res) => {
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

app.put('/api/tournaments/:tournament_id', asyncHandler(async (req, res) => {
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

app.delete('/api/tournaments/:tournament_id', asyncHandler(async (req, res) => {
    const result = await db.collection('tournaments').deleteOne({ id: req.params.tournament_id });
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json({ message: 'Tournament deleted successfully' });
}));

// Tournament Results Routes
app.post('/api/results', asyncHandler(async (req, res) => {
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

app.put('/api/results/:result_id', asyncHandler(async (req, res) => {
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

app.delete('/api/results/:result_id', asyncHandler(async (req, res) => {
    const result = await db.collection('results').deleteOne({ id: req.params.result_id });
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Result not found' });
    }
    res.json({ message: 'Result deleted successfully' });
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

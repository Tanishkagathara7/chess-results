const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const googleFormsService = require('./googleFormsService');
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
    arbiter: Joi.string().required(),
    // Support both old format (single value) and new format (array of round-specific eliminations)
    elimination_per_round: Joi.number().integer().min(0).default(0).messages({
        'number.min': 'Elimination per round cannot be negative'
    }).optional(),
    round_eliminations: Joi.array().items(
        Joi.object({
            round: Joi.number().integer().min(1).required(),
            eliminations: Joi.number().integer().min(0).required().messages({
                'number.min': 'Eliminations cannot be negative'
            })
        })
    ).optional().messages({
        'array.base': 'Round eliminations must be an array'
    }),
    tournament_type: Joi.string().valid('swiss', 'knockout', 'round_robin').default('swiss'),
    // Registration settings
    enable_registration: Joi.boolean().default(true),
    registration_deadline: Joi.date().iso().optional(),
    max_participants: Joi.number().integer().min(2).max(500).optional(),
    entry_fee: Joi.number().min(0).optional(),
    registration_instructions: Joi.string().max(1000).optional()
}).custom((value, helpers) => {
    const { start_date, end_date, rounds, round_eliminations, elimination_per_round } = value;
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
    
    // Validate round eliminations if provided
    if (round_eliminations && round_eliminations.length > 0) {
        // Check that we don't have both elimination formats
        if (elimination_per_round && elimination_per_round > 0) {
            return helpers.message('Cannot specify both elimination_per_round and round_eliminations. Use only one format.');
        }
        
        // Check for duplicate rounds
        const roundNumbers = round_eliminations.map(re => re.round);
        const uniqueRounds = [...new Set(roundNumbers)];
        if (roundNumbers.length !== uniqueRounds.length) {
            return helpers.message('Duplicate round numbers found in round_eliminations');
        }
        
        // Check that all rounds are within the tournament rounds range
        const maxRound = Math.max(...roundNumbers);
        const minRound = Math.min(...roundNumbers);
        
        if (maxRound > rounds) {
            return helpers.message(`Round elimination specified for round ${maxRound}, but tournament only has ${rounds} rounds`);
        }
        
        if (minRound < 1) {
            return helpers.message('Round numbers must be at least 1');
        }
        
        // Validate that eliminations make sense for the tournament type
        if (value.tournament_type === 'knockout') {
            // In knockout tournaments, check that there are some eliminations overall
            const totalEliminations = round_eliminations.reduce((sum, re) => sum + re.eliminations, 0);
            if (totalEliminations === 0) {
                return helpers.message('Knockout tournaments must have some eliminations across rounds');
            }
            
            // Validate knockout tournament math:
            // If eliminating E players per round for R rounds, we need at least E*R + 1 players
            // For the final round to make sense, we need at least 2 players remaining
            const maxEliminationsPerRound = Math.max(...round_eliminations.map(re => re.eliminations));
            if (maxEliminationsPerRound >= rounds) {
                return helpers.message(`Cannot eliminate ${maxEliminationsPerRound} players per round in a ${rounds}-round tournament`);
            }
            
            // Calculate if tournament can logically end
            // Assuming we start with N players, after R-1 rounds of eliminations, we should have >= 2 players for final round
            const eliminationsBeforeFinal = round_eliminations
                .filter(re => re.round < rounds)
                .reduce((sum, re) => sum + re.eliminations, 0);
            
            if (eliminationsBeforeFinal > 0) {
                // This validation requires knowing participant count, which we don't have here
                // We'll validate this when participants are added
                console.log(`ℹ️ Tournament configured for ${eliminationsBeforeFinal} eliminations before final round`);
            }
        }
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

const userRegistrationSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
        'string.pattern.base': 'Phone number must be in valid international format (e.g., +1234567890)'
    }),
    rating: Joi.number().integer().min(0).max(3000).default(0),
    birth_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional()
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

// Generate Google Form URL for tournament registration
const generateRegistrationFormURL = async (tournament) => {
    try {
        return await googleFormsService.createTournamentRegistrationForm(tournament);
    } catch (error) {
        console.error('❌ Error generating registration form:', error.message);
        // Fallback to template URL
        const formTitle = encodeURIComponent(`${tournament.name} - Registration`);
        const formDescription = encodeURIComponent(
            `Register for ${tournament.name}\n\n` +
            `Location: ${tournament.location}\n` +
            `Date: ${new Date(tournament.start_date).toLocaleDateString()} - ${new Date(tournament.end_date).toLocaleDateString()}\n` +
            `Rounds: ${tournament.rounds}\n` +
            `Time Control: ${tournament.time_control}\n` +
            `Arbiter: ${tournament.arbiter}\n\n` +
            `${tournament.registration_instructions || 'Please fill out all required fields to register for this tournament.'}`
        );
        
        return {
            enabled: true,
            template_url: `https://docs.google.com/forms/create?title=${formTitle}&description=${formDescription}`,
            form_id: null,
            registration_url: null,
            webhook_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/tournaments/${tournament.id}/register-webhook`,
            instructions: 'Use the template URL to create a Google Form, then update the tournament with the actual form URL'
        };
    }
};

// WhatsApp notification helper
const sendWhatsAppNotification = async (phoneNumber, message) => {
    try {
        // Always log for debugging
        console.log(`📱 WhatsApp notification to ${phoneNumber}:`);
        console.log(message);
        console.log('---');
        
        // Check if Twilio credentials are configured
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
            console.log('⚠️  Twilio WhatsApp credentials not configured. Skipping WhatsApp notification.');
            console.log('📝 Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER to your .env file');
            return { success: false, error: 'Twilio credentials not configured' };
        }
        
        // Import and use Twilio
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        // Format phone number (ensure it starts with +)
        let formattedPhone = phoneNumber.replace(/[^0-9+]/g, '');
        if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }
        
        console.log(`📱 Sending WhatsApp message to ${formattedPhone}...`);
        
        const messageResult = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${formattedPhone}`,
            body: message
        });
        
        console.log(`✅ WhatsApp message sent successfully! Message SID: ${messageResult.sid}`);
        
        return { success: true, messageId: messageResult.sid };
    } catch (error) {
        console.error('❌ WhatsApp notification failed:', error.message);
        
        // Provide helpful error messages
        if (error.code === 20003) {
            console.error('🚫 Authentication failed - check your Twilio Account SID and Auth Token');
        } else if (error.code === 21211) {
            console.error('📱 Invalid To phone number - check the phone number format');
        } else if (error.code === 21212) {
            console.error('📱 Invalid From phone number - check your Twilio WhatsApp number');
        } else if (error.code === 21610) {
            console.error('🚫 WhatsApp not enabled for this number or sandbox not configured');
        }
        
        return { success: false, error: error.message };
    }
};

// Validate knockout tournament logic
const validateKnockoutLogic = (tournament, participantCount) => {
    if (tournament.tournament_type !== 'knockout') return { valid: true };
    
    const totalRounds = tournament.rounds;
    const roundEliminations = tournament.round_eliminations || [];
    
    if (roundEliminations.length === 0) {
        return { valid: false, error: 'Knockout tournament must have elimination configuration' };
    }
    
    // Calculate total eliminations across all rounds
    const totalEliminations = roundEliminations.reduce((sum, re) => sum + re.eliminations, 0);
    
    // For a proper knockout: participants - eliminations = 1 (winner)
    const remainingPlayers = participantCount - totalEliminations;
    
    if (remainingPlayers < 1) {
        return { 
            valid: false, 
            error: `Too many eliminations: ${totalEliminations} eliminations from ${participantCount} players leaves ${remainingPlayers} players` 
        };
    }
    
    if (remainingPlayers > 1) {
        return { 
            valid: false, 
            error: `Not enough eliminations: ${totalEliminations} eliminations from ${participantCount} players leaves ${remainingPlayers} players (should be 1 winner)` 
        };
    }
    
    // Check each round makes sense
    let playersRemaining = participantCount;
    for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
        const roundElim = roundEliminations.find(re => re.round === roundNum);
        const eliminations = roundElim ? roundElim.eliminations : 0;
        
        if (roundNum === totalRounds) {
            // Final round should have 2 players, no eliminations (winner determined by game result)
            if (playersRemaining !== 2) {
                return {
                    valid: false,
                    error: `Final round ${roundNum} should have exactly 2 players, but has ${playersRemaining}`
                };
            }
            if (eliminations > 0) {
                return {
                    valid: false,
                    error: `Final round ${roundNum} should not have eliminations (winner determined by game result)`
                };
            }
        } else {
            // Non-final rounds need at least eliminations + 2 players to continue
            if (playersRemaining <= eliminations) {
                return {
                    valid: false,
                    error: `Round ${roundNum}: Cannot eliminate ${eliminations} from ${playersRemaining} players`
                };
            }
            playersRemaining -= eliminations;
        }
    }
    
    return { valid: true, optimalRounds: participantCount - 1 };
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
app.post('/api/auth/register', asyncHandler(async (req, res) => {
    const { error, value } = userRegistrationSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const { name, email, password, phone, rating, birth_year } = value;
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = createDocument({
        name,
        email,
        password: hashedPassword,
        phone,
        rating,
        birth_year,
        role: 'user',
        status: 'active',
        email_verified: false
    });

    await db.collection('users').insertOne(user);

    // Also create a player profile for tournament participation
    const player = createDocument({
        name,
        rating,
        title: '', // Default empty title
        birth_year,
        user_id: user.id // Link player to user account
    });
    
    await db.collection('players').insertOne(player);
    console.log('✅ Created player profile:', player.id, 'for user:', user.id);

    // Generate JWT token
    const token = jwt.sign(
        { id: user.id, email, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.status(201).json({
        message: 'Registration successful',
        token,
        user: userResponse,
        player_id: player.id // Include player ID in response
    });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const { email, password } = value;
    
    // First check if it's admin credentials
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign(
            { email, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            message: 'Login successful',
            token,
            user: {
                email,
                role: 'admin'
            }
        });
    }
    
    // Check for regular user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (user.status !== 'active') {
        return res.status(401).json({ error: 'Account is not active' });
    }

    // Generate JWT token
    const token = jwt.sign(
        { id: user.id, email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
        message: 'Login successful',
        token,
        user: userResponse
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
    console.log('📅 Tournament creation request received:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = tournamentCreateSchema.validate(req.body);
    if (error) {
        console.log('❌ Tournament validation error:', error.details);
        return res.status(400).json(handleValidationError(error));
    }
    
    console.log('✅ Tournament validation passed:', JSON.stringify(value, null, 2));
    const tournament = createDocument(value);
    
    // Generate registration form URLs if registration is enabled
    if (value.enable_registration !== false) {
        const registrationData = await generateRegistrationFormURL(tournament);
        tournament.registration = registrationData;
        console.log('📋 Registration form data generated:', registrationData.registration_url || registrationData.template_url);
    }
    
    await db.collection('tournaments').insertOne(tournament);
    console.log('✅ Tournament created successfully:', tournament.id);
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
    console.log('📝 Tournament update request received for ID:', req.params.tournament_id);
    console.log('📝 Update data:', JSON.stringify(req.body, null, 2));
    
    const { error, value } = tournamentCreateSchema.validate(req.body);
    if (error) {
        console.log('❌ Tournament update validation error:', error.details);
        return res.status(400).json(handleValidationError(error));
    }
    
    console.log('✅ Tournament update validation passed:', JSON.stringify(value, null, 2));
    const result = await db.collection('tournaments').updateOne(
        { id: req.params.tournament_id },
        { $set: value }
    );

    if (result.matchedCount === 0) {
        console.log('❌ Tournament not found for update:', req.params.tournament_id);
        return res.status(404).json({ error: 'Tournament not found' });
    }

    const updatedTournament = await db.collection('tournaments').findOne({ id: req.params.tournament_id });
    console.log('✅ Tournament updated successfully:', req.params.tournament_id);
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

app.put('/api/tournaments/:tournament_id/participants/:player_id', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id, player_id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['registered', 'confirmed', 'withdrawn', 'eliminated'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updateData = { status };
    if (status === 'withdrawn') {
        updateData.withdrawn_date = new Date().toISOString();
    } else if (status === 'eliminated') {
        updateData.eliminated_date = new Date().toISOString();
    }
    
    const result = await db.collection('tournament_participants').updateOne(
        { tournament_id, player_id },
        { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Participant not found' });
    }
    
    res.json({ 
        message: `Player status updated to ${status} successfully`,
        status: status
    });
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

// Get all pairings for results calculation (must come BEFORE the round-specific route)
app.get('/api/tournaments/:tournament_id/pairings/all', asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    console.log('📊 Fetching all pairings for tournament:', tournament_id);
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        console.log('❌ Tournament not found:', tournament_id);
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const pairings = await db.collection('pairings').find({ tournament_id })
        .sort({ round: 1, board_number: 1 }).toArray();
    
    console.log('✅ Found pairings:', pairings.length, 'for tournament:', tournament_id);
    console.log('📄 Pairings data sample:', pairings.slice(0, 2));
    
    res.json(pairings);
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

// Get all pairings for a tournament (general endpoint)
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

// Get tournament results by round
app.get('/api/tournaments/:tournament_id/rounds/:round/results', asyncHandler(async (req, res) => {
    const { tournament_id, round } = req.params;
    const roundNum = parseInt(round);
    
    console.log(`🔍 Getting results for tournament ${tournament_id}, round ${roundNum}`);
    
    try {
        // Validate tournament exists
        const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        // Get participants
        const participants = await db.collection('tournament_participants').aggregate([
            { $match: { tournament_id, status: { $ne: 'withdrawn' } } },
            {
                $lookup: {
                    from: 'players',
                    localField: 'player_id',
                    foreignField: 'id',
                    as: 'player'
                }
            },
            { $unwind: '$player' }
        ]).toArray();
        
        // Get pairings up to this round
        const allPairings = await db.collection('pairings').find({
            tournament_id,
            round: { $lte: roundNum }
        }).sort({ round: 1, board_number: 1 }).toArray();
        
        // Initialize player stats
        const playerStats = new Map();
        participants.forEach(participant => {
            playerStats.set(participant.player_id, {
                player_id: participant.player_id,
                player_name: participant.player.name,
                player_rating: participant.player.rating,
                player_title: participant.player.title,
                points: 0,
                games_played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                opponents: [],
                status: participant.status
            });
        });
        
        // Calculate results from pairings
        allPairings.forEach(pairing => {
            const whiteId = pairing.white_player_id;
            const blackId = pairing.black_player_id;
            const result = pairing.result;
            
            // Process white player
            if (whiteId && playerStats.has(whiteId)) {
                const whiteStat = playerStats.get(whiteId);
                whiteStat.games_played++;
                
                if (result === '1-0') {
                    whiteStat.points += 1;
                    whiteStat.wins++;
                } else if (result === '1/2-1/2') {
                    whiteStat.points += 0.5;
                    whiteStat.draws++;
                } else if (result === '0-1') {
                    whiteStat.losses++;
                } else if (!blackId) { // bye
                    whiteStat.points += 1;
                }
            }
            
            // Process black player
            if (blackId && playerStats.has(blackId)) {
                const blackStat = playerStats.get(blackId);
                blackStat.games_played++;
                
                if (result === '0-1') {
                    blackStat.points += 1;
                    blackStat.wins++;
                } else if (result === '1/2-1/2') {
                    blackStat.points += 0.5;
                    blackStat.draws++;
                } else if (result === '1-0') {
                    blackStat.losses++;
                }
            }
        });
        
        // Create standings
        const standings = Array.from(playerStats.values())
            .filter(player => player.status !== 'eliminated')
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                return (b.player_rating || 0) - (a.player_rating || 0);
            })
            .map((player, index) => ({ ...player, rank: index + 1 }));
        
        const eliminatedPlayers = Array.from(playerStats.values())
            .filter(player => player.status === 'eliminated');
        
        // Get round data
        const roundPairings = allPairings.filter(p => p.round === roundNum);
        const completedGames = roundPairings.filter(p => p.result || !p.black_player_id).length;
        const roundEliminations = tournament.round_eliminations?.find(re => re.round === roundNum);
        
        res.json({
            tournament_id,
            tournament_name: tournament.name,
            round: roundNum,
            total_rounds: tournament.rounds,
            round_status: tournament.completed_rounds?.includes(roundNum) ? 'completed' : 'in_progress',
            standings,
            eliminated_players: eliminatedPlayers,
            round_summary: {
                total_games: roundPairings.length,
                completed_games: completedGames,
                eliminations_count: roundEliminations?.eliminations || 0,
                actual_eliminations: eliminatedPlayers.length,
                remaining_players: standings.length,
                round_pairings: roundPairings
            }
        });
        
    } catch (error) {
        console.error('❌ Round results API error:', error);
        res.status(500).json({ 
            error: 'Failed to calculate round results', 
            message: error.message 
        });
    }
}));

// Complete a round - mark all pairings as finalized and trigger results update
app.post('/api/tournaments/:tournament_id/rounds/:round/complete', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id, round } = req.params;
    
    console.log(`🏆 Completing round ${round} for tournament ${tournament_id}`);
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Validate round number
    const roundNum = parseInt(round);
    if (roundNum < 1 || roundNum > tournament.rounds) {
        return res.status(400).json({ error: `Invalid round number. Tournament has ${tournament.rounds} rounds.` });
    }
    
    // Get all pairings for this round
    const roundPairings = await db.collection('pairings').find({
        tournament_id,
        round: roundNum
    }).toArray();
    
    if (roundPairings.length === 0) {
        return res.status(404).json({ error: `No pairings found for round ${round}` });
    }
    
    // Check if all games with opponents have results
    const incompleteGames = roundPairings.filter(pairing => 
        pairing.black_player && !pairing.result // Has opponent but no result
    );
    
    if (incompleteGames.length > 0) {
        return res.status(400).json({ 
            error: `Cannot complete round: ${incompleteGames.length} game(s) still need results`,
            incompleteGames: incompleteGames.map(g => ({
                board: g.board_number,
                white: g.white_player?.name,
                black: g.black_player?.name
            }))
        });
    }
    
    // Mark all pairings in this round as completed
    await db.collection('pairings').updateMany(
        { tournament_id, round: roundNum },
        { 
            $set: { 
                round_status: 'completed',
                completed_at: new Date().toISOString()
            }
        }
    );
    
    // Handle eliminations for this round
    const roundEliminations = tournament.round_eliminations?.find(re => re.round === roundNum);
    const eliminationsCount = roundEliminations ? roundEliminations.eliminations : 0;
    
    if (eliminationsCount > 0) {
        // Calculate current standings to determine who to eliminate
        const participants = await db.collection('tournament_participants').aggregate([
            { $match: { tournament_id, status: { $ne: 'withdrawn' } } },
            {
                $lookup: {
                    from: 'players',
                    localField: 'player_id',
                    foreignField: 'id',
                    as: 'player'
                }
            },
            { $unwind: '$player' }
        ]).toArray();
        
        // Calculate player points through this round
        const playerStats = new Map();
        participants.forEach(participant => {
            playerStats.set(participant.player_id, {
                player_id: participant.player_id,
                points: 0,
                player_rating: participant.player.rating
            });
        });
        
        // Get all pairings up to this round
        const allPairings = await db.collection('pairings').find({
            tournament_id,
            round: { $lte: roundNum }
        }).toArray();
        
        // Calculate points
        allPairings.forEach(pairing => {
            const whiteId = pairing.white_player_id;
            const blackId = pairing.black_player_id;
            const result = pairing.result;
            
            if (whiteId && playerStats.has(whiteId)) {
                const whiteStat = playerStats.get(whiteId);
                if (result === '1-0') {
                    whiteStat.points += 1;
                } else if (result === '1/2-1/2') {
                    whiteStat.points += 0.5;
                } else if (!blackId) { // bye
                    whiteStat.points += 1;
                }
            }
            
            if (blackId && playerStats.has(blackId)) {
                const blackStat = playerStats.get(blackId);
                if (result === '0-1') {
                    blackStat.points += 1;
                } else if (result === '1/2-1/2') {
                    blackStat.points += 0.5;
                }
            }
        });
        
        // Sort players by points (ascending) and rating (ascending) to find bottom performers
        const sortedPlayers = Array.from(playerStats.values())
            .sort((a, b) => {
                if (a.points !== b.points) return a.points - b.points;
                return (a.player_rating || 0) - (b.player_rating || 0);
            });
        
        // Eliminate the bottom performers
        const playersToEliminate = sortedPlayers.slice(0, eliminationsCount);
        
        if (playersToEliminate.length > 0) {
            const eliminationPlayerIds = playersToEliminate.map(p => p.player_id);
            
            await db.collection('tournament_participants').updateMany(
                { 
                    tournament_id, 
                    player_id: { $in: eliminationPlayerIds }
                },
                { 
                    $set: { 
                        status: 'eliminated',
                        eliminated_round: roundNum,
                        eliminated_date: new Date().toISOString()
                    }
                }
            );
            
            console.log(`✅ Eliminated ${playersToEliminate.length} players after round ${roundNum}:`, 
                playersToEliminate.map(p => p.player_id));
        }
    }
    
    // Update tournament with completed round info
    const completedRounds = tournament.completed_rounds || [];
    if (!completedRounds.includes(roundNum)) {
        completedRounds.push(roundNum);
        completedRounds.sort((a, b) => a - b);
        
        await db.collection('tournaments').updateOne(
            { id: tournament_id },
            { 
                $set: { 
                    completed_rounds: completedRounds,
                    last_completed_round: roundNum,
                    updated_at: new Date().toISOString()
                }
            }
        );
    }
    
    console.log(`✅ Round ${round} completed successfully for tournament ${tournament_id}`);
    
    res.json({
        message: `Round ${round} completed successfully`,
        tournament_id,
        round: roundNum,
        completed_games: roundPairings.length,
        completed_rounds: completedRounds
    });
}));

// Tournament Registration Webhook (for Google Forms submissions)
app.post('/api/tournaments/:tournament_id/register-webhook', asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    
    console.log('📋 Received registration webhook for tournament:', tournament_id);
    console.log('📝 Registration data:', JSON.stringify(req.body, null, 2));
    
    try {
        // Validate tournament exists
        const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        
        // Extract player data from form submission
        // Google Forms sends data in different formats, handle common ones
        let playerData;
        
        if (req.body.form_response) {
            // Typeform format
            playerData = extractFromTypeform(req.body.form_response);
        } else if (req.body.responses) {
            // Google Forms format (via Zapier/integrations)
            playerData = extractFromGoogleForm(req.body.responses);
        } else {
            // Direct format (when posted directly)
            playerData = {
                name: req.body.name || req.body['entry.name'],
                rating: parseInt(req.body.rating || req.body['entry.rating']) || 0,
                title: req.body.title || req.body['entry.title'] || '',
                birth_year: parseInt(req.body.birth_year || req.body['entry.birth_year']) || null,
                email: req.body.email || req.body['entry.email'],
                phone: req.body.phone || req.body['entry.phone'],
                federation: req.body.federation || req.body['entry.federation'] || '',
                tournament_id: tournament_id
            };
        }
        
        if (!playerData.name) {
            return res.status(400).json({ error: 'Player name is required' });
        }
        
        console.log('✅ Extracted player data:', playerData);
        
        // Check if player already exists (by name and tournament)
        let existingPlayer = await db.collection('players').findOne({
            name: { $regex: new RegExp(`^${playerData.name}$`, 'i') }
        });
        
        let playerId;
        if (existingPlayer) {
            console.log('🔄 Using existing player:', existingPlayer.name);
            playerId = existingPlayer.id;
            
            // Update player info if new data is better
            const updateData = {};
            if (playerData.rating > existingPlayer.rating) updateData.rating = playerData.rating;
            if (playerData.title && !existingPlayer.title) updateData.title = playerData.title;
            if (playerData.birth_year && !existingPlayer.birth_year) updateData.birth_year = playerData.birth_year;
            
            if (Object.keys(updateData).length > 0) {
                await db.collection('players').updateOne(
                    { id: existingPlayer.id },
                    { $set: updateData }
                );
                console.log('🔄 Updated player info:', updateData);
            }
        } else {
            // Create new player
            const newPlayer = createDocument({
                name: playerData.name,
                rating: playerData.rating,
                title: playerData.title,
                birth_year: playerData.birth_year
            });
            
            await db.collection('players').insertOne(newPlayer);
            playerId = newPlayer.id;
            console.log('✅ Created new player:', newPlayer.name, playerId);
        }
        
        // Check if player is already registered for this tournament
        const existingParticipant = await db.collection('tournament_participants').findOne({
            tournament_id,
            player_id: playerId,
            status: { $ne: 'withdrawn' }
        });
        
        if (existingParticipant) {
            console.log('⚠️ Player already registered for this tournament');
            return res.json({ 
                message: 'Player already registered',
                player_id: playerId,
                registration_status: 'already_registered'
            });
        }
        
        // Add player to tournament
        const participant = createDocument({
            tournament_id,
            player_id: playerId,
            registration_date: new Date().toISOString(),
            status: 'registered',
            registration_source: 'google_form',
            contact_email: playerData.email,
            contact_phone: playerData.phone,
            federation: playerData.federation
        });
        
        await db.collection('tournament_participants').insertOne(participant);
        
        console.log('✅ Player registered for tournament successfully');
        
        res.json({
            message: 'Registration successful',
            player_id: playerId,
            participant_id: participant.id,
            tournament_id,
            registration_status: 'registered'
        });
        
    } catch (error) {
        console.error('❌ Registration webhook error:', error);
        res.status(500).json({ error: 'Registration failed', message: error.message });
    }
}));

// Helper functions for parsing form data
function extractFromGoogleForm(responses) {
    // Handle Google Forms response format
    const data = {};
    responses.forEach(response => {
        const question = response.question.toLowerCase();
        const answer = response.answer;
        
        if (question.includes('name')) data.name = answer;
        else if (question.includes('rating')) data.rating = parseInt(answer) || 0;
        else if (question.includes('title')) data.title = answer;
        else if (question.includes('birth') || question.includes('year')) data.birth_year = parseInt(answer);
        else if (question.includes('email')) data.email = answer;
        else if (question.includes('phone')) data.phone = answer;
        else if (question.includes('federation') || question.includes('country')) data.federation = answer;
    });
    return data;
}

function extractFromTypeform(formResponse) {
    // Handle Typeform response format
    const data = {};
    if (formResponse.answers) {
        formResponse.answers.forEach(answer => {
            const field = answer.field.ref || answer.field.title.toLowerCase();
            const value = answer.text || answer.number || answer.email;
            
            if (field.includes('name')) data.name = value;
            else if (field.includes('rating')) data.rating = parseInt(value) || 0;
            else if (field.includes('title')) data.title = value;
            else if (field.includes('birth') || field.includes('year')) data.birth_year = parseInt(value);
            else if (field.includes('email')) data.email = value;
            else if (field.includes('phone')) data.phone = value;
            else if (field.includes('federation') || field.includes('country')) data.federation = value;
        });
    }
    return data;
}

// Generate Google Form for tournament
app.post('/api/tournaments/:tournament_id/generate-form', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    try {
        // Generate new registration form
        const registrationData = await generateRegistrationFormURL(tournament);
        
        // Update tournament with registration data
        await db.collection('tournaments').updateOne(
            { id: tournament_id },
            { 
                $set: { 
                    registration: registrationData,
                    updated_at: new Date().toISOString()
                }
            }
        );
        
        res.json({
            message: 'Google Form generated successfully',
            registration: registrationData
        });
        
    } catch (error) {
        console.error('❌ Error generating form:', error);
        res.status(500).json({ 
            error: 'Failed to generate form', 
            message: error.message 
        });
    }
}));

// Get tournament registration link
app.get('/api/tournaments/:tournament_id/registration', asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (!tournament.registration) {
        return res.status(404).json({ error: 'Registration not enabled for this tournament' });
    }
    
    res.json(tournament.registration);
}));

// Update tournament registration form URL
app.put('/api/tournaments/:tournament_id/registration', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    const { registration_url, form_id } = req.body;
    
    if (!registration_url) {
        return res.status(400).json({ error: 'Registration URL is required' });
    }
    
    const result = await db.collection('tournaments').updateOne(
        { id: tournament_id },
        { 
            $set: { 
                'registration.registration_url': registration_url,
                'registration.form_id': form_id,
                'registration.updated_at': new Date().toISOString()
            }
        }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json({ message: 'Registration URL updated successfully' });
}));

// Get tournament registrations and participant management
app.get('/api/tournaments/:tournament_id/registrations', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get all participants (both manually added and registered)
    const participants = await db.collection('tournament_participants').aggregate([
        { $match: { tournament_id } },
        {
            $lookup: {
                from: 'players',
                localField: 'player_id',
                foreignField: 'id',
                as: 'player'
            }
        },
        { $unwind: '$player' },
        {
            $project: {
                id: 1,
                player_id: 1,
                tournament_id: 1,
                registration_date: 1,
                status: 1,
                registration_source: 1,
                contact_email: 1,
                contact_phone: 1,
                federation: 1,
                seed: 1,
                'player.name': 1,
                'player.rating': 1,
                'player.title': 1,
                'player.birth_year': 1
            }
        },
        { $sort: { 'player.rating': -1, 'player.name': 1 } }
    ]).toArray();
    
    // Group by registration source
    const registered = participants.filter(p => p.registration_source === 'google_form');
    const manual = participants.filter(p => !p.registration_source || p.registration_source === 'manual');
    
    // Get registration stats
    const stats = {
        total_participants: participants.length,
        registered_via_form: registered.length,
        manually_added: manual.length,
        active: participants.filter(p => p.status === 'registered' || p.status === 'active').length,
        withdrawn: participants.filter(p => p.status === 'withdrawn').length
    };
    
    res.json({
        tournament,
        participants,
        registered_players: registered,
        manual_players: manual,
        stats
    });
}));

// Manage individual registration status
app.put('/api/tournaments/:tournament_id/registrations/:participant_id', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id, participant_id } = req.params;
    const { status, notes } = req.body;
    
    const validStatuses = ['registered', 'active', 'withdrawn', 'disqualified'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updated_at = new Date().toISOString();
    
    const result = await db.collection('tournament_participants').updateOne(
        { id: participant_id, tournament_id },
        { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Participant not found' });
    }
    
    res.json({ message: 'Participant status updated successfully' });
}));

// Bulk approve/reject registrations
app.post('/api/tournaments/:tournament_id/registrations/bulk-action', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    const { action, participant_ids } = req.body;
    
    if (!['approve', 'reject', 'withdraw'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    if (!participant_ids || !Array.isArray(participant_ids)) {
        return res.status(400).json({ error: 'participant_ids must be an array' });
    }
    
    const statusMap = {
        approve: 'active',
        reject: 'rejected',
        withdraw: 'withdrawn'
    };
    
    const result = await db.collection('tournament_participants').updateMany(
        { 
            id: { $in: participant_ids },
            tournament_id
        },
        { 
            $set: {
                status: statusMap[action],
                updated_at: new Date().toISOString()
            }
        }
    );
    
    res.json({ 
        message: `${action} action completed`,
        modified_count: result.modifiedCount
    });
}));

// Tournament Request Management Routes
app.get('/api/tournament-requests', authenticateToken, asyncHandler(async (req, res) => {
    // Admin only endpoint
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { status = 'pending', tournament_id } = req.query;
    
    const matchQuery = { status };
    if (tournament_id) {
        matchQuery.tournament_id = tournament_id;
    }
    
    const requests = await db.collection('tournament_requests').aggregate([
        { $match: matchQuery },
        {
            $lookup: {
                from: 'players',
                localField: 'player_id',
                foreignField: 'id',
                as: 'player'
            }
        },
        { $unwind: '$player' },
        {
            $lookup: {
                from: 'tournaments',
                localField: 'tournament_id',
                foreignField: 'id',
                as: 'tournament'
            }
        },
        { $unwind: '$tournament' },
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: 'id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        { $sort: { request_date: -1 } }
    ]).toArray();
    
    res.json(requests);
}));

app.put('/api/tournament-requests/:request_id', authenticateToken, asyncHandler(async (req, res) => {
    // Admin only endpoint
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { request_id } = req.params;
    const { action, admin_notes } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use approve or reject' });
    }
    
    // Get the request
    const request = await db.collection('tournament_requests').findOne({ id: request_id });
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Request has already been processed' });
    }
    
    const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: req.user.id,
        approved_date: new Date().toISOString()
    };
    
    if (admin_notes) {
        updateData.admin_notes = admin_notes;
    }
    
    // Update request status
    await db.collection('tournament_requests').updateOne(
        { id: request_id },
        { $set: updateData }
    );
    
    // Get request details with user, player and tournament info for notifications
    const requestWithDetails = await db.collection('tournament_requests').aggregate([
        { $match: { id: request_id } },
        {
            $lookup: {
                from: 'players',
                localField: 'player_id',
                foreignField: 'id',
                as: 'player'
            }
        },
        { $unwind: '$player' },
        {
            $lookup: {
                from: 'tournaments',
                localField: 'tournament_id',
                foreignField: 'id',
                as: 'tournament'
            }
        },
        { $unwind: '$tournament' },
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: 'id',
                as: 'user'
            }
        },
        { $unwind: '$user' }
    ]).toArray();
    
    const requestDetails = requestWithDetails[0];
    
    // Send WhatsApp notification
    if (action === 'approve') {
        const whatsappMessage = `🎉 Great news, ${requestDetails.user.name}!\n\nYour tournament registration request has been APPROVED!\n\n🏆 Tournament: ${requestDetails.tournament.name}\n📍 Location: ${requestDetails.tournament.location}\n📅 Date: ${new Date(requestDetails.tournament.start_date).toLocaleDateString()}\n⏰ Time Control: ${requestDetails.tournament.time_control}\n\nYou are now officially registered. Good luck! ♟️`;
        
        await sendWhatsAppNotification(requestDetails.user.phone, whatsappMessage);
    } else if (action === 'reject') {
        const whatsappMessage = `Hello ${requestDetails.user.name},\n\nYour tournament registration request was not approved.\n\n🏆 Tournament: ${requestDetails.tournament.name}\n${admin_notes ? '\nReason: ' + admin_notes : ''}\n\nYou can contact the tournament organizers for more information.`;
        
        await sendWhatsAppNotification(requestDetails.user.phone, whatsappMessage);
    }
    
    res.json({ 
        message: `Request ${action}d successfully`,
        request: requestDetails
    });
}));

// Notification Management Routes
app.get('/api/notifications', authenticateToken, asyncHandler(async (req, res) => {
    const { limit = 20, read } = req.query;
    
    const matchQuery = { user_id: req.user.id };
    if (read !== undefined) {
        matchQuery.read = read === 'true';
    }
    
    const notifications = await db.collection('notifications')
        .find(matchQuery)
        .sort({ created_date: -1 })
        .limit(parseInt(limit))
        .toArray();
    
    res.json(notifications);
}));

app.get('/api/notifications/unread-count', authenticateToken, asyncHandler(async (req, res) => {
    const count = await db.collection('notifications').countDocuments({
        user_id: req.user.id,
        read: false
    });
    
    res.json({ unread_count: count });
}));

app.put('/api/notifications/:notification_id/read', authenticateToken, asyncHandler(async (req, res) => {
    const { notification_id } = req.params;
    
    const result = await db.collection('notifications').updateOne(
        { id: notification_id, user_id: req.user.id },
        { $set: { read: true, read_date: new Date().toISOString() } }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read' });
}));

app.put('/api/notifications/mark-all-read', authenticateToken, asyncHandler(async (req, res) => {
    const result = await db.collection('notifications').updateMany(
        { user_id: req.user.id, read: false },
        { $set: { read: true, read_date: new Date().toISOString() } }
    );
    
    res.json({ 
        message: 'All notifications marked as read',
        updated_count: result.modifiedCount
    });
}));

// Test WhatsApp endpoint (for debugging)
app.post('/api/test-whatsapp', authenticateToken, asyncHandler(async (req, res) => {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'phoneNumber and message are required' });
    }
    
    const result = await sendWhatsAppNotification(phoneNumber, message);
    
    res.json({
        message: 'WhatsApp test completed',
        result: result
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
    
    // Initialize Google Forms service
    await googleFormsService.initialize();
    
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

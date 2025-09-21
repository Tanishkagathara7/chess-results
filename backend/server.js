const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// const googleFormsService = require('./googleFormsService'); // Removed - not needed
const logger = require('./utils/logger');
const { swaggerUi, specs } = require('./config/swagger');
const cache = require('./utils/cache');
const { generatePairings } = require('./utils/pairing');
const compression = require('compression');
require('dotenv').config();
const mailer = require('./utils/mailer');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection
let db;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'test_database';

// Middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Enable compression
app.use(compression());

// Performance and security headers
app.use((req, res, next) => {
    // Cache control for static assets
    if (req.url.match(/\.(js|css|jpg|jpeg|png|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
    
    // Performance headers
    res.setHeader('X-DNS-Prefetch-Control', 'on');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    next();
});

// HTTP request logging with Winston
app.use(morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) }
}));

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
    birth_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[0-9+()\-\s]{7,20}$/).optional()
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
    
    // Enforce start date is today or in the future (no past dates)
    const startDateOnly = new Date(start_date);
    startDateOnly.setHours(0, 0, 0, 0);
    if (startDateOnly < today) {
        return helpers.message('Start date cannot be in the past. Use today or a future date.');
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

// Forgot/Reset Password Schemas
const forgotPasswordRequestSchema = Joi.object({
    email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
    token: Joi.string().required(),
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
        logger.info(`Connected to MongoDB: ${dbName}`);
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Chess Results API Documentation'
}));

// Routes

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

// Authentication Routes

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *                 pattern: '^\\+?[1-9]\\d{1,14}$'
 *               rating:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 3000
 *                 default: 0
 *               birth_year:
 *                 type: integer
 *                 minimum: 1900
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: If an account exists, a reset instruction will be sent
 *       400:
 *         description: Invalid input data
 */
app.post('/api/auth/forgot-password', asyncHandler(async (req, res) => {
    const { error, value } = forgotPasswordRequestSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const genericResponse = { message: 'If an account with that email exists, you will receive password reset instructions shortly.' };

    try {
        const { email } = value;

        // Find the user; return generic response regardless of existence
        const user = await db.collection('users').findOne({ email });
        if (user) {
            const token = uuidv4();
            const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

            await db.collection('users').updateOne(
                { id: user.id },
                { $set: { password_reset_token: token, password_reset_expires: expires } }
            );

            // Send email (no information leakage on failure)
            try {
                await mailer.sendPasswordResetEmail(email, token, { frontendUrl: process.env.FRONTEND_URL });
            } catch (e) {
                logger.error(`Failed to send password reset email to ${email}: ${e.message}`);
            }

            // Also log token in non-production for developer convenience
            if (process.env.NODE_ENV !== 'production') {
                logger.info(`Password reset token for ${email}: ${token} (expires at ${expires})`);
            }
        }

        return res.json(genericResponse);
    } catch (err) {
        logger.error('Forgot password flow failed:', err);
        // Always return generic success to avoid revealing account existence
        return res.json(genericResponse);
    }
}));

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a valid token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password has been reset successfully
 *       400:
 *         description: Invalid token or input
 */
app.post('/api/auth/reset-password', asyncHandler(async (req, res) => {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).json(handleValidationError(error));
    }

    const { token, password } = value;

    // Lookup user by reset token
    const user = await db.collection('users').findOne({ password_reset_token: token });
    if (!user || !user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db.collection('users').updateOne(
        { id: user.id },
        { 
            $set: { password: hashedPassword },
            $unset: { password_reset_token: '', password_reset_expires: '' }
        }
    );

    return res.json({ message: 'Password has been reset successfully' });
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
    const search = (req.query.search || '').toString().trim();
    const pipeline = [];

    if (search) {
        pipeline.push({ $match: { name: { $regex: search, $options: 'i' } } });
    }

    // If players are linked to users, include their email and phone as fallbacks when player.email/phone is missing
    pipeline.push(
        { $lookup: { from: 'users', localField: 'user_id', foreignField: 'id', as: 'user' } },
        { $addFields: { linked_email: { $arrayElemAt: ['$user.email', 0] } } },
        { $addFields: { linked_phone: { $arrayElemAt: ['$user.phone', 0] } } },
        { $addFields: { email: { $ifNull: ['$email', '$linked_email'] } } },
        { $addFields: { phone: { $ifNull: ['$phone', '$linked_phone'] } } },
        { $project: { user: 0, linked_email: 0, linked_phone: 0 } }
    );

    const players = await db.collection('players').aggregate(pipeline).limit(1000).toArray();
    res.json(players);
}));

app.get('/api/players/:player_id', asyncHandler(async (req, res) => {
    const pipeline = [
        { $match: { id: req.params.player_id } },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: 'id', as: 'user' } },
        { $addFields: { linked_email: { $arrayElemAt: ['$user.email', 0] } } },
        { $addFields: { linked_phone: { $arrayElemAt: ['$user.phone', 0] } } },
        { $addFields: { email: { $ifNull: ['$email', '$linked_email'] } } },
        { $addFields: { phone: { $ifNull: ['$phone', '$linked_phone'] } } },
        { $project: { user: 0, linked_email: 0, linked_phone: 0 } }
    ];
    const results = await db.collection('players').aggregate(pipeline).toArray();
    const player = results[0];
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
    
    await db.collection('tournaments').insertOne(tournament);
    console.log('✅ Tournament created successfully:', tournament.id);
    res.json(tournament);
}));

app.get('/api/tournaments', asyncHandler(async (req, res) => {
    // Optional text search by name/location
    const search = (req.query.search || '').toString().trim();
    const pipeline = [];

    if (search.length > 0) {
        pipeline.push({
            $match: {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { location: { $regex: search, $options: 'i' } }
                ]
            }
        });
    }

    // Include participant counts
    pipeline.push(
        {
            $lookup: {
                from: 'tournament_participants',
                let: { tournament_id: '$id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$tournament_id', '$$tournament_id'] },
                                    { $not: { $in: ['$status', ['withdrawn', 'eliminated']] } }
                                ]
                            }
                        }
                    }
                ],
                as: 'participants'
            }
        },
        { $addFields: { participant_count: { $size: '$participants' } } },
        { $project: { participants: 0 } },
        { $limit: 1000 }
    );

    const tournaments = await db.collection('tournaments').aggregate(pipeline).toArray();
    
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
    
    // Check if player is already registered (active record)
    const existingActiveParticipant = await db.collection('tournament_participants').findOne({
        tournament_id,
        player_id,
        status: { $ne: 'withdrawn' }
    });
    
    if (existingActiveParticipant) {
        return res.status(400).json({ error: 'Player is already registered for this tournament' });
    }
    
    // Check for withdrawn records - we can reactivate instead of creating new
    const withdrawnParticipant = await db.collection('tournament_participants').findOne({
        tournament_id,
        player_id,
        status: 'withdrawn'
    });
    
    let participant;
    
    if (withdrawnParticipant) {
        // Reactivate existing withdrawn record instead of creating new one
        console.log(`🔄 Reactivating withdrawn participant record for player ${player_id}`);
        
        await db.collection('tournament_participants').updateOne(
            { id: withdrawnParticipant.id },
            { 
                $set: { 
                    status: 'registered',
                    registration_date: new Date().toISOString(),
                    withdrawn_date: null,
                    withdrawn_by: null
                }
            }
        );
        
        participant = {
            ...withdrawnParticipant,
            status: 'registered',
            registration_date: new Date().toISOString()
        };
    } else {
        // Create new participant record
        const { error, value } = tournamentParticipantSchema.validate({
            tournament_id,
            player_id,
            registration_date: new Date().toISOString(),
            status: 'registered'
        });
        
        if (error) {
            return res.status(400).json(handleValidationError(error));
        }
        
        participant = createDocument(value);
        await db.collection('tournament_participants').insertOne(participant);
        
        console.log(`✅ Created new participant record for player ${player_id}`);
    }
    
    // Attempt to notify the associated user that they were added
    let notificationSent = false;
    try {
        // First, if the player is linked to a user, notify them
        let userToNotify = null;
        if (player.user_id) {
            userToNotify = await db.collection('users').findOne({ id: player.user_id });
        }
        
        // Otherwise, look up a recent request for this player and tournament to find a user
        if (!userToNotify) {
            const request = await db.collection('tournament_requests')
                .find({ tournament_id, player_id })
                .sort({ request_date: -1 })
                .limit(1)
                .toArray();
            if (request && request[0]?.user_id) {
                userToNotify = await db.collection('users').findOne({ id: request[0].user_id });
            }
        }
        
        if (userToNotify) {
            const notificationData = {
                user_id: userToNotify.id,
                type: 'tournament_admin_added',
                title: 'Added to Tournament',
                message: `You have been added to the tournament "${tournament.name}".`,
                data: {
                    tournament_id,
                    tournament_name: tournament.name,
                    player_id,
                    player_name: player.name,
                    added_by: req.user?.id || null
                },
                read: false,
                created_date: new Date().toISOString()
            };
            const notification = createDocument(notificationData);
            await db.collection('notifications').insertOne(notification);
            notificationSent = true;
            console.log(`✅ Created admin-added notification for user:`, userToNotify.email);
        } else {
            console.log('ℹ️ No associated user found for player; notification not sent');
        }
    } catch (notifyErr) {
        console.warn('⚠️ Failed to create admin-added notification:', notifyErr.message);
    }
    
    res.json({ 
        message: 'Player added to tournament successfully',
        participant: {
            ...participant,
            player_name: player.name,
            player_rating: player.rating
        },
        notification_sent: notificationSent
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
        // Group by player_id to remove any duplicates and keep the most recent registration
        {
            $group: {
                _id: '$player_id',
                id: { $first: '$id' },
                tournament_id: { $first: '$tournament_id' },
                player_id: { $first: '$player_id' },
                registration_date: { $max: '$registration_date' }, // Keep the latest registration
                status: { $first: '$status' },
                player: { $first: '$player' },
                created_at: { $first: '$created_at' }
            }
        },
        {
            $project: {
                _id: 0,
                id: 1,
                tournament_id: 1,
                player_id: 1,
                registration_date: 1,
                status: 1,
                player: 1,
                created_at: 1
            }
        },
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
    
    // First, get all participant records for this player in this tournament (there might be duplicates)
    const participantRecords = await db.collection('tournament_participants').find({
        tournament_id, 
        player_id, 
        status: { $ne: 'withdrawn' }
    }).toArray();
    
    if (participantRecords.length === 0) {
        return res.status(404).json({ error: 'Participant not found' });
    }
    
    console.log(`🔍 Found ${participantRecords.length} participant record(s) for player ${player_id} in tournament ${tournament_id}`);
    
    // Get participant details with user, player, and tournament info for notification
    const participantWithDetails = await db.collection('tournament_participants').aggregate([
        { $match: { tournament_id, player_id, status: { $ne: 'withdrawn' } } },
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
        { $limit: 1 } // Only need one record for details
    ]).toArray();
    
    const participantDetails = participantWithDetails[0];
    
    // Find the user associated with this player
    // Look for users who have made tournament requests with this player_id
    const userWithPlayer = await db.collection('tournament_requests').aggregate([
        { $match: { player_id } },
        {
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: 'id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        { $sort: { request_date: -1 } }, // Get most recent request
        { $limit: 1 }
    ]).toArray();
    
    // Remove ALL participant records for this player from this tournament (handles duplicates)
    const result = await db.collection('tournament_participants').updateMany(
        { tournament_id, player_id, status: { $ne: 'withdrawn' } },
        { $set: { 
            status: 'withdrawn', 
            withdrawn_date: new Date().toISOString(),
            withdrawn_by: req.user.id // Track who removed the player
        } }
    );
    
    if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Participant not found' });
    }
    
    // Send notification to user if found
    if (userWithPlayer.length > 0) {
        const user = userWithPlayer[0].user;
        
        const notificationData = {
            user_id: user.id,
            type: 'tournament_removal',
            title: 'Removed from Tournament',
            message: `You have been removed from the tournament "${participantDetails.tournament.name}". Your player "${participantDetails.player.name}" is no longer registered for this tournament.`,
            data: {
                tournament_id: tournament_id,
                tournament_name: participantDetails.tournament.name,
                player_id: player_id,
                player_name: participantDetails.player.name,
                removed_by: req.user.id,
                removed_date: new Date().toISOString()
            },
            read: false,
            created_date: new Date().toISOString()
        };
        
        const notification = createDocument(notificationData);
        await db.collection('notifications').insertOne(notification);
        
        console.log(`✅ Created removal notification for user:`, user.email);
        
        res.json({ 
            message: 'Player removed from tournament successfully',
            notification_sent: true,
            notified_user: user.email
        });
    } else {
        // No user found for this player
        console.log(`ℹ️ No user found for player ${participantDetails.player.name}, no notification sent`);
        
        res.json({ 
            message: 'Player removed from tournament successfully',
            notification_sent: false,
            note: 'No associated user found for notification'
        });
    }
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

/**
 * @swagger
 * /api/tournaments/{tournament_id}/pairings/generate:
 *   post:
 *     summary: Generate pairings for a round following Swiss-like rules
 *     tags: [Pairings]
 *     parameters:
 *       - in: path
 *         name: tournament_id
 *         schema:
 *           type: string
 *         required: true
 *         description: Tournament ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - round
 *             properties:
 *               round:
 *                 type: integer
 *                 minimum: 1
 *               options:
 *                 type: object
 *                 properties:
 *                   randomize:
 *                     type: boolean
 *                     description: Randomize first-round ordering (default true)
 *     responses:
 *       200:
 *         description: Generated pairings
 *       400:
 *         description: Validation error or pairings already exist
 */
app.post('/api/tournaments/:tournament_id/pairings/generate', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id } = req.params;
    const { round, options } = req.body || {};

    if (!round || !Number.isInteger(round) || round < 1) {
        return res.status(400).json({ error: 'round must be a positive integer' });
    }

    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }

    if (round > tournament.rounds) {
        return res.status(400).json({ error: `Round ${round} exceeds tournament rounds (${tournament.rounds})` });
    }

    // Check if pairings already exist for this round
    const existingPairings = await db.collection('pairings').findOne({ tournament_id, round });
    if (existingPairings) {
        return res.status(400).json({ error: `Pairings for round ${round} already exist` });
    }

    // Fetch active participants (not withdrawn or eliminated)
    const participants = await db.collection('tournament_participants').aggregate([
        { $match: { tournament_id, status: { $nin: ['withdrawn', 'eliminated'] } } },
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

    if (participants.length === 0) {
        return res.status(400).json({ error: 'No active participants to pair' });
    }

    // Build player list
    const players = participants.map(p => ({ id: p.player_id, name: p.player.name, rating: p.player.rating }));

    // Get all prior pairings (strictly before this round)
    const priorPairings = await db.collection('pairings').find({
        tournament_id,
        round: { $lt: round }
    }).sort({ round: 1, board_number: 1 }).toArray();

    // Calculate points and history up to previous rounds
    const points = new Map();
    const history = {};

    for (const p of players) {
        points.set(p.id, 0);
        history[p.id] = { lastColor: null, whiteCount: 0, blackCount: 0, byesCount: 0, lastOpponent: null };
    }

    // Organize pairings by round
    const pairingsByRound = new Map();
    for (const pr of priorPairings) {
        if (!pairingsByRound.has(pr.round)) pairingsByRound.set(pr.round, []);
        pairingsByRound.get(pr.round).push(pr);
    }

    const sortedRounds = Array.from(pairingsByRound.keys()).sort((a, b) => a - b);

    for (const r of sortedRounds) {
        const list = pairingsByRound.get(r) || [];
        for (const pairing of list) {
            const whiteId = pairing.white_player_id;
            const blackId = pairing.black_player_id;
            const result = pairing.result;

            const ensure = (id) => {
                if (!id) return;
                if (!history[id]) {
                    history[id] = { lastColor: null, whiteCount: 0, blackCount: 0, byesCount: 0, lastOpponent: null };
                }
                if (!points.has(id)) points.set(id, 0);
            };

            // Ensure entries exist if referenced by prior rounds
            ensure(whiteId);
            ensure(blackId);

            // Update colors and opponents
            if (whiteId) {
                const hW = history[whiteId];
                if (blackId) {
                    hW.whiteCount = (hW.whiteCount || 0) + 1;
                    hW.lastColor = 'W';
                    hW.lastOpponent = blackId;
                } else {
                    // bye
                    hW.byesCount = (hW.byesCount || 0) + 1;
                    hW.lastColor = null;
                    hW.lastOpponent = null;
                }
            }
            if (blackId) {
                const hB = history[blackId];
                hB.blackCount = (hB.blackCount || 0) + 1;
                hB.lastColor = 'B';
                hB.lastOpponent = whiteId;
            }

            // Update points
            if (whiteId && blackId) {
                if (result === '1-0') {
                    points.set(whiteId, (points.get(whiteId) || 0) + 1);
                } else if (result === '0-1') {
                    points.set(blackId, (points.get(blackId) || 0) + 1);
                } else if (result === '1/2-1/2') {
                    points.set(whiteId, (points.get(whiteId) || 0) + 0.5);
                    points.set(blackId, (points.get(blackId) || 0) + 0.5);
                }
            } else if (whiteId && !blackId) {
                // bye grants 1 point
                points.set(whiteId, (points.get(whiteId) || 0) + 1);
            }
        }
    }

    // Generate pairings
    const { pairings, bye_player_id } = generatePairings({ players, points, history, round, options });

    // Build documents and insert
    const playerIdsToFetch = new Set();
    for (const pr of pairings) {
        playerIdsToFetch.add(pr.white_player_id);
        if (pr.black_player_id) playerIdsToFetch.add(pr.black_player_id);
    }

    const playersData = await db.collection('players').find({ id: { $in: Array.from(playerIdsToFetch) } }).toArray();
    const pmap = playersData.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

    const docs = pairings.map((p, idx) => ({
        ...createDocument({
            tournament_id,
            round,
            board_number: idx + 1,
            white_player_id: p.white_player_id,
            black_player_id: p.black_player_id || null,
            white_player: pmap[p.white_player_id] || null,
            black_player: p.black_player_id ? (pmap[p.black_player_id] || null) : null,
            result: p.black_player_id ? null : null, // result remains null; bye is inferred by null black
            status: 'scheduled'
        })
    }));

    if (docs.length === 0) {
        return res.status(400).json({ error: 'Failed to generate pairings' });
    }

    await db.collection('pairings').insertMany(docs);

    res.json({
        message: `Generated ${docs.length} pairing(s) for round ${round}`,
        bye_player_id: bye_player_id || null,
        pairings: docs
    });
}));

// Manual pairings creation (existing)
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
            { $match: { tournament_id, status: { $nin: ['withdrawn', 'eliminated'] } } },
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
        
        // Cap eliminations to leave at least 1 player
        const activeCount = sortedPlayers.length;
        if (eliminationsCount > 0) {
            eliminationsCount = Math.min(eliminationsCount, Math.max(0, activeCount - 1));
        }
        
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
    }

    // Determine if tournament should end (<= 1 active participant)
    const remainingActive = await db.collection('tournament_participants').countDocuments({
        tournament_id,
        status: { $nin: ['withdrawn', 'eliminated'] }
    });

    const updateSet = {
        completed_rounds: completedRounds,
        last_completed_round: roundNum,
        updated_at: new Date().toISOString()
    };

    if (remainingActive <= 1) {
        updateSet.tournament_over = true;
        // Attempt to record winner if exactly one remains
        if (remainingActive === 1) {
            const winner = await db.collection('tournament_participants').findOne({
                tournament_id,
                status: { $nin: ['withdrawn', 'eliminated'] }
            });
            if (winner) updateSet.winner_player_id = winner.player_id;
        }
    }

    await db.collection('tournaments').updateOne(
        { id: tournament_id },
        { $set: updateSet }
    );
    
    console.log(`✅ Round ${round} completed successfully for tournament ${tournament_id}`);
    
    res.json({
        message: `Round ${round} completed successfully`,
        tournament_id,
        round: roundNum,
        completed_games: roundPairings.length,
        completed_rounds: completedRounds,
        tournament_over: !!updateSet.tournament_over,
        remaining_active: remainingActive,
        winner_player_id: updateSet.winner_player_id || null
    });
}));









// Tournament Request Management Routes
// Create tournament request (User endpoint)
app.post('/api/tournament-requests', authenticateToken, asyncHandler(async (req, res) => {
    const { tournament_id, player_id, preferred_rating, notes } = req.body;
    
    if (!tournament_id) {
        return res.status(400).json({ error: 'tournament_id is required' });
    }
    
    // Validate tournament exists
    const tournament = await db.collection('tournaments').findOne({ id: tournament_id });
    if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Check if tournament has already started or ended
    const now = new Date();
    const tournamentStartDate = new Date(tournament.start_date);
    const tournamentEndDate = new Date(tournament.end_date);
    
    if (now > tournamentEndDate) {
        return res.status(400).json({ 
            error: 'Registration is closed. Tournament has already ended.',
            tournament_end_date: tournament.end_date,
            current_time: now.toISOString()
        });
    }
    
    if (now >= tournamentStartDate) {
        return res.status(400).json({ 
            error: 'Registration is closed. Tournament has already started.',
            tournament_start_date: tournament.start_date,
            current_time: now.toISOString()
        });
    }
    
    // If no player_id provided, try to find/create player from user info
    let finalPlayerId = player_id;
    if (!finalPlayerId) {
        // Look for existing player linked to this user
        let player = await db.collection('players').findOne({ user_id: req.user.id });
        
        if (!player) {
            // Create new player from user information
            const newPlayer = createDocument({
                name: req.user.name,
                rating: preferred_rating || 0,
                user_id: req.user.id
            });
            
            await db.collection('players').insertOne(newPlayer);
            player = newPlayer;
            console.log('✅ Created new player for user:', req.user.name);
        }
        
        finalPlayerId = player.id;
    } else {
        // Validate provided player exists
        const player = await db.collection('players').findOne({ id: player_id });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
    }
    
    // Check if user already has a request for this tournament
    const existingRequest = await db.collection('tournament_requests').findOne({
        user_id: req.user.id,
        tournament_id,
        status: { $in: ['pending', 'approved'] }
    });
    
    if (existingRequest) {
        return res.status(400).json({ 
            error: 'You already have a request for this tournament',
            status: existingRequest.status
        });
    }
    
    // Check if player is already registered as participant
    const existingParticipant = await db.collection('tournament_participants').findOne({
        tournament_id,
        player_id: finalPlayerId,
        status: { $ne: 'withdrawn' }
    });
    
    if (existingParticipant) {
        return res.status(400).json({ error: 'Player is already registered for this tournament' });
    }
    
    // Create the tournament request
    const request = createDocument({
        tournament_id,
        player_id: finalPlayerId,
        user_id: req.user.id,
        status: 'pending',
        request_date: new Date().toISOString(),
        preferred_rating: preferred_rating || 0,
        notes: notes || ''
    });
    
    await db.collection('tournament_requests').insertOne(request);
    
    console.log('✅ Tournament request created:', {
        user: req.user.name,
        tournament: tournament.name,
        request_id: request.id
    });
    
    res.json({ 
        message: 'Tournament request submitted successfully',
        request_id: request.id,
        status: 'pending',
        tournament_name: tournament.name
    });
}));

// Get user's own tournament requests
app.get('/api/my-requests', authenticateToken, asyncHandler(async (req, res) => {
    const { status } = req.query;
    
    const matchQuery = { user_id: req.user.id };
    if (status) {
        matchQuery.status = status;
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
        { $sort: { request_date: -1 } }
    ]).toArray();
    
    res.json(requests);
}));

// Profile summary for the authenticated user: tournaments and game history
app.get('/api/my-summary', authenticateToken, asyncHandler(async (req, res) => {
    // Find all player profiles linked to this user
    const players = await db.collection('players').find({ user_id: req.user.id }).toArray();
    const playerIds = players.map(p => p.id);

    // If no linked players, try to infer from recent requests
    if (playerIds.length === 0) {
        const recentReq = await db.collection('tournament_requests')
            .find({ user_id: req.user.id })
            .sort({ request_date: -1 })
            .limit(1)
            .toArray();
        if (recentReq[0]?.player_id) {
            playerIds.push(recentReq[0].player_id);
        }
    }

    // Tournaments participated (active or previously registered)
    const tournaments = await db.collection('tournament_participants').aggregate([
        { $match: { player_id: { $in: playerIds }, status: { $ne: 'withdrawn' } } },
        {
            $lookup: {
                from: 'tournaments',
                localField: 'tournament_id',
                foreignField: 'id',
                as: 'tournament'
            }
        },
        { $unwind: '$tournament' },
        { $sort: { registration_date: -1 } }
    ]).toArray();

    // Games (pairings) involving any of the player's IDs
    const gamesRaw = await db.collection('pairings').find({
        $or: [
            { white_player_id: { $in: playerIds } },
            { black_player_id: { $in: playerIds } }
        ]
    }).sort({ tournament_id: 1, round: 1, board_number: 1 }).toArray();

    // Build normalized game view
    const games = gamesRaw.map(p => {
        const youAreWhite = playerIds.includes(p.white_player_id);
        const opponent = youAreWhite ? (p.black_player || null) : (p.white_player || null);
        let outcome = 'pending';
        if (p.result) {
            if (p.result === '1/2-1/2') outcome = 'draw';
            else if (youAreWhite) outcome = (p.result === '1-0') ? 'win' : 'loss';
            else outcome = (p.result === '0-1') ? 'win' : 'loss';
        }
        return {
            id: p.id,
            tournament_id: p.tournament_id,
            round: p.round,
            you_color: youAreWhite ? 'white' : 'black',
            opponent: opponent ? { id: opponent.id, name: opponent.name, rating: opponent.rating || 0 } : null,
            result: p.result || null,
            outcome,
            updated_at: p.updated_at || p.created_at || null
        };
    });

    // Totals
    const totals = {
        tournaments: tournaments.length,
        games: games.length,
        wins: games.filter(g => g.outcome === 'win').length,
        draws: games.filter(g => g.outcome === 'draw').length,
        losses: games.filter(g => g.outcome === 'loss').length
    };

    res.json({ players, tournaments, games, totals });
}));

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
    
    // If approved, add player to tournament participants
    if (action === 'approve') {
        // Check if player is already a participant (shouldn't happen, but be safe)
        const existingParticipant = await db.collection('tournament_participants').findOne({
            tournament_id: requestDetails.tournament_id,
            player_id: requestDetails.player_id,
            status: { $ne: 'withdrawn' }
        });
        
        if (!existingParticipant) {
            // Create tournament participant
            const participant = createDocument({
                tournament_id: requestDetails.tournament_id,
                player_id: requestDetails.player_id,
                registration_date: new Date().toISOString(),
                status: 'registered',
                registration_source: 'admin_approval',
                approved_by: req.user.id
            });
            
            await db.collection('tournament_participants').insertOne(participant);
            console.log('✅ Added player to tournament participants:', {
                player: requestDetails.player.name,
                tournament: requestDetails.tournament.name
            });
        }
    }
    
    // Create notification for the user
    const notificationData = {
        user_id: requestDetails.user_id,
        type: action === 'approve' ? 'tournament_approved' : 'tournament_rejected',
        title: action === 'approve' ? 'Tournament Request Approved!' : 'Tournament Request Rejected',
        message: action === 'approve' 
            ? `Your request to join "${requestDetails.tournament.name}" has been approved! You are now registered for the tournament.`
            : `Your request to join "${requestDetails.tournament.name}" has been rejected.${admin_notes ? ' Reason: ' + admin_notes : ''}`,
        data: {
            request_id: request_id,
            tournament_id: requestDetails.tournament_id,
            tournament_name: requestDetails.tournament.name,
            action: action,
            admin_notes: admin_notes || null
        },
        read: false,
        created_date: new Date().toISOString()
    };
    
    const notification = createDocument(notificationData);
    await db.collection('notifications').insertOne(notification);
    
    console.log(`✅ Created ${action} notification for user:`, requestDetails.user.email);
    
    res.json({ 
        message: `Request ${action}d successfully`,
        request: requestDetails
    });
}));

// Admin Utilities: Link players to users by heuristic
app.post('/api/admin/link-players-to-users', authenticateToken, asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const normalize = (s) => (s || '').toString().trim().toLowerCase();

    const users = await db.collection('users').find({}).toArray();
    const players = await db.collection('players').find({}).toArray();

    let linkedCount = 0;
    let alreadyLinked = 0;
    const ambiguous = [];
    const updates = [];

    // Build name->players map for quick lookup
    const nameMap = new Map();
    for (const p of players) {
        const key = normalize(p.name);
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key).push(p);
    }

    for (const user of users) {
        const emailLocal = normalize((user.email || '').split('@')[0]);
        const userName = normalize(user.name);

        // Skip if any player already linked to this user
        const already = players.find(p => p.user_id === user.id);
        if (already) {
            alreadyLinked++;
            continue;
        }

        // Candidate players
        const exactMatches = nameMap.get(userName) || [];
        const containsMatches = players.filter(p => normalize(p.name).includes(emailLocal));

        let candidates = [...exactMatches];
        for (const c of containsMatches) {
            if (!candidates.find(x => x.id === c.id)) candidates.push(c);
        }

        // If none found, skip
        if (candidates.length === 0) continue;

        // Prefer the one with highest rating, then most recent created_at
        candidates.sort((a, b) => (b.rating || 0) - (a.rating || 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));

        // If multiple candidates with different ids and same name, mark ambiguous but still pick the first
        if (candidates.length > 1) {
            ambiguous.push({ user_email: user.email, user_name: user.name, candidate_ids: candidates.map(c => c.id), candidate_names: candidates.map(c => c.name) });
        }

        const chosen = candidates[0];
        updates.push({ player_id: chosen.id, user_id: user.id });
    }

    // Apply updates
    for (const upd of updates) {
        await db.collection('players').updateOne({ id: upd.player_id }, { $set: { user_id: upd.user_id } });
        linkedCount++;
    }

    res.json({
        message: 'Linking complete',
        linked_count: linkedCount,
        already_linked: alreadyLinked,
        ambiguous_count: ambiguous.length,
        ambiguous_samples: ambiguous.slice(0, 10)
    });
}));

// Database Cleanup Routes
app.post('/api/admin/cleanup-duplicates', authenticateToken, asyncHandler(async (req, res) => {
    console.log('🧺 Starting duplicate participant cleanup...');
    
    try {
        // Find tournaments with duplicate participants
        const duplicates = await db.collection('tournament_participants').aggregate([
            {
                $match: {
                    status: { $ne: 'withdrawn' }
                }
            },
            {
                $group: {
                    _id: { tournament_id: '$tournament_id', player_id: '$player_id' },
                    count: { $sum: 1 },
                    records: { $push: '$$ROOT' }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]).toArray();
        
        console.log(`🔍 Found ${duplicates.length} sets of duplicate records`);
        
        let cleanedCount = 0;
        
        for (const duplicate of duplicates) {
            const records = duplicate.records;
            // Keep the most recent record, mark others as withdrawn
            const sortedRecords = records.sort((a, b) => new Date(b.registration_date) - new Date(a.registration_date));
            const toKeep = sortedRecords[0];
            const toRemove = sortedRecords.slice(1);
            
            console.log(`🧺 Cleaning ${toRemove.length} duplicate records for player ${duplicate._id.player_id} in tournament ${duplicate._id.tournament_id}`);
            
            // Mark duplicates as withdrawn
            for (const record of toRemove) {
                await db.collection('tournament_participants').updateOne(
                    { id: record.id },
                    { 
                        $set: { 
                            status: 'withdrawn',
                            withdrawn_date: new Date().toISOString(),
                            withdrawn_by: req.user.id,
                            cleanup_reason: 'duplicate_removal'
                        }
                    }
                );
                cleanedCount++;
            }
        }
        
        console.log(`✅ Cleanup completed. Removed ${cleanedCount} duplicate records.`);
        
        res.json({
            message: 'Duplicate cleanup completed',
            duplicates_found: duplicates.length,
            records_cleaned: cleanedCount,
            details: duplicates.map(d => ({
                tournament_id: d._id.tournament_id,
                player_id: d._id.player_id,
                duplicate_count: d.count
            }))
        });
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        res.status(500).json({ error: 'Cleanup failed', details: error.message });
    }
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


// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Chess Results API'
    });
});

// Friendly landing page for root path
app.get('/', (req, res) => {
    // Redirect to API docs for convenience in hosted environments (e.g., Render)
    res.redirect('/api-docs');
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

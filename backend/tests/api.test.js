const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the database connection for the main server
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    db: jest.fn().mockReturnValue(global.__MONGO_DB__)
  })),
  ObjectId: jest.requireActual('mongodb').ObjectId
}));

// Import app after mocking
const app = require('../server');

describe('Chess Results API', () => {
  let authToken;
  let adminToken;
  let testUserId;
  let testPlayerId;
  let testTournamentId;

  beforeAll(async () => {
    // Create admin token for testing
    adminToken = jwt.sign(
      { email: 'admin@chessresults.com', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create regular user token
    testUserId = 'test-user-id';
    authToken = jwt.sign(
      { id: testUserId, email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('Health Check', () => {
    test('GET /health should return OK status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        service: 'Chess Results API'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/register should create a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        phone: '+1234567890',
        rating: 1500,
        birth_year: 1990
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Registration successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    test('POST /api/auth/register should fail with invalid data', async () => {
      const invalidData = {
        name: 'A', // Too short
        email: 'invalid-email',
        password: '123', // Too short
        phone: '123' // Invalid format
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/auth/login should authenticate admin', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL || 'admin@chessresults.com',
          password: process.env.ADMIN_PASSWORD || 'admin123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('admin');
    });

    test('GET /api/auth/verify should validate token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
    });
  });

  describe('Players', () => {
    beforeEach(async () => {
      // Create a test player for each test
      const player = {
        id: 'test-player-id',
        name: 'Test Player',
        rating: 1600,
        title: 'FM',
        birth_year: 1995,
        created_at: new Date().toISOString()
      };
      await global.__MONGO_DB__.collection('players').insertOne(player);
      testPlayerId = player.id;
    });

    test('POST /api/players should create a new player', async () => {
      const playerData = {
        name: 'New Player',
        rating: 1400,
        title: 'CM',
        birth_year: 1992
      };

      const response = await request(app)
        .post('/api/players')
        .set('Authorization', `Bearer ${authToken}`)
        .send(playerData)
        .expect(200);

      expect(response.body.name).toBe(playerData.name);
      expect(response.body.rating).toBe(playerData.rating);
      expect(response.body).toHaveProperty('id');
    });

    test('GET /api/players should return all players', async () => {
      const response = await request(app)
        .get('/api/players')
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
    });

    test('GET /api/players/:player_id should return specific player', async () => {
      const response = await request(app)
        .get(`/api/players/${testPlayerId}`)
        .expect(200);

      expect(response.body.id).toBe(testPlayerId);
      expect(response.body.name).toBe('Test Player');
    });

    test('PUT /api/players/:player_id should update player', async () => {
      const updateData = {
        name: 'Updated Player Name',
        rating: 1700,
        title: 'IM'
      };

      const response = await request(app)
        .put(`/api/players/${testPlayerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.rating).toBe(updateData.rating);
    });
  });

  describe('Tournaments', () => {
    beforeEach(async () => {
      // Create a test tournament for each test
      const tournament = {
        id: 'test-tournament-id',
        name: 'Test Tournament',
        location: 'Test City',
        start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_date: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        rounds: 5,
        time_control: '90+30',
        arbiter: 'Test Arbiter',
        tournament_type: 'swiss',
        enable_registration: true,
        created_at: new Date().toISOString()
      };
      await global.__MONGO_DB__.collection('tournaments').insertOne(tournament);
      testTournamentId = tournament.id;
    });

    test('POST /api/tournaments should create a new tournament', async () => {
      const tournamentData = {
        name: 'New Tournament',
        location: 'New City',
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        rounds: 7,
        time_control: '120+30',
        arbiter: 'New Arbiter',
        tournament_type: 'swiss'
      };

      const response = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tournamentData)
        .expect(200);

      expect(response.body.name).toBe(tournamentData.name);
      expect(response.body.location).toBe(tournamentData.location);
      expect(response.body).toHaveProperty('id');
    });

    test('GET /api/tournaments should return all tournaments', async () => {
      const response = await request(app)
        .get('/api/tournaments')
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('GET /api/tournaments/:tournament_id should return specific tournament', async () => {
      const response = await request(app)
        .get(`/api/tournaments/${testTournamentId}`)
        .expect(200);

      expect(response.body.id).toBe(testTournamentId);
      expect(response.body.name).toBe('Test Tournament');
    });

    test('Tournament validation should reject invalid dates', async () => {
      const invalidTournament = {
        name: 'Invalid Tournament',
        location: 'Test City',
        start_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday (too far in past)
        end_date: new Date(Date.now() + 86400000).toISOString(),
        rounds: 5,
        time_control: '90+30',
        arbiter: 'Test Arbiter'
      };

      const response = await request(app)
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTournament)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Tournament Participants', () => {
    beforeEach(async () => {
      // Ensure we have test tournament and player
      const tournament = {
        id: 'test-tournament-participants',
        name: 'Test Tournament',
        location: 'Test City',
        start_date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
        rounds: 5,
        time_control: '90+30',
        arbiter: 'Test Arbiter',
        created_at: new Date().toISOString()
      };
      await global.__MONGO_DB__.collection('tournaments').insertOne(tournament);

      const player = {
        id: 'test-participant-player',
        name: 'Participant Player',
        rating: 1500,
        created_at: new Date().toISOString()
      };
      await global.__MONGO_DB__.collection('players').insertOne(player);
    });

    test('POST /api/tournaments/:tournament_id/participants should add player to tournament', async () => {
      const response = await request(app)
        .post('/api/tournaments/test-tournament-participants/participants')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ player_id: 'test-participant-player' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Player added to tournament successfully');
      expect(response.body.participant.player_name).toBe('Participant Player');
    });

    test('GET /api/tournaments/:tournament_id/participants should return tournament participants', async () => {
      // First add a participant
      await global.__MONGO_DB__.collection('tournament_participants').insertOne({
        id: 'test-participant-id',
        tournament_id: 'test-tournament-participants',
        player_id: 'test-participant-player',
        status: 'registered',
        created_at: new Date().toISOString()
      });

      const response = await request(app)
        .get('/api/tournaments/test-tournament-participants/participants')
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Route not found');
    });

    test('Should require authentication for protected routes', async () => {
      const response = await request(app)
        .post('/api/tournaments')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('Should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .post('/api/tournaments')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test' })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });
});
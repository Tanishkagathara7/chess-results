const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

// Mock environment variables for testing
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging during tests

let mongod;
let db;
let client;

// Setup in-memory MongoDB for testing
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test_chess_results');
  
  // Make database available globally for tests
  global.__MONGO_DB__ = db;
  global.__MONGO_CLIENT__ = client;
});

// Cleanup after all tests
afterAll(async () => {
  if (client) {
    await client.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

// Clear all collections before each test
beforeEach(async () => {
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    await db.collection(collection.name).deleteMany({});
  }
});
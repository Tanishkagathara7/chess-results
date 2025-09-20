module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/**/*.test.js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js',
    '!tests/setup.js',
    '!**/debug-*.js',
    '!**/test-*.js',
    '!**/check-*.js',
    '!**/create-*.js',
    '!**/find-*.js',
    '!**/fix-*.js',
    '!**/reset-*.js',
    '!**/update-*.js',
    '!**/backfill-*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  verbose: true,
  testTimeout: 10000
};
/**
 * Jest configuration for benchmark tests
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js', '**/*.spec.js', '**/test_*.js'],
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'dist/**/*.js',
    '!dist/bin/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  testTimeout: 30000, // 30 seconds
  moduleFileExtensions: ['js', 'json'],
  setupFilesAfterEnv: [],
};
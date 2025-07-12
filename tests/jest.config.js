module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.json' }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    'https://deno.land/std@(.*)/(.*)': '<rootDir>/deno-mock.js',
    '@std/(.*)': '<rootDir>/deno-mock.js'
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.js',
    '**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/*.config.{js,ts}'
  ],
  coverageDirectory: './test-results/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  }
};
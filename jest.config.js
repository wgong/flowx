export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '<rootDir>/tests/**/*.test.{ts,js}'
  ],
  transform: {
    '^.+\\.(ts|mjs)$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'es2022'
      }
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.cjs$': '$1',
    '^https://deno.land/std@0.\d+\\.\d+/(.*)$': '<rootDir>/tests/__mocks__/deno_modules.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-queue|inquirer|@types/inquirer)/)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 30000, // Increased for E2E tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // CI specific configurations
  ...(process.env.CI && {
    reporters: ['default', 'jest-junit'],
    coverageReporters: ['text', 'lcov', 'html', 'cobertura'],
  })
};
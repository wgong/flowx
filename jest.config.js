export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
    '<rootDir>/tests/**/*.test.ts'
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
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
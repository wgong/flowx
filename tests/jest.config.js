module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      useESM: true,
      tsconfig: {
        module: 'ES2022',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.json' }]
  },
  moduleNameMapper: {
    // Handle TypeScript file extensions
    '^(\\.{1,2}/.*)\\.ts$': '$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    
    // Handle source directory imports
    '^../../../src/(.*)$': '<rootDir>/../src/$1',
    '^../../src/(.*)$': '<rootDir>/../src/$1',
    '^../src/(.*)$': '<rootDir>/../src/$1',
    
    // Handle Deno imports
    'https://deno.land/std@(.*)/(.*)': '<rootDir>/deno-mock.js',
    '@std/(.*)': '<rootDir>/deno-mock.js'
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.jsx'],
  roots: ['<rootDir>/tests', '<rootDir>/../src'],
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.js',
    '**/*.test.js'
  ],
  collectCoverageFrom: [
    '../src/**/*.{js,ts}',
    '!../src/**/*.d.ts',
    '!../src/**/*.test.{js,ts}',
    '!../src/**/*.spec.{js,ts}',
    '!../src/**/__tests__/**',
    '!../src/**/__mocks__/**',
    '!../src/**/*.config.{js,ts}'
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
  },
  // Add resolver to handle TypeScript files
  resolver: '<rootDir>/ts-resolver.js',
  
  // Add setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
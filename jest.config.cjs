module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module name mapping - simplified for TypeScript
  moduleNameMapper: {
    // Handle .js imports that should resolve to .ts files
    '^(.+)\\.js$': '$1',
    // Handle Deno imports only
    'https://deno.land/std@(.*)/(.*)': '<rootDir>/tests/deno-mock.js',
    '@std/(.*)': '<rootDir>/tests/deno-mock.js',
    // Handle problematic npm modules
    'sql.js': '<rootDir>/tests/__mocks__/sql.js',
    'ipaddr.js': '<rootDir>/tests/__mocks__/ipaddr.js'
  },
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Test file patterns
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '<rootDir>/tests/**/*.test.{ts,js}',
    '<rootDir>/tests/**/*.spec.{ts,js}'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        module: 'CommonJS',
        target: 'ES2020',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        isolatedModules: false
      }
    }
  }
}; 
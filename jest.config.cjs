module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      useESM: true,
      tsconfig: {
        module: 'ES2022',
        target: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true,
        isolatedModules: true,
        noEmit: true
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
      plugins: [
        // Plugin to handle import.meta.url
        function () {
          return {
            visitor: {
              MetaProperty(path) {
                const { meta, property } = path.node;
                if (meta.name === 'import' && property.name === 'meta') {
                  path.replaceWithSourceString(JSON.stringify({
                    url: 'file:///mock/url'
                  }));
                }
              }
            }
          };
        }
      ]
    }]
  },
  moduleNameMapper: {
    // Handle TypeScript file extensions
    '^(\\.{1,2}/.*)\\.ts$': '$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    
    // Handle Deno imports
    'https://deno.land/std@(.*)/(.*)': '<rootDir>/tests/deno-mock.js',
    '@std/(.*)': '<rootDir>/tests/deno-mock.js'
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: [
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.js',
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.cjs',
    '**/tests/**/*.test.cjs'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/examples/',
    '/benchmark/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/agents/',
    '/swarm-memory/',
    '<rootDir>/memory/'
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
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  
  // Increase timeout for async operations
  testTimeout: 30000,
  
  // Prevent hanging by forcing exit
  forceExit: true,
  detectOpenHandles: true,
  
  // Limit workers to prevent resource issues
  maxWorkers: 1
};
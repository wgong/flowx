// Jest setup file for Claude Flow tests

// Set up test environment
process.env.CLAUDE_FLOW_ENV = 'test';

// Mock logger configuration to prevent initialization errors
jest.mock('../src/core/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    configure: jest.fn(),
    child: jest.fn(() => mockLogger),
    close: jest.fn(),
  };
  
  return {
    Logger: {
      getInstance: jest.fn(() => mockLogger),
    },
    LogLevel: {
      DEBUG: 'debug',
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
    },
  };
});

// Mock only the fs/promises module which is commonly used
jest.mock('node:fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('mock-file-content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({
    isDirectory: () => true,
    isFile: () => false
  }),
  unlink: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockImplementation(() => Promise.resolve()),
  mkdtemp: jest.fn().mockResolvedValue('/tmp/test-dir'),
  rm: jest.fn().mockResolvedValue(undefined),
}));

// Also mock the fs/promises module without the node: prefix
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('mock-file-content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({
    isDirectory: () => true,
    isFile: () => false
  }),
  unlink: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockImplementation(() => Promise.resolve()),
  mkdtemp: jest.fn().mockResolvedValue('/tmp/test-dir'),
  rm: jest.fn().mockResolvedValue(undefined),
}));

// Mock better-sqlite3 since it's used in some tests
jest.mock('better-sqlite3', () => {
  // Simple in-memory storage for mocking
  const mockStorage = new Map();
  
  return jest.fn().mockImplementation(() => ({
    prepare: jest.fn((sql) => {
      if (sql.includes('CREATE TABLE')) {
        return {
          run: jest.fn(),
          get: jest.fn(),
          all: jest.fn(),
        };
      }
      
      if (sql.includes('INSERT OR REPLACE')) {
        return {
          run: jest.fn((params) => {
            // Store the entry using the ID as key
            const [id, agentId, sessionId, type, content, context, timestamp, tags, version, parentId, metadata] = params;
            mockStorage.set(id, {
              id, agent_id: agentId, session_id: sessionId, type, content, context, timestamp, tags, version, parent_id: parentId, metadata
            });
          }),
          get: jest.fn(),
          all: jest.fn(),
        };
      }
      
      if (sql.includes('SELECT * FROM memory_entries WHERE id = ?')) {
        return {
          run: jest.fn(),
          get: jest.fn((params) => {
            const [id] = params;
            return mockStorage.get(id) || undefined;
          }),
          all: jest.fn(),
        };
      }
      
      if (sql.includes('DELETE FROM memory_entries WHERE id = ?')) {
        return {
          run: jest.fn((params) => {
            const [id] = params;
            mockStorage.delete(id);
          }),
          get: jest.fn(),
          all: jest.fn(),
        };
      }
      
      if (sql.includes('SELECT COUNT(*) as count FROM memory_entries')) {
        return {
          run: jest.fn(),
          get: jest.fn(() => ({ count: mockStorage.size })),
          all: jest.fn(),
        };
      }
      
      if (sql.includes('SELECT * FROM memory_entries')) {
        return {
          run: jest.fn(),
          get: jest.fn(),
          all: jest.fn((params) => {
            let results = Array.from(mockStorage.values());
            
            // Simple filtering based on common query patterns
            if (sql.includes('agent_id = ?') && params && params.length > 0) {
              const agentId = params[0];
              results = results.filter(entry => entry.agent_id === agentId);
            }
            
            if (sql.includes('session_id = ?') && params && params.length > 0) {
              const sessionId = params[0];
              results = results.filter(entry => entry.session_id === sessionId);
            }
            
            return results;
          }),
        };
      }
      
      // Default fallback
      return {
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn(),
      };
    }),
    exec: jest.fn(),
    close: jest.fn(),
    serialize: jest.fn().mockReturnValue(Buffer.from('mock-serialized-db')),
  }));
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

// Set up global test environment
global.console = {
  ...console,
  // Suppress debug logs during tests
  debug: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for async operations
jest.setTimeout(30000); 
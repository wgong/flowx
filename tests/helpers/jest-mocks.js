/**
 * Common Jest mocks for CLI integration tests
 */

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockImplementation((path) => {
      if (path.includes('CLAUDE.md')) {
        if (path.includes('minimal')) {
          return Promise.resolve("# Minimal project configuration");
        }
        if (path.includes('sparc')) {
          return Promise.resolve("# SPARC Development Environment");
        }
        return Promise.resolve("# Claude Code Configuration");
      }
      return Promise.resolve("Mock content");
    }),
    stat: jest.fn().mockResolvedValue({ isFile: () => true }),
    rm: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawnSync: jest.fn().mockImplementation((cmd, args, options) => ({
    status: 0,
    stdout: 'Mock output from ' + cmd + ' ' + args.join(' '),
    stderr: ''
  }))
}));

// Mock process.cwd if not already mocked
if (!process.cwd.mock) {
  process.cwd = jest.fn().mockReturnValue('/mock/cwd');
}

// Create mock Deno global
global.Deno = {
  stat: jest.fn().mockResolvedValue({ isFile: true }),
  env: {
    get: jest.fn().mockReturnValue('mock-value'),
    set: jest.fn()
  }
};

// Export mock helpers
export function createMockCommand() {
  return {
    output: async () => ({
      success: true,
      stdout: Buffer.from('Mock command succeeded'),
      stderr: Buffer.from('')
    })
  };
}

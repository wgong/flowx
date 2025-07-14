/**
 * Unit tests for Web MCP Tools
 */

import { createWebTools } from '../../../../src/mcp/tools/web';
import { Logger } from '../../../../src/core/logger';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';
import * as http from 'node:http';

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
};

// Mock HTTP responses
jest.mock('node:http', () => {
  const originalHttp = jest.requireActual('node:http');
  
  return {
    ...originalHttp,
    request: jest.fn((url, options, callback) => {
      const req = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
      
      const res = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(Buffer.from(JSON.stringify({ success: true, data: 'test' })));
          }
          if (event === 'end') {
            handler();
          }
        }),
      };
      
      if (callback) {
        callback(res);
      }
      
      return req;
    }),
  };
});

// Mock HTTPS responses
jest.mock('node:https', () => {
  const originalHttps = jest.requireActual('node:https');
  
  return {
    ...originalHttps,
    request: jest.fn((url, options, callback) => {
      const req = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };
      
      const res = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(Buffer.from(JSON.stringify({ success: true, data: 'test' })));
          }
          if (event === 'end') {
            handler();
          }
        }),
      };
      
      if (callback) {
        callback(res);
      }
      
      return req;
    }),
  };
});

// Mock child_process exec
jest.mock('node:child_process', () => {
  return {
    exec: jest.fn((cmd, callback) => {
      if (callback) {
        callback(null, { stdout: '<html><body><h1>Test Page</h1></body></html>', stderr: '' });
      }
      return {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
      };
    }),
  };
});

// Helper to create temp directory
async function createTempDir(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'web-tools-test-'));
  return tempDir;
}

describe('Web MCP Tools', () => {
  let tools: any[];
  let tempDir: string;

  beforeAll(async () => {
    // Create web tools
    tools = createWebTools(mockLogger as any);
    
    // Create temp directory for tests
    tempDir = await createTempDir();
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create all web tools', () => {
    expect(tools).toHaveLength(12);
    
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('web/request');
    expect(toolNames).toContain('web/scrape');
    expect(toolNames).toContain('web/parse');
    expect(toolNames).toContain('web/download');
    expect(toolNames).toContain('web/upload');
    expect(toolNames).toContain('web/api');
    expect(toolNames).toContain('web/browser');
    expect(toolNames).toContain('web/screenshot');
    expect(toolNames).toContain('web/pdf');
    expect(toolNames).toContain('web/forms');
    expect(toolNames).toContain('web/cookies');
    expect(toolNames).toContain('web/session');
  });

  describe('request tool', () => {
    let requestTool: any;
    
    beforeAll(() => {
      requestTool = tools.find(tool => tool.name === 'web/request');
    });
    
    test('should make HTTP requests', async () => {
      const result = await requestTool.handler({ 
        url: 'https://example.com/api',
        method: 'GET',
        json: true,
      });
      
      expect(result).toHaveProperty('url', 'https://example.com/api');
      expect(result).toHaveProperty('status', 200);
      expect(result).toHaveProperty('body');
      expect(result.body).toHaveProperty('success', true);
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('api tool', () => {
    let apiTool: any;
    
    beforeAll(() => {
      apiTool = tools.find(tool => tool.name === 'web/api');
    });
    
    test('should make API calls with structured parameters', async () => {
      const result = await apiTool.handler({ 
        baseUrl: 'https://api.example.com',
        endpoint: '/v1/data',
        method: 'GET',
        params: { limit: 10, offset: 0 },
        headers: { 'X-API-Version': '1.0' },
      });
      
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('https://api.example.com/v1/data');
      expect(result.url).toContain('limit=10');
      expect(result).toHaveProperty('method', 'GET');
      expect(result).toHaveProperty('status', 200);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');
    });
    
    test('should handle authentication', async () => {
      const result = await apiTool.handler({ 
        baseUrl: 'https://api.example.com',
        endpoint: '/v1/protected',
        method: 'GET',
        auth: {
          type: 'bearer',
          token: 'test-token',
        },
      });
      
      expect(result).toHaveProperty('url');
      expect(result.url).toContain('https://api.example.com/v1/protected');
      expect(result).toHaveProperty('status', 200);
    });
  });

  describe('browser tool', () => {
    let browserTool: any;
    
    beforeAll(() => {
      browserTool = tools.find(tool => tool.name === 'web/browser');
    });
    
    test('should retrieve HTML content from a URL', async () => {
      const result = await browserTool.handler({ 
        url: 'https://example.com',
        action: 'getHTML',
      });
      
      expect(result).toHaveProperty('url', 'https://example.com');
      expect(result).toHaveProperty('action', 'getHTML');
      expect(result).toHaveProperty('html');
      expect(result.html).toContain('<html>');
      expect(result).toHaveProperty('timestamp');
    });
  });

  // Add additional tests for other tools as needed
});
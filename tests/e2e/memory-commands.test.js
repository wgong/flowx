/**
 * End-to-end tests for memory commands
 * Tests memory storage, querying, listing, and management
 */

console.log(`Current working directory in memory-commands.test.js: ${process.cwd()}`);

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base.js';

describe('Memory Commands E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({ debug: true });
    await runner.setup();
    runner.clearMemoryStore(); // Clear memory state between tests
  });
  
  afterEach(async () => {
    await runner.teardown();
  });



  describe('memory help command', () => {
    test('should show memory help information', async () => {
      const { stdout, code } = await runner.runCommand('memory --help');
      
      expect(code).toBe(0);
      expect(stdout).toContain('memory');
      expect(stdout).toContain('COMMANDS');
      expect(stdout).toContain('OPTIONS');
    });
  });
  
  describe('memory store command', () => {
    test('should store a memory entry', async () => {
      const { stdout, code, stderr } = await runner.runCommand([
        'memory', 'store',
        '--key', 'test-memory-key',
        '--value', 'Test memory value for E2E testing',
        '--type', 'user'
      ]);
      

      expect(code).toBe(0);
      expect(stdout).toContain('Memory stored with ID');
      expect(stdout).toContain('Key: test-memory-key');
    });
    
    test('should store memory with tags', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'store',
        '--key', 'tagged-memory',
        '--value', 'Memory with tags for testing',
        '--tags', 'test,e2e,memory'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Memory stored with ID');
      expect(stdout).toContain('Tags: test, e2e, memory');
    });
    
    test('should handle missing required parameters', async () => {
      const { code, stderr } = await runner.runCommand([
        'memory', 'store',
        '--key', 'missing-value'
        // Missing required --value parameter
      ]);
      
      expect(code).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
  });
  
  describe('memory query command', () => {
    beforeEach(async () => {
      // Create memories for testing query
      await runner.runCommand([
        'memory', 'store',
        '--key', 'project-requirements',
        '--value', 'Requirements for the test project',
        '--type', 'user'
      ]);
      
      await runner.runCommand([
        'memory', 'store',
        '--key', 'architecture-decision',
        '--value', 'Using microservices for the project architecture',
        '--type', 'user',
        '--tags', 'architecture,decision,important'
      ]);
    });
    
    test('should query memories by search term', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'query',
        '--search', 'project'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Query Results');
      expect(stdout).toContain('project-result-1');
    });
    
    test('should limit query results', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'query',
        '--search', 'architecture',
        '--limit', '3'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('architecture-result-1');
    });
    
    test('should filter by type', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'query',
        '--search', 'project',
        '--type', 'user'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('project-result-1');
    });
  });
  
  describe('memory list command', () => {
    beforeEach(async () => {
      // Create memories for testing list
      await runner.runCommand([
        'memory', 'store',
        '--key', 'list-test-1',
        '--value', 'First test memory for listing',
        '--type', 'user'
      ]);
      
      await runner.runCommand([
        'memory', 'store',
        '--key', 'list-test-2',
        '--value', 'Second test memory for listing',
        '--type', 'system'
      ]);
    });
    
    test('should list all memories', async () => {
      const { stdout, code } = await runner.runCommand('memory list');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Memory Entries');
      expect(stdout).toContain('list-test-1');
      expect(stdout).toContain('list-test-2');
    });
    
    test('should filter memories by type', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'list',
        '--type', 'user'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Memory Entries');
      expect(stdout).toContain('list-test-1');
      expect(stdout).not.toContain('list-test-2');
    });
    
    test('should limit the number of memories shown', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'list',
        '--limit', '1'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Memory Entries');
      expect(stdout).toContain('Found 1 memories');
    });
    
    test('should support JSON output format', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'list',
        '--format', 'json'
      ]);
      
      expect(code).toBe(0);
      
      // Parse JSON output
      const memories = runner.parseJsonOutput(stdout);
      expect(memories).not.toBeNull();
      expect(Array.isArray(memories)).toBe(true);
      expect(memories.length).toBeGreaterThanOrEqual(2);
      
      // Verify memory structure
      const memory = memories[0];
      expect(memory).toHaveProperty('id');
      expect(memory).toHaveProperty('type');
      expect(memory).toHaveProperty('content');
      expect(memory).toHaveProperty('context');
    });
  });
  
  describe('memory stats command', () => {
    test('should show memory statistics', async () => {
      const { stdout, code } = await runner.runCommand('memory stats');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Memory System Statistics');
      expect(stdout).toContain('Total Entries');
      expect(stdout).toContain('Status');
    });
    
    test('should show detailed statistics', async () => {
      const { stdout, code } = await runner.runCommand('memory stats --detailed');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Memory System Statistics');
      // Detailed stats would have more metrics, but exact ones depend on implementation
    });
  });
  
  describe('memory clear command', () => {
    beforeEach(async () => {
      // Create memories for testing clear
      await runner.runCommand([
        'memory', 'store',
        '--key', 'clear-test-1',
        '--value', 'Memory to be cleared',
        '--type', 'user'
      ]);
      
      await runner.runCommand([
        'memory', 'store',
        '--key', 'clear-test-2',
        '--value', 'Another memory to be cleared',
        '--type', 'system'
      ]);
    });
    
    test('should require confirmation for clear', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'clear'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Use --confirm to proceed');
    });
    
    test('should clear memories with confirmation', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'clear',
        '--confirm'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Cleared');
    });
    
    test('should clear specific memory by key', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'clear',
        '--key', 'clear-test-1'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Deleted memory');
      expect(stdout).toContain('clear-test-1');
    });
    
    test('should clear memories by type', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'clear',
        '--type', 'user',
        '--confirm'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Cleared');
      
      // Verify that only user memories were cleared
      const listResult = await runner.runCommand([
        'memory', 'list',
        '--type', 'user'
      ]);
      
      expect(listResult.stdout).toContain('No memories found');
    });
  });
  
  describe('error handling', () => {
    test('should handle invalid query parameters', async () => {
      const { code, stderr } = await runner.runCommand([
        'memory', 'query'
        // Missing required --search parameter
      ]);
      
      expect(code).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
    
    test('should handle non-existent memory key', async () => {
      const { stdout, code } = await runner.runCommand([
        'memory', 'clear',
        '--key', 'non-existent-key'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('No memory found with key');
    });
  });
});
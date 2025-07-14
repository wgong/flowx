/**
 * End-to-end tests for swarm commands
 * Tests swarm creation, management, and execution
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';
import * as path from 'path';

describe('Swarm Commands E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({ 
      debug: true,
      timeout: 60000 // Longer timeout for swarm operations
    });
    await runner.setup();
  });
  
  afterEach(async () => {
    await runner.teardown();
  });
  
  describe('swarm help command', () => {
    test('should show swarm help information', async () => {
      const { stdout, code } = await runner.runCommand('swarm --help');
      
      expect(code).toBe(0);
      expect(stdout).toContain('swarm');
      expect(stdout).toContain('COMMANDS');
      expect(stdout).toContain('OPTIONS');
    });
  });
  
  describe('swarm create command', () => {
    test('should create a new swarm', async () => {
      const { stdout, code } = await runner.runCommand([
        'swarm',
        '"Create a simple hello world application"',
        '--test-mode', // Use test mode to avoid real execution
        '--output-dir', runner.tempDir
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm created');
      
      // Extract swarm ID for further tests
      const swarmId = runner.extractId(stdout);
      expect(swarmId).not.toBeNull();
      
      return { swarmId };
    });
    
    test('should create swarm with custom strategy', async () => {
      const { stdout, code } = await runner.runCommand([
        'swarm',
        '"Analyze code quality metrics"',
        '--strategy', 'research',
        '--test-mode', // Use test mode to avoid real execution
        '--output-dir', runner.tempDir
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm created');
      expect(stdout).toContain('research');
      
      // Extract swarm ID for further tests
      const swarmId = runner.extractId(stdout);
      expect(swarmId).not.toBeNull();
      
      return { swarmId };
    });
    
    test('should support parallel execution mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'swarm',
        '"Build a REST API"',
        '--parallel',
        '--max-agents', '3',
        '--test-mode', // Use test mode to avoid real execution
        '--output-dir', runner.tempDir
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm created');
      expect(stdout).toContain('parallel');
    });
  });
  
  describe('swarm status command', () => {
    let swarmId;
    
    beforeEach(async () => {
      // Create a swarm for testing
      const createResult = await runner.runCommand([
        'swarm',
        '"Create a test application"',
        '--test-mode',
        '--output-dir', runner.tempDir
      ]);
      
      swarmId = runner.extractId(createResult.stdout);
    });
    
    test('should check swarm status', async () => {
      // Skip if no swarm ID was found
      if (!swarmId) {
        console.log('Skipping test: No swarm ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'swarm', 'status',
        swarmId
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm Status');
      expect(stdout).toContain(swarmId);
    });
    
    test('should support JSON output format', async () => {
      // Skip if no swarm ID was found
      if (!swarmId) {
        console.log('Skipping test: No swarm ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'swarm', 'status',
        swarmId,
        '--format', 'json'
      ]);
      
      expect(code).toBe(0);
      
      // Parse JSON output
      const status = runner.parseJsonOutput(stdout);
      expect(status).not.toBeNull();
      expect(status.id).toBe(swarmId);
    });
  });
  
  describe('swarm list command', () => {
    beforeEach(async () => {
      // Create a few swarms for testing
      await runner.runCommand([
        'swarm',
        '"Create a web application"',
        '--test-mode',
        '--output-dir', runner.tempDir
      ]);
      
      await runner.runCommand([
        'swarm',
        '"Create a mobile application"',
        '--test-mode',
        '--output-dir', runner.tempDir
      ]);
    });
    
    test('should list all swarms', async () => {
      const { stdout, code } = await runner.runCommand('swarm list');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm List');
      expect(stdout).toContain('web application');
      expect(stdout).toContain('mobile application');
    });
    
    test('should filter swarms by status', async () => {
      const { stdout, code } = await runner.runCommand([
        'swarm', 'list',
        '--status', 'active'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm List');
    });
  });
  
  describe('swarm stop command', () => {
    let swarmId;
    
    beforeEach(async () => {
      // Create a swarm for testing
      const createResult = await runner.runCommand([
        'swarm',
        '"Create a test application for stopping"',
        '--test-mode',
        '--output-dir', runner.tempDir
      ]);
      
      swarmId = runner.extractId(createResult.stdout);
    });
    
    test('should stop a running swarm', async () => {
      // Skip if no swarm ID was found
      if (!swarmId) {
        console.log('Skipping test: No swarm ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'swarm', 'stop',
        swarmId
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm stopped');
      expect(stdout).toContain(swarmId);
    });
  });
  
  describe('swarm resume command', () => {
    let swarmId;
    
    beforeEach(async () => {
      // Create a swarm for testing
      const createResult = await runner.runCommand([
        'swarm',
        '"Create a test application for resuming"',
        '--test-mode',
        '--output-dir', runner.tempDir
      ]);
      
      swarmId = runner.extractId(createResult.stdout);
      
      // Stop the swarm
      if (swarmId) {
        await runner.runCommand([
          'swarm', 'stop',
          swarmId
        ]);
      }
    });
    
    test('should resume a stopped swarm', async () => {
      // Skip if no swarm ID was found
      if (!swarmId) {
        console.log('Skipping test: No swarm ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'swarm', 'resume',
        swarmId
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm resumed');
      expect(stdout).toContain(swarmId);
    });
  });
  
  describe('swarm results command', () => {
    let swarmId;
    
    beforeEach(async () => {
      // Create a swarm for testing
      const createResult = await runner.runCommand([
        'swarm',
        '"Create a hello world application"',
        '--test-mode',
        '--output-dir', runner.tempDir
      ]);
      
      swarmId = runner.extractId(createResult.stdout);
      
      // Create a mock result file
      if (swarmId) {
        await runner.createFile(
          path.join('swarm-results', `${swarmId}`, 'results.json'),
          JSON.stringify({
            objective: 'Create a hello world application',
            status: 'completed',
            tasks: [
              { id: 'task-1', status: 'completed', result: 'Success' }
            ]
          })
        );
      }
    });
    
    test('should show swarm results', async () => {
      // Skip if no swarm ID was found
      if (!swarmId) {
        console.log('Skipping test: No swarm ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'swarm', 'results',
        swarmId
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Swarm Results');
      expect(stdout).toContain(swarmId);
    });
  });
  
  describe('error handling', () => {
    test('should handle invalid swarm ID', async () => {
      const invalidId = 'invalid-swarm-id';
      const { code, stderr } = await runner.runCommand([
        'swarm', 'status',
        invalidId
      ]);
      
      expect(code).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
    
    test('should validate objective description', async () => {
      const { code, stderr } = await runner.runCommand([
        'swarm',
        '', // Empty objective
        '--test-mode'
      ]);
      
      expect(code).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
  });
});
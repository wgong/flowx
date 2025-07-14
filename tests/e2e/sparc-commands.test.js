/**
 * End-to-end tests for SPARC commands
 * Tests SPARC methodology modes, batch execution, and mode list
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';

describe('SPARC Commands E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({ 
      debug: true,
      timeout: 60000 // Longer timeout for SPARC operations
    });
    await runner.setup();
  });
  
  afterEach(async () => {
    await runner.teardown();
  });
  
  describe('sparc help command', () => {
    test('should show sparc help information', async () => {
      const { stdout, code } = await runner.runCommand('sparc --help');
      
      expect(code).toBe(0);
      expect(stdout).toContain('sparc');
      expect(stdout).toContain('COMMANDS');
      expect(stdout).toContain('OPTIONS');
    });
  });
  
  describe('sparc list command', () => {
    test('should list available SPARC modes', async () => {
      const { stdout, code } = await runner.runCommand('sparc list');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Available SPARC Modes');
      expect(stdout).toContain('architect');
      expect(stdout).toContain('code');
      expect(stdout).toContain('tdd');
      expect(stdout).toContain('review');
      expect(stdout).toContain('debug');
      expect(stdout).toContain('docs');
      expect(stdout).toContain('security');
      expect(stdout).toContain('batch');
    });
  });
  
  describe('sparc architect mode', () => {
    test('should execute architect mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'architect',
        '"Design user authentication system"',
        '--dry-run' // Use dry run to avoid actual execution
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: architect');
      expect(stdout).toContain('Task: Design user authentication system');
    });
    
    test('should fail without task description', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'architect'
      ]);
      
      expect(code).not.toBe(0);
      expect(stdout).toContain('Task description required');
    });
  });
  
  describe('sparc code mode', () => {
    test('should execute code mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'code',
        '"Implement REST API endpoints"',
        '--dry-run' // Use dry run to avoid actual execution
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: code');
      expect(stdout).toContain('Task: Implement REST API endpoints');
    });
    
    test('should support custom namespace', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'code',
        '"Implement auth module"',
        '--namespace', 'auth-project',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Namespace: auth-project');
    });
  });
  
  describe('sparc tdd mode', () => {
    test('should execute tdd mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'tdd',
        '"Create test suite for user service"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: tdd');
      expect(stdout).toContain('Task: Create test suite for user service');
    });
  });
  
  describe('sparc review mode', () => {
    test('should execute review mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'review',
        '"Code review for authentication module"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: review');
    });
  });
  
  describe('sparc debug mode', () => {
    test('should execute debug mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'debug',
        '"Debug login flow issues"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: debug');
    });
  });
  
  describe('sparc docs mode', () => {
    test('should execute docs mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'docs',
        '"Generate API documentation"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: docs');
    });
  });
  
  describe('sparc security mode', () => {
    test('should execute security mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'security',
        '"Security review for payment processing"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: security');
    });
  });
  
  describe('sparc batch mode', () => {
    test('should execute batch mode with specified modes', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'batch',
        '--modes', 'architect,code,tdd',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Would execute modes:');
      expect(stdout).toContain('architect');
      expect(stdout).toContain('code');
      expect(stdout).toContain('tdd');
    });
    
    test('should support parallel execution flag', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'batch',
        '--modes', 'architect,code',
        '--parallel',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Parallel: enabled');
    });
  });
  
  describe('sparc direct invocation', () => {
    test('should execute specified mode with task', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'architect',
        '"Design database schema"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('DRY RUN');
      expect(stdout).toContain('Mode: architect');
      expect(stdout).toContain('Task: Design database schema');
    });
    
    test('should show mode list with no arguments', async () => {
      const { stdout, code } = await runner.runCommand('sparc');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Available SPARC Modes');
    });
  });
  
  describe('error handling', () => {
    test('should handle invalid mode gracefully', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'invalid-mode',
        '"Some task"'
      ]);
      
      expect(code).not.toBe(0);
      expect(stdout).toContain('Unknown SPARC mode');
    });
    
    test('should require task description for mode execution', async () => {
      const { stdout, code } = await runner.runCommand([
        'sparc', 'code'
        // Missing task description
      ]);
      
      expect(code).not.toBe(0);
      expect(stdout).toContain('Task description required');
    });
  });
});
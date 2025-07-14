/**
 * End-to-end tests for system commands
 * Tests status, health, config, and other system-level commands
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';

describe('System Commands E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({ debug: true });
    await runner.setup();
  });
  
  afterEach(async () => {
    await runner.teardown();
  });
  
  describe('help command', () => {
    test('should show main help information', async () => {
      const { stdout, code } = await runner.runCommand('--help');
      
      expect(code).toBe(0);
      expect(stdout).toContain('COMMANDS');
      expect(stdout).toContain('OPTIONS');
      
      // Check for key commands
      expect(stdout).toContain('status');
      expect(stdout).toContain('agent');
      expect(stdout).toContain('swarm');
      expect(stdout).toContain('memory');
      expect(stdout).toContain('task');
    });
    
    test('should show command-specific help', async () => {
      const { stdout, code } = await runner.runCommand('status --help');
      
      expect(code).toBe(0);
      expect(stdout).toContain('status');
      expect(stdout).toContain('OPTIONS');
    });
  });
  
  describe('status command', () => {
    test('should show system status', async () => {
      const { stdout, code } = await runner.runCommand('status');
      
      expect(code).toBe(0);
      expect(stdout).toContain('System Status');
      
      // Check for key status components
      expect(stdout).toMatch(/Version|version/);
    });
    
    test('should support JSON output format', async () => {
      const { stdout, code } = await runner.runCommand('status --format json');
      
      expect(code).toBe(0);
      
      // Parse JSON output
      const status = runner.parseJsonOutput(stdout);
      expect(status).not.toBeNull();
      
      // Check basic structure
      expect(status).toHaveProperty('version');
      expect(status).toHaveProperty('environment');
    });
  });
  
  describe('config command', () => {
    test('should create configuration file', async () => {
      const configPath = `${runner.tempDir}/test-config.json`;
      const { stdout, code } = await runner.runCommand(`config init ${configPath}`);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Configuration file created');
      
      // Verify file exists and is valid JSON
      const configContent = await runner.readFile('test-config.json');
      const config = JSON.parse(configContent);
      
      expect(config).toHaveProperty('orchestrator');
      expect(config).toHaveProperty('memory');
    });
    
    test('should validate configuration', async () => {
      // Create valid config file
      const configPath = await runner.createFile('valid-config.json', JSON.stringify({
        orchestrator: {
          maxConcurrentAgents: 5,
          taskQueueSize: 100
        },
        memory: {
          backend: 'sqlite',
          cacheSizeMB: 100
        }
      }));
      
      const { stdout, code } = await runner.runCommand(`config validate ${configPath}`);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Configuration is valid');
    });
    
    test('should detect invalid configuration', async () => {
      // Create invalid config file
      const configPath = await runner.createFile('invalid-config.json', JSON.stringify({
        orchestrator: {
          maxConcurrentAgents: -5, // Invalid value
          taskQueueSize: -100 // Invalid value
        },
        memory: {
          backend: 'unknown', // Invalid backend type
        }
      }));
      
      const { stdout, code } = await runner.runCommand(`config validate ${configPath}`);
      
      // Should fail validation
      expect(code).not.toBe(0);
      expect(stdout).toContain('invalid');
    });
  });
  
  describe('health command', () => {
    test('should check system health', async () => {
      const { stdout, code } = await runner.runCommand('health');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Health Status');
    });
  });
  
  describe('version command', () => {
    test('should display version information', async () => {
      const { stdout, code } = await runner.runCommand('--version');
      
      expect(code).toBe(0);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Version pattern
    });
  });
  
  describe('services command', () => {
    test('should list available services', async () => {
      const { stdout, code } = await runner.runCommand('services list');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Services');
    });
  });
  
  describe('error handling', () => {
    test('should handle invalid command gracefully', async () => {
      const { code, stderr } = await runner.runCommand('invalid-command');
      
      expect(code).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
    
    test('should handle missing required arguments', async () => {
      const { code, stderr } = await runner.runCommand('config validate'); // Missing path argument
      
      expect(code).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
  });
});
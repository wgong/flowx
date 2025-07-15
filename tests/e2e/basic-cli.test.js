/**
 * Basic CLI E2E Tests
 * Simple tests for the current flowx CLI using component testing
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base.js';

describe('Basic CLI E2E Tests', () => {
  let runner;

  beforeEach(async () => {
    runner = createCommandTestRunner({
      debug: false,
      timeout: 8000
    });
    await runner.setup();
  });

  afterEach(async () => {
    await runner.teardown();
  });

  describe('Basic Commands', () => {
    it('should show help information', async () => {
      const result = await runner.runCommand(['--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('flowx');
      expect(result.stdout).toContain('USAGE');
    });

    it('should show version information', async () => {
      const result = await runner.runCommand(['--version']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('flowx v');
    });

    it('should handle unknown commands', async () => {
      const result = await runner.runCommand(['unknown-command']);
      
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('Unknown command');
    });
  });

  describe('System Commands', () => {
    it('should execute status command', async () => {
      const result = await runner.runCommand(['status']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('System Status');
    });

    it('should execute health command', async () => {
      const result = await runner.runCommand(['health']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Health Status');
    });

    it('should execute config show command', async () => {
      const result = await runner.runCommand(['config', 'show']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Configuration');
    });
  });

  describe('Help Commands', () => {
    it('should show agent command help', async () => {
      const result = await runner.runCommand(['agent', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('agent command help');
    });

    it('should show task command help', async () => {
      const result = await runner.runCommand(['task', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('task command help');
    });

    it('should show memory command help', async () => {
      const result = await runner.runCommand(['memory', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('memory command help');
    });

    it('should show swarm command help', async () => {
      const result = await runner.runCommand(['swarm', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('swarm command help');
    });

    it('should show workflow command help', async () => {
      const result = await runner.runCommand(['workflow', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('workflow command help');
    });

    it('should show sparc command help', async () => {
      const result = await runner.runCommand(['sparc', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('sparc command help');
    });

    it('should show config command help', async () => {
      const result = await runner.runCommand(['config', '--help']);
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('config command help');
    });
  });

  describe('JSON Output', () => {
    it('should support JSON format for status', async () => {
      const result = await runner.runCommand(['status', '--format', 'json']);
      
      expect(result.success).toBe(true);
      
      const parsed = runner.parseJsonOutput(result.stdout);
      expect(parsed).not.toBeNull();
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('health');
    });

    it('should support JSON format for config show', async () => {
      const result = await runner.runCommand(['config', 'show', '--format', 'json']);
      
      expect(result.success).toBe(true);
      
      const parsed = runner.parseJsonOutput(result.stdout);
      expect(parsed).not.toBeNull();
      expect(parsed).toHaveProperty('orchestrator');
      expect(parsed).toHaveProperty('memory');
    });
  });
}); 
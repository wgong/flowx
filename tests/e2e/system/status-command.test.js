/**
 * E2E tests for the system status command
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';

describe('System Status Command E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({
      debug: false,
      timeout: 10000
    });
    await runner.setup();
  });
  
  afterEach(async () => {
    await runner.cleanup();
  });
  
  test('should show basic status information', async () => {
    const { stdout, code } = await runner.runCommand(['system', 'status']);
    
    expect(code).toBe(0);
    expect(stdout).toContain('Claude Flow System Status');
    expect(stdout).toContain('Overall Health:');
    expect(stdout).toContain('System Uptime:');
    expect(stdout).toContain('Services:');
  });
  
  test('should support detailed mode', async () => {
    const { stdout, code } = await runner.runCommand(['system', 'status', '--detailed']);
    
    expect(code).toBe(0);
    expect(stdout).toContain('System Resources:');
    expect(stdout).toContain('CPU:');
    expect(stdout).toContain('Memory:');
    expect(stdout).toContain('Disk:');
  });
  
  test('should output JSON format when requested', async () => {
    const { stdout, code } = await runner.runCommand(['system', 'status', '--json']);
    
    expect(code).toBe(0);
    
    // Should be valid JSON
    expect(() => JSON.parse(stdout)).not.toThrow();
    
    const status = JSON.parse(stdout);
    expect(status).toHaveProperty('timestamp');
    expect(status).toHaveProperty('uptime');
    expect(status).toHaveProperty('services');
    expect(status).toHaveProperty('resources');
    expect(status).toHaveProperty('health');
  });
  
  test('should filter to specific sections when flags provided', async () => {
    // Resources only
    const resourcesResult = await runner.runCommand(['system', 'status', '--resources']);
    expect(resourcesResult.code).toBe(0);
    expect(resourcesResult.stdout).toContain('System Resources:');
    expect(resourcesResult.stdout).not.toContain('Services:');
    
    // Agents only (may be empty in test environment)
    const agentsResult = await runner.runCommand(['system', 'status', '--agents']);
    expect(agentsResult.code).toBe(0);
    
    // Test might not have actual services/agents running
    // Just ensure the command executes successfully
  });
  
  test('should handle errors gracefully', async () => {
    // Force an error by using an invalid option
    const { stderr, code } = await runner.runCommand(['system', 'status', '--invalid-option']);
    
    expect(code).not.toBe(0);
    expect(stderr).toContain('error');
  });
});
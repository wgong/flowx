/**
 * E2E tests for swarm commands
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('Swarm Commands E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({
      debug: false,
      timeout: 30000
    });
    await runner.setup();
  });
  
  afterEach(async () => {
    await runner.cleanup();
  });
  
  test('should create and execute a basic swarm', async () => {
    const { stdout, code } = await runner.runCommand([
      'swarm', 
      '"Research test topic"', 
      '--strategy', 'research',
      '--max-agents', '2',
      '--test-mode'
    ]);
    
    expect(code).toBe(0);
    expect(stdout).toContain('Swarm initialized');
    expect(stdout).toContain('Strategy: research');
  });
  
  test('should support different swarm strategies', async () => {
    // Test development strategy
    const devResult = await runner.runCommand([
      'swarm', 
      '"Build test feature"', 
      '--strategy', 'development',
      '--test-mode'
    ]);
    
    expect(devResult.code).toBe(0);
    expect(devResult.stdout).toContain('Strategy: development');
    
    // Test analysis strategy
    const analysisResult = await runner.runCommand([
      'swarm', 
      '"Analyze test data"', 
      '--strategy', 'analysis',
      '--test-mode'
    ]);
    
    expect(analysisResult.code).toBe(0);
    expect(analysisResult.stdout).toContain('Strategy: analysis');
  });
  
  test('should support different swarm modes', async () => {
    // Test centralized mode
    const centralizedResult = await runner.runCommand([
      'swarm', 
      '"Test centralized mode"', 
      '--mode', 'centralized',
      '--test-mode'
    ]);
    
    expect(centralizedResult.code).toBe(0);
    expect(centralizedResult.stdout).toContain('Mode: centralized');
    
    // Test distributed mode
    const distributedResult = await runner.runCommand([
      'swarm', 
      '"Test distributed mode"', 
      '--mode', 'distributed',
      '--test-mode'
    ]);
    
    expect(distributedResult.code).toBe(0);
    expect(distributedResult.stdout).toContain('Mode: distributed');
  });
  
  test('should handle parallel execution flag', async () => {
    const result = await runner.runCommand([
      'swarm', 
      '"Test parallel execution"', 
      '--parallel',
      '--test-mode'
    ]);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Parallel execution: enabled');
  });
  
  test('should handle max-agents parameter', async () => {
    const result = await runner.runCommand([
      'swarm', 
      '"Test with custom agent count"', 
      '--max-agents', '5',
      '--test-mode'
    ]);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Max agents: 5');
  });
  
  test('should handle monitor flag', async () => {
    const result = await runner.runCommand([
      'swarm', 
      '"Test with monitoring"', 
      '--monitor',
      '--test-mode'
    ]);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Monitoring: enabled');
  });
  
  test('should handle output format parameter', async () => {
    // Test JSON output
    const jsonResult = await runner.runCommand([
      'swarm', 
      '"Test with JSON output"', 
      '--output', 'json',
      '--test-mode'
    ]);
    
    expect(jsonResult.code).toBe(0);
    expect(jsonResult.stdout).toContain('Output format: json');
    
    // Test CSV output
    const csvResult = await runner.runCommand([
      'swarm', 
      '"Test with CSV output"', 
      '--output', 'csv',
      '--test-mode'
    ]);
    
    expect(csvResult.code).toBe(0);
    expect(csvResult.stdout).toContain('Output format: csv');
  });
  
  test('should handle invalid parameters gracefully', async () => {
    // Test invalid strategy
    const invalidStrategy = await runner.runCommand([
      'swarm', 
      '"Test with invalid strategy"', 
      '--strategy', 'invalid-strategy',
      '--test-mode'
    ]);
    
    expect(invalidStrategy.code).not.toBe(0);
    expect(invalidStrategy.stderr).toContain('Invalid strategy');
    
    // Test invalid mode
    const invalidMode = await runner.runCommand([
      'swarm', 
      '"Test with invalid mode"', 
      '--mode', 'invalid-mode',
      '--test-mode'
    ]);
    
    expect(invalidMode.code).not.toBe(0);
    expect(invalidMode.stderr).toContain('Invalid mode');
  });
  
  test('should run swarm demo command', async () => {
    const result = await runner.runCommand([
      'swarm', 'demo',
      '--test-mode'
    ]);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Swarm Demo');
  });
  
  test('should list active swarms', async () => {
    // Create a swarm first
    await runner.runCommand([
      'swarm',
      '"Test swarm for listing"',
      '--test-mode'
    ]);
    
    // List swarms
    const listResult = await runner.runCommand([
      'swarm', 'list',
      '--test-mode'
    ]);
    
    expect(listResult.code).toBe(0);
    expect(listResult.stdout).toContain('Active Swarms');
    // In test mode, we might not have real swarms to list
  });
  
  test('should show swarm status', async () => {
    // Create a swarm with ID first
    const createResult = await runner.runCommand([
      'swarm',
      '"Test swarm for status"',
      '--test-mode'
    ]);
    
    // Extract swarm ID from output
    const idMatch = createResult.stdout.match(/Swarm ID: ([a-z0-9-]+)/i);
    const swarmId = idMatch ? idMatch[1] : 'test-id';
    
    // Check status
    const statusResult = await runner.runCommand([
      'swarm', 'status',
      swarmId,
      '--test-mode'
    ]);
    
    expect(statusResult.code).toBe(0);
    expect(statusResult.stdout).toContain('Swarm Status');
    // In test mode, we might not have real status to show
  });
  
  test('should handle complex swarm configurations', async () => {
    // Create temporary config file
    const configData = {
      objective: 'Test complex swarm config',
      strategy: 'analysis',
      mode: 'hierarchical',
      maxAgents: 4,
      parallel: true,
      agents: [
        { type: 'researcher', name: 'Research Agent' },
        { type: 'analyzer', name: 'Analysis Agent' }
      ]
    };
    
    const configPath = path.join(runner.tempDir(), 'swarm-config.json');
    await fs.writeFile(configPath, JSON.stringify(configData, null, 2));
    
    // Run swarm with config file
    const result = await runner.runCommand([
      'swarm',
      '--config', configPath,
      '--test-mode'
    ]);
    
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Swarm initialized');
    expect(result.stdout).toContain('Strategy: analysis');
  });
});
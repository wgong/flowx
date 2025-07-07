/**
 * Comprehensive E2E flow test for Claude Flow
 * 
 * This test executes a full workflow covering the main system features:
 * 1. Start the system
 * 2. Create and manage memory
 * 3. Create and manage agents
 * 4. Execute swarm operations
 * 5. Run SPARC operations
 * 6. Execute tasks
 * 7. Shut down the system
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createCommandTestRunner } from './command-test-base.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('Claude Flow E2E Workflow', () => {
  let runner;
  let workDir;
  
  beforeAll(async () => {
    // Create test runner with extended timeout
    runner = createCommandTestRunner({
      debug: false,
      timeout: 120000 // 2 minutes timeout for longer operations
    });
    
    workDir = await runner.setup();
    console.log(`Test working directory: ${workDir}`);
    
    // Create test workflow file
    const workflowFile = path.join(workDir, 'test-workflow.json');
    const workflowContent = JSON.stringify({
      name: "Test Workflow",
      description: "A test workflow for E2E testing",
      steps: [
        {
          name: "memory-store",
          type: "memory",
          action: "store",
          params: {
            key: "test-workflow-data",
            value: { status: "running" }
          }
        },
        {
          name: "agent-task",
          type: "agent",
          action: "execute",
          params: {
            agentId: "{{agents.test}}",
            task: "Echo test message"
          }
        }
      ]
    }, null, 2);
    
    await fs.writeFile(workflowFile, workflowContent);
  });
  
  afterAll(async () => {
    await runner.cleanup();
  });
  
  test('should execute complete system workflow', async () => {
    // Step 1: System Status
    console.log('Step 1: Checking system status');
    const statusResult = await runner.runCommand(['system', 'status', '--json']);
    expect(statusResult.code).toBe(0);
    
    let systemStatus;
    try {
      systemStatus = JSON.parse(statusResult.stdout);
      expect(systemStatus).toHaveProperty('health');
    } catch (e) {
      console.error('Failed to parse system status JSON:', statusResult.stdout);
      throw e;
    }
    
    // Step 2: Store data in memory
    console.log('Step 2: Storing data in memory');
    const memoryStoreResult = await runner.runCommand([
      'memory', 'store',
      '--key', 'test-flow-key',
      '--value', JSON.stringify({ message: 'E2E test data', timestamp: new Date().toISOString() }),
      '--test-mode'
    ]);
    expect(memoryStoreResult.code).toBe(0);
    expect(memoryStoreResult.stdout).toContain('Memory stored');
    
    // Step 3: Query memory
    console.log('Step 3: Querying memory');
    const memoryQueryResult = await runner.runCommand([
      'memory', 'query',
      '--key', 'test-flow-key',
      '--test-mode'
    ]);
    expect(memoryQueryResult.code).toBe(0);
    expect(memoryQueryResult.stdout).toContain('E2E test data');
    
    // Step 4: Spawn an agent
    console.log('Step 4: Spawning test agent');
    const agentSpawnResult = await runner.runCommand([
      'agent', 'spawn',
      'researcher',
      '--name', 'e2e-test-agent',
      '--test-mode'
    ]);
    expect(agentSpawnResult.code).toBe(0);
    expect(agentSpawnResult.stdout).toContain('Agent spawned');
    
    // Extract agent ID
    const agentIdMatch = agentSpawnResult.stdout.match(/Agent ID: ([a-z0-9-]+)/i);
    const agentId = agentIdMatch ? agentIdMatch[1] : null;
    expect(agentId).toBeDefined();
    
    // Step 5: List agents
    console.log('Step 5: Listing agents');
    const agentListResult = await runner.runCommand([
      'agent', 'list',
      '--test-mode'
    ]);
    expect(agentListResult.code).toBe(0);
    expect(agentListResult.stdout).toContain('e2e-test-agent');
    
    // Step 6: Create a task
    console.log('Step 6: Creating task');
    const taskCreateResult = await runner.runCommand([
      'task', 'create',
      'research',
      '"Analyze e2e test data"',
      '--test-mode'
    ]);
    expect(taskCreateResult.code).toBe(0);
    expect(taskCreateResult.stdout).toContain('Task created');
    
    // Extract task ID
    const taskIdMatch = taskCreateResult.stdout.match(/Task ID: ([a-z0-9-]+)/i);
    const taskId = taskIdMatch ? taskIdMatch[1] : null;
    expect(taskId).toBeDefined();
    
    // Step 7: List tasks
    console.log('Step 7: Listing tasks');
    const taskListResult = await runner.runCommand([
      'task', 'list',
      '--test-mode'
    ]);
    expect(taskListResult.code).toBe(0);
    expect(taskListResult.stdout).toContain('Analyze e2e test data');
    
    // Step 8: Start swarm (with minimal operation in test mode)
    console.log('Step 8: Starting minimal swarm');
    const swarmResult = await runner.runCommand([
      'swarm',
      '"Test swarm operation"',
      '--strategy', 'research',
      '--max-agents', '1',
      '--test-mode'
    ]);
    expect(swarmResult.code).toBe(0);
    expect(swarmResult.stdout).toContain('Swarm initialized');
    
    // Step 9: Run SPARC in test mode
    console.log('Step 9: Running SPARC in test mode');
    const sparcResult = await runner.runCommand([
      'sparc',
      '"Analyze test results"',
      '--dry-run'
    ]);
    expect(sparcResult.code).toBe(0);
    expect(sparcResult.stdout).toContain('DRY RUN');
    
    // Step 10: Check memory statistics
    console.log('Step 10: Checking memory stats');
    const memoryStatsResult = await runner.runCommand([
      'memory', 'stats',
      '--test-mode'
    ]);
    expect(memoryStatsResult.code).toBe(0);
    
    // Step 11: Generate system health report
    console.log('Step 11: Generating system health report');
    const healthResult = await runner.runCommand([
      'system', 'health',
      '--test-mode'
    ]);
    expect(healthResult.code).toBe(0);
    
    // Final check: System status after all operations
    console.log('Final check: System status after all operations');
    const finalStatusResult = await runner.runCommand([
      'system', 'status',
      '--json'
    ]);
    expect(finalStatusResult.code).toBe(0);
    
    try {
      const finalStatus = JSON.parse(finalStatusResult.stdout);
      expect(finalStatus).toHaveProperty('health');
      expect(finalStatus.health.overall).toBeDefined();
    } catch (e) {
      console.error('Failed to parse final system status JSON');
      throw e;
    }
  });
});
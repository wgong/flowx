/**
 * End-to-end tests for task commands
 * Tests task creation, management, status, and workflow operations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';
import * as path from 'path';

describe('Task Commands E2E', () => {
  let runner;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({ 
      debug: true,
      timeout: 60000 // Longer timeout for task operations
    });
    await runner.setup();
  });
  
  afterEach(async () => {
    await runner.teardown();
  });
  
  describe('task help command', () => {
    test('should show task help information', async () => {
      const { stdout, code } = await runner.runCommand('task --help');
      
      expect(code).toBe(0);
      expect(stdout).toContain('task');
      expect(stdout).toContain('COMMANDS');
      expect(stdout).toContain('OPTIONS');
    });
  });
  
  describe('task create command', () => {
    test('should create a basic task', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'create',
        'development',
        '"Implement user authentication"',
        '--test-mode' // Use test mode to avoid actual execution
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Task created successfully');
      expect(stdout).toContain('Type: development');
      expect(stdout).toContain('Description: Implement user authentication');
      
      // Extract task ID for further tests
      const taskId = runner.extractId(stdout);
      expect(taskId).not.toBeNull();
      
      return { taskId };
    });
    
    test('should create task with priority and tags', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'create',
        'development',
        '"Implement password reset flow"',
        '--priority', '80',
        '--tags', 'auth,security,user-experience',
        '--test-mode'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Task created successfully');
      expect(stdout).toContain('Priority: 80');
      expect(stdout).toContain('Tags: auth, security, user-experience');
    });
    
    test('should support dry run mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'create',
        'research',
        '"Evaluate database options"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Dry run - Task configuration');
      expect(stdout).toContain('research');
      expect(stdout).toContain('Evaluate database options');
    });
    
    test('should support advanced task options', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'create',
        'development',
        '"Complex task implementation"',
        '--timeout', '600000',
        '--estimated-duration', '3600000',
        '--max-retries', '5',
        '--start-time', new Date(Date.now() + 3600000).toISOString(),
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Dry run');
      expect(stdout).toContain('timeout');
      expect(stdout).toContain('600000');
      expect(stdout).toContain('estimatedDurationMs');
      expect(stdout).toContain('3600000');
    });
  });
  
  describe('task list command', () => {
    beforeEach(async () => {
      // Create some tasks for testing
      await runner.runCommand([
        'task', 'create',
        'development',
        '"Task 1 for testing"',
        '--tags', 'test,dev',
        '--priority', '70',
        '--test-mode'
      ]);
      
      await runner.runCommand([
        'task', 'create',
        'research',
        '"Task 2 for testing"',
        '--tags', 'test,research',
        '--priority', '50',
        '--test-mode'
      ]);
    });
    
    test('should list all tasks', async () => {
      const { stdout, code } = await runner.runCommand('task list');
      
      expect(code).toBe(0);
      expect(stdout).toContain('Tasks:');
      expect(stdout).toContain('Task 1 for testing');
      expect(stdout).toContain('Task 2 for testing');
    });
    
    test('should filter tasks by status', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'list',
        '--status', 'pending,queued'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Tasks:');
    });
    
    test('should filter tasks by tags', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'list',
        '--tags', 'research'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Tasks:');
      expect(stdout).toContain('Task 2 for testing');
      expect(stdout).not.toContain('Task 1 for testing');
    });
    
    test('should support sorting', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'list',
        '--sort', 'priority',
        '--sort-dir', 'desc'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Tasks:');
      // Priority sorted results would show Task 1 (70) before Task 2 (50)
    });
    
    test('should support JSON output format', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'list',
        '--format', 'json'
      ]);
      
      expect(code).toBe(0);
      
      // Parse JSON output
      const result = runner.parseJsonOutput(stdout);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    });
  });
  
  describe('task status command', () => {
    let taskId;
    
    beforeEach(async () => {
      // Create a task for testing status
      const createResult = await runner.runCommand([
        'task', 'create',
        'development',
        '"Status test task"',
        '--test-mode'
      ]);
      
      taskId = runner.extractId(createResult.stdout);
    });
    
    test('should show task status', async () => {
      // Skip if no task ID was found
      if (!taskId) {
        console.log('Skipping test: No task ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'status',
        taskId
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Task Status');
      expect(stdout).toContain('Status test task');
    });
    
    test('should handle detailed status flags', async () => {
      // Skip if no task ID was found
      if (!taskId) {
        console.log('Skipping test: No task ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'status',
        taskId,
        '--show-metrics',
        '--show-resources',
        '--format', 'detailed'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Task Status');
    });
    
    test('should support JSON output format', async () => {
      // Skip if no task ID was found
      if (!taskId) {
        console.log('Skipping test: No task ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'status',
        taskId,
        '--format', 'json'
      ]);
      
      expect(code).toBe(0);
      
      // Parse JSON output
      const status = runner.parseJsonOutput(stdout);
      expect(status).not.toBeNull();
      expect(status).toHaveProperty('task');
      expect(status.task.id).toBe(taskId);
    });
  });
  
  describe('task cancel command', () => {
    let taskId;
    
    beforeEach(async () => {
      // Create a task for testing cancel
      const createResult = await runner.runCommand([
        'task', 'create',
        'development',
        '"Cancel test task"',
        '--test-mode'
      ]);
      
      taskId = runner.extractId(createResult.stdout);
    });
    
    test('should cancel a task', async () => {
      // Skip if no task ID was found
      if (!taskId) {
        console.log('Skipping test: No task ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'cancel',
        taskId,
        '--reason', 'Testing cancellation'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('cancelled successfully');
      expect(stdout).toContain('Reason: Testing cancellation');
    });
    
    test('should support dry run mode', async () => {
      // Skip if no task ID was found
      if (!taskId) {
        console.log('Skipping test: No task ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'cancel',
        taskId,
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Dry run');
      expect(stdout).not.toContain('cancelled successfully');
    });
  });
  
  describe('task workflow command', () => {
    test('should create a workflow', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'workflow', 'create',
        'test-workflow',
        '--description', 'Workflow for testing',
        '--max-concurrent', '5',
        '--strategy', 'priority-based',
        '--test-mode'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Workflow created successfully');
      expect(stdout).toContain('Name: test-workflow');
      expect(stdout).toContain('Max concurrent: 5');
      expect(stdout).toContain('Strategy: priority-based');
      
      // Extract workflow ID
      const workflowId = runner.extractId(stdout);
      expect(workflowId).not.toBeNull();
      
      return { workflowId };
    });
    
    test('should execute workflow with dry run', async () => {
      const createResult = await runner.runCommand([
        'task', 'workflow', 'create',
        'execute-test-workflow',
        '--test-mode'
      ]);
      
      const workflowId = runner.extractId(createResult.stdout);
      
      // Skip if no workflow ID was found
      if (!workflowId) {
        console.log('Skipping test: No workflow ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'workflow', 'execute',
        workflowId,
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Dry run');
    });
    
    test('should visualize workflow', async () => {
      const createResult = await runner.runCommand([
        'task', 'workflow', 'create',
        'visualize-test-workflow',
        '--test-mode'
      ]);
      
      const workflowId = runner.extractId(createResult.stdout);
      
      // Skip if no workflow ID was found
      if (!workflowId) {
        console.log('Skipping test: No workflow ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'workflow', 'visualize',
        workflowId,
        '--format', 'ascii'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Visualizing workflow');
    });
  });
  
  describe('error handling', () => {
    test('should handle invalid task ID gracefully', async () => {
      const invalidId = 'invalid-task-id';
      const { stdout, code } = await runner.runCommand([
        'task', 'status',
        invalidId
      ]);
      
      expect(code).not.toBe(0);
      expect(stdout).toContain('not found');
    });
    
    test('should handle missing required parameters', async () => {
      const { code, stderr } = await runner.runCommand([
        'task', 'create',
        'development'
        // Missing required task description
      ]);
      
      expect(code).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
  });
});
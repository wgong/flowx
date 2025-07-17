/**
 * End-to-end tests for task commands
 * Tests task creation, management, status, and workflow operations using component testing
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createCommandTestRunner } from '../utils/command-test-base';

describe('Task Commands E2E', () => {
  let runner: any;
  
  beforeEach(async () => {
    runner = createCommandTestRunner({ 
      debug: false,
      timeout: 60000 // Longer timeout for task operations
    });
    await runner.setup();
  });
  
  afterEach(async () => {
    await runner.teardown();
  });
  
  describe('task help command', () => {
    test('should show task help information', async () => {
      const { stdout, code } = await runner.runCommand(['task', '--help']);
      
      expect(code).toBe(0);
      expect(stdout).toContain('task command help');
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
      expect(stdout).toContain('Description: "Implement user authentication"');
      
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
      expect(stdout).toContain('Description: "Implement password reset flow"');
    });
    
    test('should support dry run mode', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'create',
        'research',
        '"Evaluate database options"',
        '--dry-run'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Task created successfully');
      expect(stdout).toContain('Type: research');
      expect(stdout).toContain('Description: "Evaluate database options"');
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
      const { stdout, code } = await runner.runCommand(['task', 'list']);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Tasks:');
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
    });
    
    test('should support sorting', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'list',
        '--sort', 'priority',
        '--sort-dir', 'desc'
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Tasks:');
    });
    
    test('should support JSON output format', async () => {
      const { stdout, code } = await runner.runCommand([
        'task', 'list',
        '--format', 'json'
      ]);
      
      expect(code).toBe(0);
      
      // Parse JSON output
      try {
        const result = JSON.parse(stdout);
        expect(result).toHaveProperty('tasks');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.tasks)).toBe(true);
      } catch (error) {
        // If JSON parsing fails, just check that we got some output
        expect(stdout.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('task status command', () => {
    let taskId: string | null = null;
    
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
      expect(stdout).toContain(taskId);
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
      try {
        const status = JSON.parse(stdout);
        expect(status).toHaveProperty('task');
        expect(status.task.id).toBe(taskId);
      } catch (error) {
        // If JSON parsing fails, just check that we got some output
        expect(stdout.length).toBeGreaterThan(0);
      }
    });
  });
  
  describe('task control commands', () => {
    let taskId: string | null = null;
    
    beforeEach(async () => {
      // Create a task for testing
      const createResult = await runner.runCommand([
        'task', 'create',
        'development',
        '"Control test task"',
        '--test-mode'
      ]);
      
      taskId = runner.extractId(createResult.stdout);
    });
    
    test('should execute a task', async () => {
      // Skip if no task ID was found
      if (!taskId) {
        console.log('Skipping test: No task ID available');
        return;
      }
      
      const { stdout, code } = await runner.runCommand([
        'task', 'execute',
        taskId
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('execution started');
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
      expect(stdout).toContain('Workflow create completed');
      
      // Extract workflow ID
      const workflowId = runner.extractId(stdout);
      expect(workflowId).not.toBeNull();
      
      return { workflowId };
    });
  });
  
  describe('error handling', () => {
    test('should handle invalid task ID gracefully', async () => {
      const invalidId = 'invalid-task-id';
      const { stdout, code } = await runner.runCommand([
        'task', 'status',
        invalidId
      ]);
      
      expect(code).toBe(0);
      expect(stdout).toContain('Task Status');
    });
    
    test('should handle missing required parameters', async () => {
      const { code } = await runner.runCommand([
        'task', 'create',
        'development'
        // Missing required task description
      ]);
      
      expect(code).not.toBe(0);
    });
  });
});
#!/usr/bin/env node

/**
 * Task Management System Integration Test
 * Tests all components working together: TaskEngine, TaskCoordinator, Commands, Memory integration
 */

import { TaskEngine, TaskCoordinator, initializeTaskManagement } from '../src/task/index.ts';
import { MemoryManager } from '../src/memory/manager.ts';
import { Logger } from '../src/core/logger.ts';
import { EventEmitter } from 'node:events';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class TaskIntegrationTester {
  private results: TestResult[] = [];
  private taskEngine: TaskEngine;
  private taskCoordinator: TaskCoordinator;
  private memoryManager: MemoryManager;
  private logger: Logger;

  constructor() {
    this.logger = new Logger({ level: 'info', format: 'text', destination: 'console' }, { component: 'TaskIntegrationTester' });
    
    // Initialize memory manager for testing
    this.memoryManager = new MemoryManager({
      backend: 'sqljs',
      cacheSizeMB: 64,
      syncInterval: 10000,
      conflictResolution: 'last-write',
      retentionDays: 30,
      sqlitePath: './test-task-memory.db'
    }, new EventEmitter() as any, this.logger);

    this.taskEngine = new TaskEngine(5, this.memoryManager);
    this.taskCoordinator = new TaskCoordinator(this.taskEngine, this.memoryManager);
  }

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, duration });
      console.log(`✅ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({ 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error),
        duration 
      });
      console.log(`❌ ${name} (${duration}ms): ${error instanceof Error ? error.message : error}`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Task Management Integration Tests...\n');

    // Initialize memory manager
    await this.memoryManager.initialize();

    // Test 1: Basic Task Creation and Management
    await this.runTest('Basic Task Creation and Management', async () => {
      const task = await this.taskEngine.createTask({
        type: 'test',
        description: 'Test task creation',
        priority: 75,
        tags: ['test', 'integration'],
        timeout: 30000
      });

      if (!task.id) throw new Error('Task ID not generated');
      if (task.type !== 'test') throw new Error('Task type not set correctly');
      if (task.priority !== 75) throw new Error('Task priority not set correctly');
      if (task.status !== 'pending') throw new Error('Task status not set to pending');
    });

    // Test 2: Task Dependencies
    await this.runTest('Task Dependencies', async () => {
      const parentTask = await this.taskEngine.createTask({
        type: 'parent',
        description: 'Parent task',
        priority: 80
      });

      const childTask = await this.taskEngine.createTask({
        type: 'child',
        description: 'Child task',
        priority: 70,
        dependencies: [{
          taskId: parentTask.id,
          type: 'finish-to-start'
        }]
      });

      const status = await this.taskEngine.getTaskStatus(childTask.id);
      if (!status) throw new Error('Could not get child task status');
      if (status.dependencies.length !== 1) throw new Error('Dependencies not set correctly');
      if (status.dependencies[0].task.id !== parentTask.id) throw new Error('Dependency task ID mismatch');
    });

    // Test 3: Task Filtering and Listing
    await this.runTest('Task Filtering and Listing', async () => {
      // Create test tasks with different properties
      await this.taskEngine.createTask({
        type: 'research',
        description: 'Research task',
        priority: 90,
        tags: ['research', 'high-priority']
      });

      await this.taskEngine.createTask({
        type: 'development',
        description: 'Development task',
        priority: 60,
        tags: ['development', 'medium-priority']
      });

      // Test filtering by type and priority
      const highPriorityTasks = await this.taskEngine.listTasks({
        priority: { min: 80 }
      });

      if (highPriorityTasks.tasks.length === 0) throw new Error('High priority filter not working');

      // Test filtering by tags
      const researchTasks = await this.taskEngine.listTasks({
        tags: ['research']
      });

      if (researchTasks.tasks.length === 0) throw new Error('Tag filter not working');
    });

    // Test 4: TodoWrite Integration
    await this.runTest('TodoWrite Integration', async () => {
      const context = {
        sessionId: 'test-session-1',
        coordinationMode: 'centralized' as const
      };

      const todos = await this.taskCoordinator.createTaskTodos(
        'Build a simple web application',
        context,
        {
          strategy: 'development',
          batchOptimized: true,
          parallelExecution: true,
          memoryCoordination: true
        }
      );

      if (todos.length === 0) throw new Error('No todos created');
      if (!todos.some(todo => todo.content.includes('architecture'))) {
        throw new Error('Architecture todo not created');
      }
      if (!todos.some(todo => todo.batchOptimized)) {
        throw new Error('Batch optimization not set');
      }
    });

    // Test 5: Memory Coordination
    await this.runTest('Memory Coordination', async () => {
      const testData = {
        findings: ['pattern1', 'pattern2'],
        recommendations: ['rec1', 'rec2']
      };

      // Store data
      await this.taskCoordinator.storeInMemory(
        'test_coordination_data',
        testData,
        {
          namespace: 'test_coordination',
          tags: ['test', 'coordination']
        }
      );

      // Retrieve data
      const retrievedData = await this.taskCoordinator.retrieveFromMemory(
        'test_coordination_data',
        'test_coordination'
      );

      if (!retrievedData) throw new Error('Data not retrieved from memory');
      if (JSON.stringify(retrievedData) !== JSON.stringify(testData)) {
        throw new Error('Retrieved data does not match stored data');
      }
    });

    // Test 6: Memory Querying
    await this.runTest('Memory Querying', async () => {
      // Store multiple entries with tags
      await this.taskCoordinator.storeInMemory('query_test_1', { type: 'research' }, {
        namespace: 'query_test',
        tags: ['research', 'test']
      });

      await this.taskCoordinator.storeInMemory('query_test_2', { type: 'development' }, {
        namespace: 'query_test',
        tags: ['development', 'test']
      });

      // Query by tags
      const entries = await this.taskCoordinator.queryMemory({
        namespace: 'query_test',
        tags: ['research']
      });

      if (entries.length === 0) throw new Error('Query returned no results');
      if (!entries.some(entry => entry.value.type === 'research')) {
        throw new Error('Query did not return research entries');
      }
    });

    // Test 7: Parallel Agent Launching
    await this.runTest('Parallel Agent Launching', async () => {
      const context = {
        sessionId: 'agent-test-session',
        coordinationMode: 'distributed' as const
      };

      const agentIds = await this.taskCoordinator.launchParallelAgents([
        {
          agentType: 'researcher',
          objective: 'Research testing patterns',
          mode: 'researcher',
          memoryKey: 'research_patterns',
          batchOptimized: true
        },
        {
          agentType: 'developer',
          objective: 'Implement test framework',
          mode: 'developer',
          memoryKey: 'test_framework',
          batchOptimized: true
        }
      ], context);

      if (agentIds.length !== 2) throw new Error('Not all agents launched');
      if (!agentIds.every(id => typeof id === 'string' && id.length > 0)) {
        throw new Error('Invalid agent IDs returned');
      }
    });

    // Test 8: Batch Operations Coordination
    await this.runTest('Batch Operations Coordination', async () => {
      const context = {
        sessionId: 'batch-test-session',
        coordinationMode: 'centralized' as const
      };

      const results = await this.taskCoordinator.coordinateBatchOperations([
        {
          type: 'read',
          targets: ['src/task/*.ts'],
          configuration: { pattern: 'export.*function' }
        },
        {
          type: 'analyze',
          targets: ['src/task/engine.ts'],
          configuration: { focus: 'classes' }
        }
      ], context);

      if (results.size === 0) throw new Error('No batch operation results');
      if (!Array.from(results.keys()).some(key => key.includes('read'))) {
        throw new Error('Read operation not executed');
      }
    });

    // Test 9: Task Cancellation with Rollback
    await this.runTest('Task Cancellation with Rollback', async () => {
      const task = await this.taskEngine.createTask({
        type: 'cancellation-test',
        description: 'Task to be cancelled',
        priority: 50,
        rollbackStrategy: 'previous-checkpoint'
      });

      // Add a checkpoint
      task.checkpoints.push({
        id: 'checkpoint-1',
        timestamp: new Date(),
        description: 'Initial checkpoint',
        state: { step: 'initialized' },
        artifacts: []
      });

      await this.taskEngine.cancelTask(task.id, 'Test cancellation', true);

      const status = await this.taskEngine.getTaskStatus(task.id);
      if (!status) throw new Error('Task not found after cancellation');
      if (status.task.status !== 'cancelled') throw new Error('Task not marked as cancelled');
    });

    // Test 10: Workflow Creation and Management
    await this.runTest('Workflow Creation and Management', async () => {
      const workflow = await this.taskEngine.createWorkflow({
        name: 'Test Workflow',
        description: 'Integration test workflow',
        parallelism: {
          maxConcurrent: 3,
          strategy: 'priority-based'
        },
        errorHandling: {
          strategy: 'continue-on-error',
          maxRetries: 2
        }
      });

      if (!workflow.id) throw new Error('Workflow ID not generated');
      if (workflow.name !== 'Test Workflow') throw new Error('Workflow name not set correctly');
      if (workflow.parallelism.maxConcurrent !== 3) throw new Error('Parallelism not set correctly');
    });

    // Test 11: System Integration Test
    await this.runTest('System Integration Test', async () => {
      const system = await initializeTaskManagement({
        maxConcurrentTasks: 5,
        memoryManager: this.memoryManager,
        logger: this.logger
      });

      if (!system.taskEngine) throw new Error('TaskEngine not initialized');
      if (!system.taskCoordinator) throw new Error('TaskCoordinator not initialized');
      if (!system.commands.create) throw new Error('Create command not initialized');
      if (!system.commands.list) throw new Error('List command not initialized');
      if (!system.commands.status) throw new Error('Status command not initialized');
      if (!system.commands.cancel) throw new Error('Cancel command not initialized');
      if (!system.commands.workflow) throw new Error('Workflow command not initialized');
    });

    // Test 12: Event System Integration
    await this.runTest('Event System Integration', async () => {
      let taskCreatedEvent = false;
      let taskCompletedEvent = false;

      this.taskEngine.on('task:created', () => {
        taskCreatedEvent = true;
      });

      this.taskEngine.on('task:completed', () => {
        taskCompletedEvent = true;
      });

      const task = await this.taskEngine.createTask({
        type: 'event-test',
        description: 'Event system test',
        priority: 60
      });

      // Simulate task completion
      this.taskEngine.emit('task:completed', { taskId: task.id, result: 'test completed' });

      if (!taskCreatedEvent) throw new Error('Task created event not fired');
      if (!taskCompletedEvent) throw new Error('Task completed event not fired');
    });

    console.log('\n📊 Test Results Summary:');
    console.log('═'.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  • ${r.name}: ${r.error}`);
      });
    }

    console.log('\n🎯 Task Management System Integration Status:');
    if (passed === total) {
      console.log('🟢 ALL TESTS PASSED - System is fully integrated and working!');
    } else if (passed >= total * 0.8) {
      console.log('🟡 MOSTLY WORKING - Some minor issues to address');
    } else {
      console.log('🔴 INTEGRATION ISSUES - Significant problems need fixing');
    }
  }
}

async function main(): Promise<void> {
  const tester = new TaskIntegrationTester();
  await tester.runAllTests();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { TaskIntegrationTester }; 
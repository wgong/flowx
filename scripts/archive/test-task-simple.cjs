#!/usr/bin/env node

/**
 * Simple Task System Integration Test
 * Tests basic functionality of the task management system
 */

const { TaskEngine } = require('../dist/scripts/src/task/engine.js');

// Test configuration
const TEST_CONFIG = {
  maxConcurrentTasks: 3,
  testTimeout: 15000,
  verbose: true
};

// Helper functions
function log(message, level = 'info') {
  if (!TEST_CONFIG.verbose && level === 'info') return;
  
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function runTest(name, testFn) {
  const startTime = Date.now();
  log(`\n🧪 Running test: ${name}`);
  
  try {
    await Promise.race([
      testFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.testTimeout)
      )
    ]);
    
    const duration = Date.now() - startTime;
    log(`✅ Test passed: ${name} (${duration}ms)`);
    return { name, passed: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Test failed: ${name} - ${errorMessage}`, 'error');
    return { name, passed: false, error: errorMessage, duration };
  }
}

async function main() {
  log('🚀 Starting simple task system integration tests...');
  
  const results = [];
  
  // Test 1: TaskEngine Creation
  results.push(await runTest('TaskEngine Creation', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    if (!taskEngine) throw new Error('TaskEngine not created');
    log('TaskEngine created successfully');
  }));
  
  // Test 2: Task Creation
  results.push(await runTest('Task Creation', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    const task = await taskEngine.createTask({
      type: 'test',
      description: 'Test task creation',
      priority: 50,
      tags: ['test', 'basic']
    });
    
    if (!task.id) throw new Error('Task ID not generated');
    if (task.status !== 'pending') throw new Error('Task status not set to pending');
    if (task.type !== 'test') throw new Error('Task type not set correctly');
    
    log('Task created successfully with ID: ' + task.id);
  }));
  
  // Test 3: Task Listing
  results.push(await runTest('Task Listing', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    // Create multiple tasks
    const task1 = await taskEngine.createTask({
      type: 'test1',
      description: 'First test task',
      priority: 80
    });
    
    const task2 = await taskEngine.createTask({
      type: 'test2',
      description: 'Second test task',
      priority: 20
    });
    
    // List tasks
    const { tasks, total } = await taskEngine.listTasks();
    if (total !== 2) throw new Error(`Expected 2 tasks, got ${total}`);
    if (tasks.length !== 2) throw new Error(`Expected 2 tasks in array, got ${tasks.length}`);
    
    log(`Listed ${total} tasks successfully`);
  }));
  
  // Test 4: Task Status
  results.push(await runTest('Task Status', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    const task = await taskEngine.createTask({
      type: 'status-test',
      description: 'Task for status testing',
      priority: 60
    });
    
    const status = await taskEngine.getTaskStatus(task.id);
    if (!status) throw new Error('Task status not found');
    if (status.task.id !== task.id) throw new Error('Task status ID mismatch');
    if (status.task.status !== 'pending') throw new Error('Task status not pending');
    
    log('Task status retrieved successfully');
  }));
  
  // Test 5: Task Dependencies
  results.push(await runTest('Task Dependencies', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    // Create parent task
    const parentTask = await taskEngine.createTask({
      type: 'parent',
      description: 'Parent task',
      priority: 100
    });
    
    // Create dependent task
    const dependentTask = await taskEngine.createTask({
      type: 'dependent',
      description: 'Dependent task',
      priority: 50,
      dependencies: [{
        taskId: parentTask.id,
        type: 'finish-to-start'
      }]
    });
    
    if (dependentTask.dependencies.length !== 1) throw new Error('Dependency not set');
    if (dependentTask.dependencies[0].taskId !== parentTask.id) throw new Error('Dependency task ID mismatch');
    
    log('Task dependencies created successfully');
  }));
  
  // Test 6: Task Filtering
  results.push(await runTest('Task Filtering', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    // Create tasks with different priorities
    await taskEngine.createTask({
      type: 'high',
      description: 'High priority task',
      priority: 90,
      tags: ['urgent']
    });
    
    await taskEngine.createTask({
      type: 'low',
      description: 'Low priority task',
      priority: 10,
      tags: ['backlog']
    });
    
    // Filter by priority
    const highPriorityTasks = await taskEngine.listTasks({
      priority: { min: 80 }
    });
    
    if (highPriorityTasks.total !== 1) throw new Error('Priority filter failed');
    
    // Filter by tags
    const urgentTasks = await taskEngine.listTasks({
      tags: ['urgent']
    });
    
    if (urgentTasks.total !== 1) throw new Error('Tag filter failed');
    
    log('Task filtering completed successfully');
  }));
  
  // Test 7: Workflow Management
  results.push(await runTest('Workflow Management', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    const workflow = await taskEngine.createWorkflow({
      name: 'Test Workflow',
      description: 'Test workflow',
      version: '1.0.0',
      tasks: [],
      variables: { testVar: 'testValue' },
      parallelism: {
        maxConcurrent: 2,
        strategy: 'priority-based'
      },
      errorHandling: {
        strategy: 'continue-on-error',
        maxRetries: 3
      },
      createdBy: 'test-system'
    });
    
    if (!workflow.id) throw new Error('Workflow ID not generated');
    if (workflow.name !== 'Test Workflow') throw new Error('Workflow name mismatch');
    
    const workflows = await taskEngine.listWorkflows();
    if (workflows.length !== 1) throw new Error('Workflow not found in list');
    
    log('Workflow management completed successfully');
  }));
  
  // Test 8: Task Cancellation
  results.push(await runTest('Task Cancellation', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    const task = await taskEngine.createTask({
      type: 'cancellable',
      description: 'Task to be cancelled',
      priority: 50
    });
    
    await taskEngine.cancelTask(task.id, 'Test cancellation');
    
    const status = await taskEngine.getTaskStatus(task.id);
    if (!status) throw new Error('Cancelled task status not found');
    if (status.task.status !== 'cancelled') throw new Error('Task not cancelled');
    
    log('Task cancellation completed successfully');
  }));
  
  // Print test results
  log('\n📊 Test Results Summary:');
  log('=' .repeat(50));
  
  let passedCount = 0;
  let totalDuration = 0;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = `${result.duration}ms`;
    log(`${status} ${result.name} (${duration})`);
    
    if (result.error) {
      log(`   Error: ${result.error}`, 'error');
    }
    
    if (result.passed) passedCount++;
    totalDuration += result.duration;
  });
  
  log('=' .repeat(50));
  log(`📈 Results: ${passedCount}/${results.length} tests passed`);
  log(`⏱️  Total duration: ${totalDuration}ms`);
  log(`🎯 Success rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);
  
  if (passedCount === results.length) {
    log('🎉 All tests passed! Task system is fully functional.');
    process.exit(0);
  } else {
    log('💥 Some tests failed. Please check the errors above.', 'error');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  log(`💥 Test suite failed: ${error.message}`, 'error');
  process.exit(1);
}); 
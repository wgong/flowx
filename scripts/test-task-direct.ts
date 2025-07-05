/**
 * Direct Task System Test
 * Tests the task system directly using TypeScript imports
 */

import { TaskEngine } from '../src/task/engine';
import { TaskCoordinator } from '../src/task/coordination';
import { initializeTaskManagement } from '../src/task/index';
import { generateId } from '../src/utils/helpers';

// Test configuration
const TEST_CONFIG = {
  maxConcurrentTasks: 3,
  testTimeout: 10000,
  verbose: true
};

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  if (!TEST_CONFIG.verbose && level === 'info') return;
  
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  log(`\n🧪 Running test: ${name}`);
  
  try {
    await Promise.race([
      testFn(),
      new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.testTimeout)
      )
    ]);
    
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    log(`✅ Test passed: ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage, duration });
    log(`❌ Test failed: ${name} - ${errorMessage}`, 'error');
  }
}

async function main() {
  log('🚀 Starting direct task system tests...');
  
  // Test 1: TaskEngine Creation
  await runTest('TaskEngine Creation', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    if (!taskEngine) throw new Error('TaskEngine not created');
    log('TaskEngine created successfully');
  });
  
  // Test 2: Task Creation
  await runTest('Task Creation', async () => {
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
    
    log(`Task created successfully with ID: ${task.id}`);
  });
  
  // Test 3: Task Operations
  await runTest('Task Operations', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    // Create task
    const task = await taskEngine.createTask({
      type: 'operation-test',
      description: 'Task for operations testing',
      priority: 75,
      tags: ['operation', 'test']
    });
    
    // List tasks
    const { tasks, total } = await taskEngine.listTasks();
    if (total !== 1) throw new Error(`Expected 1 task, got ${total}`);
    
    // Get task status
    const status = await taskEngine.getTaskStatus(task.id);
    if (!status) throw new Error('Task status not found');
    if (status.task.id !== task.id) throw new Error('Task status ID mismatch');
    
    log('Task operations completed successfully');
  });
  
  // Test 4: Task Dependencies
  await runTest('Task Dependencies', async () => {
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
    
    // Verify dependency status
    const status = await taskEngine.getTaskStatus(dependentTask.id);
    if (!status) throw new Error('Dependent task status not found');
    if (status.dependencies.length !== 1) throw new Error('Dependency status not found');
    if (status.dependencies[0].task.id !== parentTask.id) throw new Error('Dependency status task mismatch');
    
    log('Task dependencies verified successfully');
  });
  
  // Test 5: Task Filtering
  await runTest('Task Filtering', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    // Create tasks with different properties
    await taskEngine.createTask({
      type: 'high-priority',
      description: 'High priority task',
      priority: 90,
      tags: ['urgent', 'important']
    });
    
    await taskEngine.createTask({
      type: 'low-priority',
      description: 'Low priority task',
      priority: 10,
      tags: ['backlog']
    });
    
    // Test priority filtering
    const highPriorityTasks = await taskEngine.listTasks({
      priority: { min: 80 }
    });
    if (highPriorityTasks.total !== 1) throw new Error('Priority filter failed');
    
    // Test tag filtering
    const urgentTasks = await taskEngine.listTasks({
      tags: ['urgent']
    });
    if (urgentTasks.total !== 1) throw new Error('Tag filter failed');
    
    log('Task filtering completed successfully');
  });
  
  // Test 6: Workflow Management
  await runTest('Workflow Management', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    
    const workflow = await taskEngine.createWorkflow({
      name: 'Test Workflow',
      description: 'Test workflow for direct testing',
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
  });
  
  // Test 7: Task Cancellation
  await runTest('Task Cancellation', async () => {
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
  });
  
  // Test 8: Task Coordination
  await runTest('Task Coordination', async () => {
    const taskEngine = new TaskEngine(TEST_CONFIG.maxConcurrentTasks);
    const taskCoordinator = new TaskCoordinator(taskEngine);
    
    const todos = await taskCoordinator.createTaskTodos(
      'Test coordination objective',
      {
        sessionId: generateId('session'),
        coordinationMode: 'centralized'
      },
      {
        strategy: 'development',
        maxTasks: 3,
        batchOptimized: true
      }
    );
    
    if (todos.length === 0) throw new Error('No todos created');
    if (!todos[0].id) throw new Error('Todo ID not generated');
    if (todos[0].status !== 'pending') throw new Error('Todo status not set to pending');
    
    // Test todo progress update
    await taskCoordinator.updateTodoProgress(todos[0].id, 'in_progress');
    
    const readTodos = await taskCoordinator.readTodos();
    const updatedTodo = readTodos.find(t => t.id === todos[0].id);
    if (!updatedTodo) throw new Error('Updated todo not found');
    if (updatedTodo.status !== 'in_progress') throw new Error('Todo status not updated');
    
    log('Task coordination completed successfully');
  });
  
  // Test 9: System Initialization
  await runTest('System Initialization', async () => {
    const system = await initializeTaskManagement({
      maxConcurrentTasks: TEST_CONFIG.maxConcurrentTasks
    });
    
    if (!system.taskEngine) throw new Error('TaskEngine not initialized');
    if (!system.taskCoordinator) throw new Error('TaskCoordinator not initialized');
    if (!system.commands) throw new Error('Commands not initialized');
    
    log('System initialization completed successfully');
  });
  
  // Print results
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
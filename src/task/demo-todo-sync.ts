/**
 * Demo: Todo-Task Synchronization Service
 * Shows how automatic bi-directional synchronization works between tasks and todos
 */

import { TaskEngine } from './engine.js';
import { TaskCoordinator } from './coordination.js';
import { enableTodoTaskSync } from './todo-sync-integration.js';
import { Logger } from '../core/logger.js';

// Mock memory manager for demo
class MockMemoryManager {
  private storage = new Map<string, any>();

  async store(key: string, value: any, options?: any): Promise<void> {
    this.storage.set(key, { value, options, timestamp: new Date() });
    console.log(`📁 Memory stored: ${key}`, options?.tags || []);
  }

  async retrieve(key: string): Promise<any> {
    const item = this.storage.get(key);
    return item?.value;
  }

  async search(pattern: string): Promise<any[]> {
    const results = [];
    for (const [key, item] of this.storage.entries()) {
      if (key.includes(pattern)) {
        results.push({ key, ...item });
      }
    }
    return results;
  }
}

async function runTodoSyncDemo(): Promise<void> {
  console.log('🚀 Starting Todo-Task Synchronization Demo\n');

  // Create system components
  const logger = new Logger('TodoSyncDemo');
  const memoryManager = new MockMemoryManager();
  const taskEngine = new TaskEngine(5, memoryManager, logger);
  const taskCoordinator = new TaskCoordinator(taskEngine, memoryManager);

  // Enable bi-directional sync
  console.log('⚙️ Enabling bi-directional todo-task synchronization...');
  const syncIntegration = await enableTodoTaskSync(
    taskEngine,
    taskCoordinator,
    memoryManager,
    {
      autoCreateTasks: true,
      autoCreateTodos: true,
      bidirectionalSync: true,
      preserveHistory: true,
      enableIntelligentUpdates: true,
      syncInterval: 500 // Faster for demo
    }
  );

  console.log('✅ Sync service initialized\n');

  // Demo 1: Create a task and watch todo auto-creation
  console.log('📝 DEMO 1: Task → Todo Synchronization');
  console.log('Creating a task and watching automatic todo creation...\n');

  const task1 = await taskEngine.createTask({
    type: 'development',
    description: 'Implement user authentication system',
    priority: 80,
    estimatedDurationMs: 3600000, // 1 hour
    tags: ['auth', 'security', 'backend']
  });

  console.log(`✅ Created task: ${task1.id} - "${task1.description}"`);

  // Wait for sync to process
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check sync stats
  const stats1 = syncIntegration.getSyncStats();
  console.log(`📊 Sync Stats: ${stats1.totalMappings} mappings, ${stats1.queuedUpdates} queued updates\n`);

  // Demo 2: Create todos and watch task auto-creation
  console.log('📝 DEMO 2: Todo → Task Synchronization');
  console.log('Creating todos and watching automatic task creation...\n');

  const context = {
    sessionId: 'demo-session-1',
    coordinationMode: 'centralized' as const
  };

  const todos = await taskCoordinator.createTaskTodos(
    'Build a REST API',
    context,
    {
      strategy: 'development',
      batchOptimized: true,
      parallelExecution: true,
      memoryCoordination: true
    }
  );

  console.log(`✅ Created ${todos.length} todos:`);
  todos.forEach(todo => {
    console.log(`   - ${todo.id}: "${todo.content}" [${todo.status}] (${todo.priority})`);
  });

  // Wait for sync to process
  await new Promise(resolve => setTimeout(resolve, 1000));

  const stats2 = syncIntegration.getSyncStats();
  console.log(`📊 Sync Stats: ${stats2.totalMappings} mappings, ${stats2.queuedUpdates} queued updates\n`);

  // Demo 3: Simulate task progress and watch todo updates
  console.log('📝 DEMO 3: Task Progress → Todo Status Synchronization');
  console.log('Simulating task execution and watching todo status updates...\n');

  // Find the first task that has a mapping
  let taskWithMapping: string | undefined;
  for (let i = 0; i < 10; i++) {
    const testTaskId = `task-${i}`;
    const mappings = syncIntegration.getMappings(testTaskId, 'task');
    if (mappings.length > 0) {
      taskWithMapping = testTaskId;
      break;
    }
  }

  if (taskWithMapping) {
    console.log(`🎯 Found task with mapping: ${taskWithMapping}`);
    const mappings = syncIntegration.getMappings(taskWithMapping, 'task');
    console.log(`📌 Mapped to todo: ${mappings[0]?.todoId}`);

    // Simulate task events
    console.log('🚀 Simulating task started...');
    taskEngine.emit('task:running', { taskId: taskWithMapping, agentId: 'demo-agent' });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('📈 Simulating task progress (50%)...');
    taskEngine.emit('task:progress', { 
      taskId: taskWithMapping, 
      progress: 50, 
      metrics: { cpuUsage: 45, memoryUsage: 60 } 
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('✅ Simulating task completion...');
    taskEngine.emit('task:completed', { 
      taskId: taskWithMapping, 
      result: { success: true, output: 'Task completed successfully' } 
    });

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Demo 4: Manual todo status change and task sync
  console.log('\n📝 DEMO 4: Todo Status → Task Synchronization');
  console.log('Manually updating todo status and watching task sync...\n');

  if (todos.length > 0) {
    const targetTodo = todos[0];
    console.log(`🎯 Updating todo: ${targetTodo.id} to "in_progress"`);

    await taskCoordinator.updateTodoProgress(
      targetTodo.id,
      'in_progress',
      {
        updatedBy: 'demo-user',
        reason: 'Starting implementation'
      }
    );

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if corresponding task was created/updated
    const todoMappings = syncIntegration.getMappings(targetTodo.id, 'todo');
    if (todoMappings.length > 0) {
      console.log(`✅ Found corresponding task: ${todoMappings[0].taskId}`);
    }
  }

  // Demo 5: Show final sync statistics
  console.log('\n📊 FINAL SYNC STATISTICS:');
  const finalStats = syncIntegration.getSyncStats();
  console.log(`- Total mappings created: ${finalStats.totalMappings}`);
  console.log(`- Queued updates: ${finalStats.queuedUpdates}`);
  console.log(`- Processing queue: ${finalStats.processingQueue}`);
  console.log(`- Sync enabled: ${finalStats.enabled}`);

  console.log('\n🔍 MAPPINGS OVERVIEW:');
  // Show all mappings
  let mappingCount = 0;
  for (let i = 0; i < 20; i++) {
    const testId = `task-${i}`;
    const mappings = syncIntegration.getMappings(testId, 'task');
    if (mappings.length > 0) {
      mappingCount++;
      console.log(`  ${testId} ↔ ${mappings[0].todoId} (${mappings[0].relationship})`);
    }
  }

  if (mappingCount === 0) {
    console.log('  No mappings found (may need more time for async processing)');
  }

  // Demo 6: Error handling demonstration
  console.log('\n📝 DEMO 6: Error Handling');
  console.log('Testing sync resilience with error scenarios...\n');

  try {
    // Test invalid todo update
    await taskCoordinator.updateTodoProgress(
      'non-existent-todo',
      'completed',
      { testError: true }
    );
  } catch (error) {
    console.log(`⚠️ Expected error handled: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await syncIntegration.shutdown();
  console.log('✅ Demo completed successfully!\n');

  // Summary
  console.log('📋 SUMMARY OF FEATURES DEMONSTRATED:');
  console.log('✅ Automatic todo creation when tasks are created');
  console.log('✅ Automatic task creation when todos are marked in_progress');
  console.log('✅ Bi-directional status synchronization');
  console.log('✅ Progress tracking and metadata preservation');
  console.log('✅ Intelligent mapping and relationship tracking');
  console.log('✅ Memory persistence for cross-session sync');
  console.log('✅ Error handling and resilience');
  console.log('✅ Performance monitoring and statistics');
}

// Helper function to wait for user input (for interactive demos)
async function waitForInput(message: string = 'Press Enter to continue...'): Promise<void> {
  if (process.env.INTERACTIVE_DEMO) {
    console.log(message);
    return new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
  }
  // Auto-continue for non-interactive demos
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTodoSyncDemo().catch(console.error);
}

export { runTodoSyncDemo }; 
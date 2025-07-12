#!/usr/bin/env node

import { TaskEngine } from '../src/task/engine.ts';

async function debugSort() {
  const taskEngine = new TaskEngine(5);
  
  // Create tasks with specific priorities
  const task1 = await taskEngine.createTask({
    type: 'test',
    description: 'Task 1',
    priority: 95
  });
  
  const task2 = await taskEngine.createTask({
    type: 'test',
    description: 'Task 2',
    priority: 80
  });
  
  const task3 = await taskEngine.createTask({
    type: 'test',
    description: 'Task 3',
    priority: 30
  });
  
  console.log('Created tasks:');
  console.log(`Task 1: ${task1.priority}`);
  console.log(`Task 2: ${task2.priority}`);
  console.log(`Task 3: ${task3.priority}`);
  
  // Test sorting
  const sortedTasks = await taskEngine.listTasks({
    sort: { field: 'priority', direction: 'desc' }
  });
  
  console.log('\nSorted tasks (desc):');
  sortedTasks.tasks.forEach((task, i) => {
    console.log(`${i}: ${task.description} - Priority: ${task.priority}`);
  });
  
  // Expected order: 95, 80, 30
  console.log('\nExpected order: 95, 80, 30');
  console.log('Actual order:', sortedTasks.tasks.map(t => t.priority).join(', '));
}

debugSort().catch(console.error); 
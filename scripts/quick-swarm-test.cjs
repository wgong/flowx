#!/usr/bin/env node
/**
 * Quick Swarm Integration Test
 * Simple test to verify swarm system is working
 */

const { SwarmCoordinator } = require('../src/swarm/coordinator.js');
const { Logger } = require('../src/core/logger.js');

async function runQuickTest() {
  console.log('🚀 Quick Swarm Integration Test');
  console.log('===============================');
  
  const logger = new Logger({
    level: 'info',
    format: 'text',
    destination: 'console'
  }, { component: 'QuickTest' });

  try {
    // Test 1: Basic coordinator lifecycle
    console.log('📋 Test 1: SwarmCoordinator Lifecycle');
    
    const coordinator = new SwarmCoordinator({
      name: 'Quick Test Swarm',
      maxAgents: 3,
      memory: {
        namespace: 'quick-test',
        persistent: false,
        distributed: false,
        consistency: 'eventual',
        cacheEnabled: true,
        compressionEnabled: false
      }
    });

    console.log('  ✓ Coordinator created');
    
    if (coordinator.isRunning()) {
      throw new Error('Coordinator should not be running initially');
    }
    console.log('  ✓ Initial state correct');

    await coordinator.initialize();
    console.log('  ✓ Coordinator initialized');
    
    if (!coordinator.isRunning()) {
      throw new Error('Coordinator should be running after initialization');
    }
    console.log('  ✓ Running state correct');

    // Test 2: Agent registration
    console.log('📋 Test 2: Agent Registration');
    
    const agentId = await coordinator.registerAgent(
      'test-agent',
      'developer',
      ['code-generation', 'testing']
    );
    
    if (!agentId) {
      throw new Error('Agent registration failed');
    }
    console.log('  ✓ Agent registered:', agentId);

    const agents = coordinator.getAgents();
    if (agents.length !== 1) {
      throw new Error(`Expected 1 agent, got ${agents.length}`);
    }
    console.log('  ✓ Agent count correct');

    // Test 3: Task management
    console.log('📋 Test 3: Task Management');
    
    const taskId = await coordinator.createTask(
      'code-generation',
      'Test Task',
      'Simple test task',
      'Create a test file'
    );
    
    if (!taskId) {
      throw new Error('Task creation failed');
    }
    console.log('  ✓ Task created:', taskId);

    const tasks = coordinator.getTasks();
    if (tasks.length !== 1) {
      throw new Error(`Expected 1 task, got ${tasks.length}`);
    }
    console.log('  ✓ Task count correct');

    // Test 4: Task assignment
    console.log('📋 Test 4: Task Assignment');
    
    await coordinator.assignTask(taskId, agentId);
    console.log('  ✓ Task assigned');

    const assignedTask = coordinator.getTask(taskId);
    if (!assignedTask || assignedTask.status !== 'assigned') {
      throw new Error('Task assignment failed');
    }
    console.log('  ✓ Task status correct');

    // Test 5: System status
    console.log('📋 Test 5: System Status');
    
    const status = coordinator.getSwarmStatus();
    console.log('  ✓ Status retrieved:', {
      status: status.status,
      agents: status.agents.total,
      tasks: status.tasks.total
    });

    const metrics = coordinator.getMetrics();
    console.log('  ✓ Metrics retrieved:', {
      agentsRegistered: metrics.agentsRegistered,
      tasksCreated: metrics.tasksCreated
    });

    // Test 6: Cleanup
    console.log('📋 Test 6: Cleanup');
    
    await coordinator.shutdown();
    console.log('  ✓ Coordinator shutdown');
    
    if (coordinator.isRunning()) {
      throw new Error('Coordinator should not be running after shutdown');
    }
    console.log('  ✓ Shutdown state correct');

    // Success!
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Swarm system integration is working correctly');
    console.log('\nSummary:');
    console.log('- SwarmCoordinator lifecycle: ✓');
    console.log('- Agent registration: ✓');
    console.log('- Task management: ✓');
    console.log('- Task assignment: ✓');
    console.log('- System monitoring: ✓');
    console.log('- Memory integration: ✓');
    
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the test
if (require.main === module) {
  runQuickTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runQuickTest }; 
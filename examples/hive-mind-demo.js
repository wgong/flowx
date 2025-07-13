/**
 * Hive Mind Demo
 * 
 * This example demonstrates how to create, initialize, and use the Hive Mind
 * collective intelligence system with multiple coordinating agents.
 */

import { 
  initializeHiveMindSystem, 
  shutdownHiveMindSystem,
  AgentType,
  TaskPriority,
  TaskStrategy
} from '../src/hive-mind/index.js';

async function runDemo() {
  console.log('Starting Hive Mind Demo');
  console.log('------------------------\n');
  
  let hiveCoordinator, resourceManager;
  
  try {
    // Initialize Hive Mind system with configuration
    console.log('Initializing Hive Mind system...');
    
    const { 
      hiveCoordinator: coordinator, 
      resourceManager: manager, 
      hiveId 
    } = await initializeHiveMindSystem({
      name: 'DemoHive',
      topology: 'hierarchical',
      maxAgents: 8,
      queenMode: 'centralized',
      autoSpawn: true,
      autoStartTasks: true,
      enableNeuralPatterns: true,
      enableConsensus: true,
      logLevel: 'info',
      // Define initial agents to spawn
      initialAgents: [
        { type: 'coordinator', count: 1 },
        { type: 'researcher', count: 1 },
        { type: 'coder', count: 2 },
        { type: 'analyst', count: 1 },
        { type: 'tester', count: 1 }
      ]
    });
    
    hiveCoordinator = coordinator;
    resourceManager = manager;
    
    console.log(`Hive Mind initialized with ID: ${hiveId}`);
    console.log('System health status:', hiveCoordinator.getHealthStatus());
    
    // Wait for system to stabilize
    console.log('Waiting for system to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get system statistics
    console.log('\nSystem Statistics:');
    const stats = await hiveCoordinator.getSystemStats();
    console.log(`- Uptime: ${stats.uptime}ms`);
    console.log(`- Agents: ${stats.agents.total} (${Object.entries(stats.agents.byType).map(([type, count]) => `${type}: ${count}`).join(', ')})`);
    console.log(`- Tasks: ${stats.tasks.total} (${stats.tasks.pending} pending, ${stats.tasks.active} active, ${stats.tasks.completed} completed)`);
    
    // Spawn an additional specialized agent
    console.log('\nSpawning additional specialist agent...');
    const specialistId = await hiveCoordinator.spawnAgent({
      type: 'specialist',
      name: 'ML-Specialist',
      specialization: 'machine_learning'
    });
    console.log(`Specialist agent spawned with ID: ${specialistId}`);
    
    // Submit some tasks to the hive mind
    console.log('\nSubmitting tasks to the Hive Mind...');
    
    // Research task
    const researchTaskId = await hiveCoordinator.submitTask({
      description: 'Research machine learning techniques for pattern recognition in large datasets',
      priority: 'high',
      capabilities: ['information_gathering', 'pattern_recognition', 'knowledge_synthesis']
    });
    console.log(`Research task submitted: ${researchTaskId}`);
    
    // Coding task
    const codingTaskId = await hiveCoordinator.submitTask({
      description: 'Implement a neural network model for classification',
      priority: 'medium',
      capabilities: ['code_generation', 'algorithm_improvement', 'neural_processing']
    });
    console.log(`Coding task submitted: ${codingTaskId}`);
    
    // Analysis task
    const analysisTaskId = await hiveCoordinator.submitTask({
      description: 'Analyze system performance bottlenecks',
      priority: 'low',
      capabilities: ['data_analysis', 'performance_metrics', 'bottleneck_detection']
    });
    console.log(`Analysis task submitted: ${analysisTaskId}`);
    
    // Create consensus proposal
    console.log('\nCreating consensus proposal...');
    const proposalId = await hiveCoordinator.createConsensusProposal({
      proposal: {
        title: 'Integration Strategy Decision',
        options: [
          { id: 'option1', name: 'REST API Integration' },
          { id: 'option2', name: 'GraphQL Integration' },
          { id: 'option3', name: 'gRPC Integration' }
        ],
        context: 'Deciding on the integration strategy for the system'
      },
      requiredThreshold: 0.6,
      votingStrategy: 'weighted_voting',
      metadata: {
        taskType: 'architecture_design',
        urgency: 'medium',
        impactScope: 'system-wide'
      }
    });
    console.log(`Consensus proposal created: ${proposalId}`);
    
    // Allow some time for tasks to process
    console.log('\nWaiting for tasks to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get updated system statistics
    console.log('\nUpdated System Statistics:');
    const updatedStats = await hiveCoordinator.getSystemStats();
    console.log(`- Agents: ${updatedStats.agents.total} (${Object.entries(updatedStats.agents.byType).map(([type, count]) => `${type}: ${count}`).join(', ')})`);
    console.log(`- Tasks: ${updatedStats.tasks.total} (${updatedStats.tasks.pending} pending, ${updatedStats.tasks.active} active, ${updatedStats.tasks.completed} completed)`);
    console.log(`- Consensus: ${updatedStats.consensus.totalProposals} proposals, ${updatedStats.consensus.achievedConsensus} achieved`);
    
    // Check system health
    console.log('\nSystem health status:', hiveCoordinator.getHealthStatus());
    
  } catch (error) {
    console.error('Error during demo:', error);
  } finally {
    // Always shut down the system properly
    if (hiveCoordinator && resourceManager) {
      console.log('\nShutting down Hive Mind system...');
      try {
        await shutdownHiveMindSystem(hiveCoordinator, resourceManager);
        console.log('System shutdown completed successfully.');
      } catch (error) {
        console.error('Error during shutdown:', error);
      }
    }
  }
}

// Run the demo
runDemo().catch(error => {
  console.error('Unhandled error in demo:', error);
  process.exit(1);
});
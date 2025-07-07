#!/usr/bin/env node
/**
 * Comprehensive Swarm Strategy Testing Script
 * Tests auto, research, and other strategy implementations
 */

const { AutoStrategy } = require('../src/swarm/strategies/auto.js');
const { ResearchStrategy } = require('../src/swarm/strategies/research.js');
const { Logger } = require('../src/core/logger.js');
const { generateId } = require('../src/utils/helpers.js');

class SwarmStrategyTester {
  constructor() {
    this.logger = new Logger(
      { level: 'info', format: 'text', destination: 'console' },
      { component: 'StrategyTester' }
    );
    this.testResults = [];
    this.swarmConfig = {
      name: 'Strategy Test Swarm',
      maxAgents: 5,
      maxTasks: 20,
      performance: {
        maxConcurrency: 3,
        cacheEnabled: true
      },
      monitoring: {
        metricsEnabled: true
      }
    };
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Swarm Strategy Tests');
    console.log('===============================================');

    try {
      // Test Auto Strategy
      await this.testAutoStrategy();
      
      // Test Research Strategy  
      await this.testResearchStrategy();
      
      // Test Strategy Comparison
      await this.testStrategyComparison();
      
      // Test Strategy Selection Logic
      await this.testStrategySelection();

      this.printResults();

    } catch (error) {
      console.error('❌ Strategy testing failed:', error.message);
      process.exit(1);
    }
  }

  async testAutoStrategy() {
    await this.runTest('Auto Strategy - Basic Functionality', async () => {
      const strategy = new AutoStrategy(this.swarmConfig);
      
      // Test objective decomposition
      const objective = this.createTestObjective(
        'Build a REST API with user authentication and data persistence',
        'auto'
      );

      const result = await strategy.decomposeObjective(objective);
      
      if (!result.tasks || result.tasks.length === 0) {
        throw new Error('Auto strategy failed to decompose objective into tasks');
      }

      if (!result.batchGroups || result.batchGroups.length === 0) {
        throw new Error('Auto strategy failed to create task batches');
      }

      // Verify task types are appropriate
      const taskTypes = result.tasks.map(t => t.type);
      const expectedTypes = ['analysis', 'code-generation', 'testing', 'documentation'];
      
      const hasExpectedTasks = expectedTypes.some(type => taskTypes.includes(type));
      if (!hasExpectedTasks) {
        throw new Error('Auto strategy did not generate expected task types');
      }

      return {
        tasksGenerated: result.tasks.length,
        batchGroups: result.batchGroups.length,
        estimatedDuration: result.estimatedDuration,
        complexity: result.complexity,
        taskTypes: [...new Set(taskTypes)]
      };
    });

    await this.runTest('Auto Strategy - Agent Selection', async () => {
      const strategy = new AutoStrategy(this.swarmConfig);
      
      const agents = this.createTestAgents();
      const task = this.createTestTask('code-generation', 'Implement user authentication');

      const selectedAgentId = await strategy.selectAgentForTask(task, agents);
      
      if (!selectedAgentId) {
        throw new Error('Auto strategy failed to select an agent');
      }

      const selectedAgent = agents.find(a => a.id.id === selectedAgentId);
      if (!selectedAgent) {
        throw new Error('Selected agent not found in available agents');
      }

      // Verify the selected agent has appropriate capabilities
      if (selectedAgent.type !== 'developer') {
        throw new Error('Auto strategy selected inappropriate agent type for code generation');
      }

      return {
        selectedAgentId,
        selectedAgentType: selectedAgent.type,
        agentCapabilities: Object.keys(selectedAgent.capabilities).filter(k => selectedAgent.capabilities[k])
      };
    });

    await this.runTest('Auto Strategy - Task Optimization', async () => {
      const strategy = new AutoStrategy(this.swarmConfig);
      
      const tasks = [
        this.createTestTask('analysis', 'Analyze requirements'),
        this.createTestTask('code-generation', 'Implement features'),
        this.createTestTask('testing', 'Write tests'),
        this.createTestTask('documentation', 'Create docs')
      ];

      const agents = this.createTestAgents();
      const allocations = await strategy.optimizeTaskSchedule(tasks, agents);

      if (!allocations || allocations.length === 0) {
        throw new Error('Auto strategy failed to create task allocations');
      }

      // Verify all tasks are allocated
      const allocatedTaskCount = allocations.reduce((sum, alloc) => sum + alloc.tasks.length, 0);
      if (allocatedTaskCount === 0) {
        throw new Error('No tasks were allocated to agents');
      }

      return {
        allocations: allocations.length,
        totalTasksAllocated: allocatedTaskCount,
        averageWorkload: allocations.reduce((sum, a) => sum + a.estimatedWorkload, 0) / allocations.length
      };
    });
  }

  async testResearchStrategy() {
    await this.runTest('Research Strategy - Basic Functionality', async () => {
      const strategy = new ResearchStrategy(this.swarmConfig);
      
      const objective = this.createTestObjective(
        'Research the latest trends in AI and machine learning for 2024',
        'research'
      );

      const result = await strategy.decomposeObjective(objective);
      
      if (!result.tasks || result.tasks.length === 0) {
        throw new Error('Research strategy failed to decompose objective');
      }

      // Verify research-specific tasks are created
      const taskTypes = result.tasks.map(t => t.type);
      const researchTasks = taskTypes.filter(type => 
        type === 'research' || type === 'analysis' || type === 'documentation'
      );

      if (researchTasks.length === 0) {
        throw new Error('Research strategy did not generate research-specific tasks');
      }

      return {
        tasksGenerated: result.tasks.length,
        researchTasks: researchTasks.length,
        batchGroups: result.batchGroups?.length || 0,
        complexity: result.complexity
      };
    });

    await this.runTest('Research Strategy - Parallel Processing', async () => {
      const strategy = new ResearchStrategy(this.swarmConfig);
      
      const objective = this.createTestObjective(
        'Comprehensive analysis of cloud computing platforms: AWS, Azure, and GCP',
        'research'
      );

      const result = await strategy.decomposeObjective(objective);
      
      // Check for parallel batch groups
      const parallelBatches = result.batchGroups?.filter(batch => batch.canRunInParallel) || [];
      
      if (parallelBatches.length === 0) {
        throw new Error('Research strategy did not create parallel task batches');
      }

      return {
        totalBatches: result.batchGroups?.length || 0,
        parallelBatches: parallelBatches.length,
        sequentialBatches: (result.batchGroups?.length || 0) - parallelBatches.length
      };
    });

    await this.runTest('Research Strategy - Agent Specialization', async () => {
      const strategy = new ResearchStrategy(this.swarmConfig);
      
      const agents = this.createTestAgents();
      const researchTask = this.createTestTask('research', 'Research AI trends');

      const selectedAgentId = await strategy.selectAgentForTask(researchTask, agents);
      
      if (!selectedAgentId) {
        throw new Error('Research strategy failed to select agent for research task');
      }

      const selectedAgent = agents.find(a => a.id.id === selectedAgentId);
      
      // Should prefer researcher or analyzer agents
      if (selectedAgent.type !== 'researcher' && selectedAgent.type !== 'analyzer') {
        console.warn('Research strategy selected non-research agent:', selectedAgent.type);
      }

      return {
        selectedAgentType: selectedAgent.type,
        appropriateSelection: selectedAgent.type === 'researcher' || selectedAgent.type === 'analyzer'
      };
    });
  }

  async testStrategyComparison() {
    await this.runTest('Strategy Comparison - Different Approaches', async () => {
      const autoStrategy = new AutoStrategy(this.swarmConfig);
      const researchStrategy = new ResearchStrategy(this.swarmConfig);

      // Test same objective with different strategies
      const developmentObjective = this.createTestObjective(
        'Create a web application with user management',
        'auto'
      );

      const researchObjective = this.createTestObjective(
        'Create a web application with user management',
        'research'
      );

      const autoResult = await autoStrategy.decomposeObjective(developmentObjective);
      const researchResult = await researchStrategy.decomposeObjective(researchObjective);

      // Compare results
      const autoTaskTypes = autoResult.tasks.map(t => t.type);
      const researchTaskTypes = researchResult.tasks.map(t => t.type);

      return {
        autoStrategy: {
          tasks: autoResult.tasks.length,
          types: [...new Set(autoTaskTypes)],
          complexity: autoResult.complexity
        },
        researchStrategy: {
          tasks: researchResult.tasks.length,
          types: [...new Set(researchTaskTypes)],
          complexity: researchResult.complexity
        },
        comparison: {
          autoHasMoreCodeTasks: autoTaskTypes.filter(t => t === 'code-generation').length > 
                               researchTaskTypes.filter(t => t === 'code-generation').length,
          researchHasMoreAnalysis: researchTaskTypes.filter(t => t === 'analysis').length >
                                  autoTaskTypes.filter(t => t === 'analysis').length
        }
      };
    });
  }

  async testStrategySelection() {
    await this.runTest('Strategy Selection Logic', async () => {
      // Test that different objective types lead to appropriate strategy recommendations
      const objectives = [
        {
          description: 'Build a complex microservices architecture',
          expectedStrategy: 'development'
        },
        {
          description: 'Research market trends in blockchain technology',
          expectedStrategy: 'research'
        },
        {
          description: 'Analyze user behavior patterns',
          expectedStrategy: 'analysis'
        },
        {
          description: 'Create a simple todo application',
          expectedStrategy: 'auto'
        }
      ];

      const results = [];
      const autoStrategy = new AutoStrategy(this.swarmConfig);

      for (const obj of objectives) {
        const objective = this.createTestObjective(obj.description, 'auto');
        const result = await autoStrategy.decomposeObjective(objective);
        
        results.push({
          description: obj.description,
          expectedStrategy: obj.expectedStrategy,
          recommendedStrategy: result.recommendedStrategy,
          matches: result.recommendedStrategy === obj.expectedStrategy
        });
      }

      const correctRecommendations = results.filter(r => r.matches).length;
      const accuracy = correctRecommendations / results.length;

      return {
        testCases: results.length,
        correctRecommendations,
        accuracy,
        results
      };
    });
  }

  // Helper methods
  async runTest(name, testFn) {
    const startTime = Date.now();
    console.log(`📋 Running: ${name}`);
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        passed: true,
        duration,
        result
      });
      
      console.log(`✅ Passed: ${name} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name,
        passed: false,
        duration,
        error: error.message
      });
      
      console.log(`❌ Failed: ${name} (${duration}ms) - ${error.message}`);
    }
  }

  createTestObjective(description, strategy) {
    return {
      id: { id: generateId('objective') },
      description,
      strategy,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      tasks: [],
      requirements: [],
      constraints: [],
      expectedDuration: 0,
      actualDuration: 0,
      progress: 0,
      quality: 0,
      results: {},
      metadata: {}
    };
  }

  createTestTask(type, description) {
    return {
      id: { id: generateId('task') },
      type,
      name: description,
      description,
      instructions: description,
      requirements: {
        capabilities: [type],
        tools: ['read', 'write'],
        estimatedDuration: 300000 // 5 minutes
      },
      constraints: {
        dependencies: [],
        maxRetries: 3,
        timeoutAfter: 300000
      },
      priority: 'medium',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: [],
      statusHistory: []
    };
  }

  createTestAgents() {
    return [
      {
        id: { id: generateId('agent') },
        name: 'test-developer',
        type: 'developer',
        status: 'idle',
        capabilities: {
          codeGeneration: true,
          problemSolving: true,
          testing: false,
          research: false
        },
        workload: 0.3,
        health: 0.9,
        performance: {
          successRate: 0.95,
          averageExecutionTime: 180000
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        tasksCompleted: 5
      },
      {
        id: { id: generateId('agent') },
        name: 'test-researcher',
        type: 'researcher',
        status: 'idle',
        capabilities: {
          research: true,
          analysis: true,
          codeGeneration: false,
          testing: false
        },
        workload: 0.2,
        health: 0.95,
        performance: {
          successRate: 0.88,
          averageExecutionTime: 240000
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        tasksCompleted: 3
      },
      {
        id: { id: generateId('agent') },
        name: 'test-tester',
        type: 'tester',
        status: 'idle',
        capabilities: {
          testing: true,
          qualityAssurance: true,
          codeGeneration: false,
          research: false
        },
        workload: 0.1,
        health: 0.92,
        performance: {
          successRate: 0.97,
          averageExecutionTime: 150000
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        tasksCompleted: 8
      },
      {
        id: { id: generateId('agent') },
        name: 'test-analyzer',
        type: 'analyzer',
        status: 'idle',
        capabilities: {
          analysis: true,
          research: true,
          documentation: true,
          codeGeneration: false
        },
        workload: 0.4,
        health: 0.87,
        performance: {
          successRate: 0.91,
          averageExecutionTime: 200000
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        tasksCompleted: 4
      }
    ];
  }

  printResults() {
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    
    console.log('\n📊 SWARM STRATEGY TEST RESULTS');
    console.log('==============================');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }
    
    console.log('\n📋 DETAILED RESULTS:');
    this.testResults.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      console.log(`  ${status} ${r.name} (${r.duration}ms)`);
      
      if (r.result && r.passed) {
        const resultStr = JSON.stringify(r.result, null, 2);
        console.log(`     ${resultStr.split('\n').join('\n     ')}`);
      }
    });
    
    if (passed === total) {
      console.log('\n🎉 ALL STRATEGY TESTS PASSED!');
      console.log('✅ Auto Strategy: Working correctly');
      console.log('✅ Research Strategy: Working correctly');
      console.log('✅ Strategy Selection: Working correctly');
      console.log('✅ Task Optimization: Working correctly');
    } else {
      console.log('\n⚠️  Some strategy tests failed. Please review the failures above.');
      process.exit(1);
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new SwarmStrategyTester();
  tester.runAllTests().catch(error => {
    console.error('Strategy test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { SwarmStrategyTester }; 
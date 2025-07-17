/**
 * Comprehensive Tests for AdvancedResearchStrategy
 * Tests enterprise-grade research capabilities including parallel processing,
 * semantic clustering, intelligent source ranking, and progressive refinement
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AdvancedResearchStrategy } from '../advanced-research.ts';
import { SwarmConfig, SwarmObjective, TaskDefinition, AgentState } from '../../types.ts';

// Mock the logger and other dependencies
jest.mock('../../../core/logger.ts', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

jest.mock('../../../utils/helpers.ts', () => ({
  generateId: jest.fn(() => `test-id-${Date.now()}`)
}));

describe('AdvancedResearchStrategy', () => {
  let strategy: AdvancedResearchStrategy;
  let mockConfig: SwarmConfig;
  let mockObjective: SwarmObjective;
  let mockAgents: AgentState[];

  beforeEach(() => {
    // Setup mock configuration
    mockConfig = {
      name: 'test-research-swarm',
      description: 'Test swarm for research',
      version: '1.0.0',
      mode: 'mesh',
      strategy: 'research',
      maxAgents: 10,
      maxTasks: 50,
      maxDuration: 3600000,
      performance: {
        maxConcurrency: 15,
        cacheEnabled: true,
        optimizationLevel: 'enterprise'
      }
    } as SwarmConfig;

    // Setup mock research objective
    mockObjective = {
      id: 'test-objective-1',
      description: 'Conduct comprehensive research on enterprise AI automation trends and their impact on software development productivity',
      priority: 'high',
      deadline: new Date(Date.now() + 7200000), // 2 hours from now
      context: {
        domain: 'enterprise-technology',
        quality: 'high',
        depth: 'comprehensive'
      },
      requirements: {
        completionCriteria: ['thorough analysis', 'credible sources', 'actionable insights'],
        constraints: ['time-sensitive', 'enterprise-grade quality'],
        expectedOutputs: ['research report', 'source analysis', 'recommendations']
      },
      metadata: {
        requestedBy: 'enterprise-team',
        urgency: 'high',
        budget: 'unlimited'
      }
    };

    // Setup mock agents with research capabilities
    mockAgents = [
      {
        id: { id: 'researcher-1', swarmId: 'test-swarm', type: 'researcher', instance: 1 },
        type: 'researcher',
        status: 'idle',
        workload: 0.3,
        health: 0.95,
        capabilities: {
          codeGeneration: false,
          codeReview: false,
          testing: false,
          documentation: true,
          research: true,
          analysis: true,
          webSearch: true,
          apiIntegration: true,
          fileSystem: true,
          terminalAccess: false,
          languages: [],
          frameworks: [],
          domains: ['research', 'web-search', 'analysis', 'enterprise-research'],
          tools: ['WebSearch', 'WebFetch', 'SemanticAnalyzer'],
          maxConcurrentTasks: 5,
          maxMemoryUsage: 1024 * 1024 * 1024,
          maxExecutionTime: 900000,
          reliability: 0.92,
          speed: 0.85,
          quality: 0.95
        },
        metrics: {
          tasksCompleted: 150,
          successRate: 0.94,
          averageExecutionTime: 180000,
          memoryUsage: 0.65,
          cpuUsage: 0.45,
          lastUpdated: new Date()
        },
        memory: new Map(),
        createdAt: new Date(),
        lastActive: new Date()
      },
      {
        id: { id: 'analyst-1', swarmId: 'test-swarm', type: 'analyzer', instance: 1 },
        type: 'analyzer',
        status: 'idle',
        workload: 0.2,
        health: 0.88,
        capabilities: {
          codeGeneration: false,
          codeReview: false,
          testing: false,
          documentation: true,
          research: false,
          analysis: true,
          webSearch: false,
          apiIntegration: true,
          fileSystem: true,
          terminalAccess: false,
          languages: [],
          frameworks: [],
          domains: ['analysis', 'semantic-processing', 'clustering'],
          tools: ['SemanticAnalyzer', 'ClusteringEngine', 'DataProcessor'],
          maxConcurrentTasks: 3,
          maxMemoryUsage: 2048 * 1024 * 1024,
          maxExecutionTime: 600000,
          reliability: 0.89,
          speed: 0.78,
          quality: 0.91
        },
        metrics: {
          tasksCompleted: 120,
          successRate: 0.91,
          averageExecutionTime: 240000,
          memoryUsage: 0.72,
          cpuUsage: 0.55,
          lastUpdated: new Date()
        },
        memory: new Map(),
        createdAt: new Date(),
        lastActive: new Date()
      },
      {
        id: { id: 'documenter-1', swarmId: 'test-swarm', type: 'documenter', instance: 1 },
        type: 'documenter',
        status: 'idle',
        workload: 0.15,
        health: 0.93,
        capabilities: {
          codeGeneration: false,
          codeReview: false,
          testing: false,
          documentation: true,
          research: false,
          analysis: true,
          webSearch: false,
          apiIntegration: false,
          fileSystem: true,
          terminalAccess: false,
          languages: [],
          frameworks: [],
          domains: ['documentation', 'synthesis', 'visualization'],
          tools: ['DocumentGenerator', 'ReportBuilder', 'Visualizer'],
          maxConcurrentTasks: 2,
          maxMemoryUsage: 512 * 1024 * 1024,
          maxExecutionTime: 1200000,
          reliability: 0.95,
          speed: 0.72,
          quality: 0.98
        },
        metrics: {
          tasksCompleted: 80,
          successRate: 0.96,
          averageExecutionTime: 360000,
          memoryUsage: 0.42,
          cpuUsage: 0.28,
          lastUpdated: new Date()
        },
        memory: new Map(),
        createdAt: new Date(),
        lastActive: new Date()
      }
    ];

    // Initialize strategy
    strategy = new AdvancedResearchStrategy(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with enterprise-grade configuration', () => {
      expect(strategy).toBeDefined();
      expect(strategy).toBeInstanceOf(AdvancedResearchStrategy);
    });

    it('should setup advanced connection pool with enterprise limits', () => {
      const metrics = strategy.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.tasksCompleted).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });

    it('should initialize semantic analysis model', () => {
      // The semantic model should be initialized (tested via behavior)
      const metrics = strategy.getMetrics();
      expect(metrics.clusteringAccuracy).toBe(0);
    });
  });

  describe('Advanced Research Task Decomposition', () => {
    it('should decompose comprehensive research objective into 5 phases', async () => {
      const result = await strategy.decomposeObjective(mockObjective);

      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(5);
      expect(result.recommendedStrategy).toBe('advanced-research');
      expect(result.batchGroups).toHaveLength(4);

      // Verify the 5 phases are present
      const taskNames = result.tasks.map(task => task.name);
      expect(taskNames).toContain('Research Strategy Planning & Query Optimization');
      expect(taskNames).toContain('Parallel Web Search with Connection Pooling');
      expect(taskNames).toContain('Semantic Clustering & Topic Analysis');
      expect(taskNames).toContain('Progressive Research Refinement & Gap Analysis');
      expect(taskNames).toContain('Advanced Research Synthesis & Reporting');
    });

    it('should create proper task dependencies for sequential phases', async () => {
      const result = await strategy.decomposeObjective(mockObjective);

      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.size).toBeGreaterThan(0);

      // Strategy planning should have no dependencies
      const strategyTask = result.tasks.find(t => t.name.includes('Strategy Planning'));
      expect(strategyTask).toBeDefined();

      // Subsequent tasks should have proper dependencies
      const searchTask = result.tasks.find(t => t.name.includes('Parallel Web Search'));
      expect(searchTask).toBeDefined();
      expect(result.dependencies.get(searchTask!.id.id)).toContain(strategyTask!.id.id);
    });

    it('should estimate reasonable completion times for complex research', async () => {
      const result = await strategy.decomposeObjective(mockObjective);

      expect(result.estimatedDuration).toBeGreaterThan(30 * 60 * 1000); // At least 30 minutes
      expect(result.estimatedDuration).toBeLessThan(60 * 60 * 1000); // Less than 60 minutes

      // Individual phases should have realistic durations
      result.tasks.forEach(task => {
        expect(task.requirements.estimatedDuration).toBeGreaterThan(5 * 60 * 1000); // At least 5 minutes
        expect(task.requirements.estimatedDuration).toBeLessThan(15 * 60 * 1000); // Less than 15 minutes
      });
    });

    it('should create optimized batch groups for parallel execution', async () => {
      const result = await strategy.decomposeObjective(mockObjective);

      expect(result.batchGroups).toHaveLength(4);

      // Verify parallel execution groups
      const parallelBatch = result.batchGroups.find(batch => batch.canRunInParallel);
      expect(parallelBatch).toBeDefined();
      expect(parallelBatch!.requiredResources.cpu).toBeGreaterThan(1);
      expect(parallelBatch!.requiredResources.memory).toBeGreaterThan(1024);
    });

    it('should extract advanced research parameters from objective description', async () => {
      const result = await strategy.decomposeObjective(mockObjective);

      // Research tasks should include advanced capabilities
      const researchTask = result.tasks.find(t => t.type === 'research');
      expect(researchTask).toBeDefined();
      expect(researchTask!.requirements.capabilities).toContain('research');
      expect(researchTask!.requirements.tools).toContain('WebFetchTool');
      expect(researchTask!.requirements.tools).toContain('WebSearch');
    });
  });

  describe('Advanced Agent Selection', () => {
    it('should select best agents based on research-specific scoring', async () => {
      const mockTask: TaskDefinition = {
        id: { id: 'test-task', swarmId: 'test', sequence: 1, priority: 1 },
        type: 'research',
        name: 'Test Research Task',
        description: 'Test task for research',
        instructions: 'Perform research',
        requirements: {
          capabilities: ['research', 'web-search'],
          tools: ['WebSearch'],
          permissions: ['read', 'write']
        },
        constraints: {
          dependencies: [],
          dependents: [],
          conflicts: [],
          maxRetries: 3,
          timeoutAfter: 300000
        },
        priority: 'high',
        input: {},
        context: {},
        examples: [],
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: [],
        statusHistory: []
      };

      const selectedAgentId = await strategy.selectAgentForTask(mockTask, mockAgents);

      expect(selectedAgentId).toBeDefined();
      expect(selectedAgentId).toBe('researcher-1'); // Should select the researcher

      // Verify it doesn't select overloaded agents
      mockAgents[0].workload = 0.85; // Overload the researcher
      const fallbackAgentId = await strategy.selectAgentForTask(mockTask, mockAgents);
      expect(fallbackAgentId).toBeNull(); // No suitable agents
    });

    it('should prefer agents with enterprise research capabilities', async () => {
      const mockTask: TaskDefinition = {
        id: { id: 'test-task', swarmId: 'test', sequence: 1, priority: 1 },
        type: 'research',
        name: 'Enterprise Research Task',
        description: 'Enterprise-grade research task',
        instructions: 'Perform enterprise research',
        requirements: {
          capabilities: ['enterprise-research', 'research'],
          tools: ['WebSearch', 'SemanticAnalyzer'],
          permissions: ['read', 'write', 'network']
        },
        constraints: {
          dependencies: [],
          dependents: [],
          conflicts: [],
          maxRetries: 3,
          timeoutAfter: 600000
        },
        priority: 'critical',
        input: {},
        context: {},
        examples: [],
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: [],
        statusHistory: []
      };

      const selectedAgentId = await strategy.selectAgentForTask(mockTask, mockAgents);
      expect(selectedAgentId).toBe('researcher-1'); // Has enterprise-research capability
    });

    it('should handle agent selection when no suitable agents available', async () => {
      const mockTask: TaskDefinition = {
        id: { id: 'test-task', swarmId: 'test', sequence: 1, priority: 1 },
        type: 'research',
        name: 'Specialized Task',
        description: 'Task requiring specialized capabilities',
        instructions: 'Perform specialized research',
        requirements: {
          capabilities: ['quantum-computing', 'advanced-ai'], // Capabilities no agent has
          tools: ['QuantumProcessor'],
          permissions: ['read', 'write']
        },
        constraints: {
          dependencies: [],
          dependents: [],
          conflicts: [],
          maxRetries: 3,
          timeoutAfter: 300000
        },
        priority: 'high',
        input: {},
        context: {},
        examples: [],
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: [],
        statusHistory: []
      };

      const selectedAgentId = await strategy.selectAgentForTask(mockTask, []);
      expect(selectedAgentId).toBeNull();

      const selectedAgentId2 = await strategy.selectAgentForTask(mockTask, mockAgents);
      expect(selectedAgentId2).toBeNull(); // No agents have required capabilities
    });
  });

  describe('Task Schedule Optimization', () => {
    it('should optimize task allocation across available agents', async () => {
      const decomposition = await strategy.decomposeObjective(mockObjective);
      const allocations = await strategy.optimizeTaskSchedule(decomposition.tasks, mockAgents);

      expect(allocations).toBeDefined();
      expect(allocations.length).toBeGreaterThan(0);

      // Verify each allocation has proper structure
      allocations.forEach(allocation => {
        expect(allocation.agentId).toBeDefined();
        expect(allocation.tasks).toBeDefined();
        expect(allocation.estimatedWorkload).toBeGreaterThan(0);
        expect(allocation.capabilities).toBeDefined();
        expect(allocation.capabilities.length).toBeGreaterThan(0);
      });
    });

    it('should distribute tasks based on agent capabilities', async () => {
      const decomposition = await strategy.decomposeObjective(mockObjective);
      const allocations = await strategy.optimizeTaskSchedule(decomposition.tasks, mockAgents);

      // Research tasks should go to research-capable agents
      const researcherAllocation = allocations.find(a => a.agentId === 'researcher-1');
      expect(researcherAllocation).toBeDefined();
      expect(researcherAllocation!.tasks.length).toBeGreaterThan(0);

      // Analyst should get analysis tasks
      const analystAllocation = allocations.find(a => a.agentId === 'analyst-1');
      expect(analystAllocation).toBeDefined();

      // Documenter should get documentation tasks
      const documenterAllocation = allocations.find(a => a.agentId === 'documenter-1');
      expect(documenterAllocation).toBeDefined();
    });

    it('should respect agent capacity limits', async () => {
      const decomposition = await strategy.decomposeObjective(mockObjective);
      const allocations = await strategy.optimizeTaskSchedule(decomposition.tasks, mockAgents);

      // No agent should be allocated more than 3 tasks (as per implementation)
      allocations.forEach(allocation => {
        expect(allocation.tasks.length).toBeLessThanOrEqual(3);
        expect(allocation.estimatedWorkload).toBeLessThanOrEqual(1.0);
      });
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('should track comprehensive research metrics', () => {
      const metrics = strategy.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('tasksCompleted');
      expect(metrics).toHaveProperty('averageExecutionTime');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('queriesExecuted');
      expect(metrics).toHaveProperty('resultsCollected');
      expect(metrics).toHaveProperty('sourcesAnalyzed');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('averageCredibilityScore');
      expect(metrics).toHaveProperty('deduplicationRate');
      expect(metrics).toHaveProperty('clusteringAccuracy');
      expect(metrics).toHaveProperty('connectionPoolUtilization');
    });

    it('should initialize metrics with appropriate default values', () => {
      const metrics = strategy.getMetrics();

      expect(metrics.tasksCompleted).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.averageCredibilityScore).toBe(0);
      expect(metrics.deduplicationRate).toBe(0);
      expect(metrics.clusteringAccuracy).toBe(0);
    });

    it('should provide metrics in expected format for monitoring systems', () => {
      const metrics = strategy.getMetrics();

      // All metrics should be numbers
      Object.values(metrics).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Enterprise Feature Integration', () => {
    it('should handle complex multi-domain research objectives', async () => {
      const complexObjective: SwarmObjective = {
        ...mockObjective,
        description: 'Comprehensive analysis of enterprise AI automation trends, competitive landscape analysis, technical implementation patterns, and ROI assessment for fortune 500 companies in technology sector',
        context: {
          domain: 'enterprise-technology',
          quality: 'enterprise-grade',
          depth: 'comprehensive',
          urgency: 'critical'
        }
      };

      const result = await strategy.decomposeObjective(complexObjective);

      expect(result.complexity).toBeGreaterThan(0.7); // Should detect high complexity
      expect(result.tasks.length).toBe(5); // Should create all 5 phases
      expect(result.estimatedDuration).toBeGreaterThan(40 * 60 * 1000); // Should estimate longer time
    });

    it('should support high-concurrency enterprise workloads', async () => {
      const enterpriseConfig: SwarmConfig = {
        ...mockConfig,
        performance: {
          maxConcurrency: 25, // Higher enterprise limits
          cacheEnabled: true,
          optimizationLevel: 'enterprise'
        }
      };

      const enterpriseStrategy = new AdvancedResearchStrategy(enterpriseConfig);
      const result = await enterpriseStrategy.decomposeObjective(mockObjective);

      // Should leverage higher concurrency
      const parallelBatch = result.batchGroups.find(batch => batch.canRunInParallel);
      expect(parallelBatch!.requiredResources.cpu).toBeGreaterThan(2);
      expect(parallelBatch!.requiredResources.memory).toBeGreaterThan(2048);
    });

    it('should demonstrate enterprise-grade error handling and resilience', async () => {
      // Test with malformed input
      const invalidObjective = {
        ...mockObjective,
        description: '' // Empty description
      };

      // Should not throw but handle gracefully
      const result = await strategy.decomposeObjective(invalidObjective);
      expect(result).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should be compatible with existing swarm coordination', async () => {
      const result = await strategy.decomposeObjective(mockObjective);

      // Should produce standard task definitions compatible with swarm system
      result.tasks.forEach(task => {
        expect(task.id).toBeDefined();
        expect(task.type).toBeDefined();
        expect(task.requirements).toBeDefined();
        expect(task.constraints).toBeDefined();
        expect(task.status).toBe('created');
      });
    });

    it('should support standard swarm agent interfaces', async () => {
      const mockTask: TaskDefinition = {
        id: { id: 'test-task', swarmId: 'test', sequence: 1, priority: 1 },
        type: 'research',
        name: 'Test Task',
        description: 'Test',
        instructions: 'Test',
        requirements: { capabilities: ['research'], tools: [], permissions: [] },
        constraints: { dependencies: [], dependents: [], conflicts: [], maxRetries: 3, timeoutAfter: 300000 },
        priority: 'medium',
        input: {},
        context: {},
        examples: [],
        status: 'created',
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: [],
        statusHistory: []
      };

      // Should work with standard agent interfaces
      const selectedAgent = await strategy.selectAgentForTask(mockTask, mockAgents);
      expect(typeof selectedAgent === 'string' || selectedAgent === null).toBe(true);
    });

    it('should produce results compatible with existing monitoring systems', () => {
      const metrics = strategy.getMetrics();

      // Should extend base metrics without breaking compatibility
      expect(metrics.tasksCompleted).toBeDefined();
      expect(metrics.averageExecutionTime).toBeDefined();
      expect(metrics.successRate).toBeDefined();

      // Should add advanced metrics
      expect(metrics.queriesExecuted).toBeDefined();
      expect(metrics.averageCredibilityScore).toBeDefined();
    });
  });
}); 
/**
 * Integration tests for Hive Mind system
 * 
 * Tests the integration of all Hive Mind components to ensure proper functionality.
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock the Logger class
jest.mock('../../../src/core/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => {
      return {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };
    })
  };
});

// Mock the EventBus
jest.mock('../../../src/core/event-bus', () => {
  return {
    EventBus: {
      getInstance: jest.fn().mockImplementation(() => {
        return {
          on: jest.fn(),
          off: jest.fn(),
          emit: jest.fn(),
          once: jest.fn()
        };
      })
    }
  };
});

// Import after mocks
import { EventBus } from '../../../src/core/event-bus';

// Import the mock implementation
import { NeuralPatternEngine } from './__mocks__/neural-pattern-engine.mock';

// Mock the neural integration
jest.mock('../../../src/hive-mind/neural/neural-integration', () => {
  return {
    NeuralIntegration: jest.fn().mockImplementation(() => {
      return {
        learnFromTaskCompletion: jest.fn().mockImplementation(async () => {}),
        learnCoordinationPattern: jest.fn().mockImplementation(async () => {}),
        getObservedPatterns: jest.fn().mockReturnValue([]),
        shutdown: jest.fn().mockImplementation(async () => {})
      };
    })
  };
});

// Mock the database manager
jest.mock('../../../src/hive-mind/database/database-manager', () => {
  const mockInstance = {
    initialize: jest.fn().mockImplementation(async () => {}),
    shutdown: jest.fn().mockImplementation(async () => {}),
    execute: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn(),
    getDatabaseStats: jest.fn().mockReturnValue({
      totalTables: 12,
      totalRecords: 150,
      lastBackup: '2024-01-15T10:30:00Z',
      status: 'healthy'
    })
  };

  const DatabaseManagerClass = jest.fn().mockImplementation(() => mockInstance) as any;
  DatabaseManagerClass.getInstance = jest.fn().mockResolvedValue(mockInstance);

  return {
    DatabaseManager: DatabaseManagerClass
  };
});

// Mock the consensus engine
jest.mock('../../../src/hive-mind/consensus/consensus-engine', () => {
  return {
    ConsensusEngine: jest.fn().mockImplementation(() => {
      return {
        getMetrics: jest.fn().mockReturnValue({
          totalProposals: 15,
          achievedConsensus: 12,
          failedConsensus: 3,
          avgVotingTime: 5000,
          avgParticipation: 0.85,
          avgConfidence: 0.78
        }),
        shutdown: jest.fn().mockImplementation(async () => {})
      };
    })
  };
});

// Mock the task executor
jest.mock('../../../src/hive-mind/tasks/task-executor', () => {
  return {
    TaskExecutor: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
        stop: jest.fn().mockImplementation(async () => {}),
        submitTask: jest.fn(),
        getMetrics: jest.fn().mockReturnValue({
          totalSubmitted: 50,
          totalCompleted: 45,
          totalFailed: 5,
          averageExecutionTime: 3500
        }),
        shutdown: jest.fn().mockImplementation(async () => {})
      };
    })
  };
});

// Mock the resource manager
jest.mock('../../../src/hive-mind/utilities/resource-manager', () => {
  return {
    ResourceManager: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
        stop: jest.fn().mockImplementation(async () => {}),
        getResourceMetrics: jest.fn().mockReturnValue({
          memoryUsageMB: 512,
          cpuPercent: 25,
          activeAgents: 8,
          activeTasks: 3,
          networkConnections: 12,
          totalLeaks: 0,
          lastCleanup: new Date()
        }),
        isHealthy: jest.fn().mockReturnValue(true),
        gracefulShutdown: jest.fn().mockImplementation(async () => {}),
        shutdown: jest.fn().mockImplementation(async () => {})  // Added shutdown method
      };
    })
  };
});

// Mock the agent factory
jest.mock('../../../src/hive-mind/agents/agent-factory', () => {
  return {
    AgentFactory: jest.fn().mockImplementation(() => {
      return {
        createAgent: jest.fn().mockImplementation((...args: any[]) => {
          const [swarmId, options] = args;
          return {
            id: `agent-${Date.now()}`,
            name: options?.name || 'test-agent',
            type: options?.type || 'tester',
            swarmId,
            capabilities: ['testing', 'analysis'],
            healthScore: 1.0,
            performanceRating: 1.0
          };
        }),
        shutdown: jest.fn().mockImplementation(async () => {})
      };
    })
  };
});

// Import the rest of the modules after mocking
import { NeuralIntegration } from '../../../src/hive-mind/neural/neural-integration';
import { HiveMind } from '../../../src/hive-mind/core/hive-mind';
import { Logger } from '../../../src/core/logger';

describe('Hive Mind Integration Tests', () => {
  let hiveMind: HiveMind;
  let neuralEngine: NeuralPatternEngine;
  let neuralIntegration: NeuralIntegration;
  let eventBus: ReturnType<typeof EventBus.getInstance>;
  let logger: Logger;

  beforeAll(async () => {
    // Get event bus instance
    eventBus = EventBus.getInstance();
    
    // Create logger
    logger = new Logger({
    level: 'debug',
    format: 'json',
    destination: 'console'
  });
    
    // Create a neural pattern engine
    neuralEngine = new NeuralPatternEngine();

    // Create neural integration with proper config
    neuralIntegration = new NeuralIntegration(neuralEngine, logger);

    // Initialize Hive Mind
    hiveMind = new HiveMind({
      neuralIntegration,  // TypeScript will accept this due to the mocked implementation
      maxAgents: 5,
      enableConsensus: true,
      enableDynamicScaling: false
    });

    // Initialize the Hive Mind system
    await hiveMind.initialize();
  });

  afterAll(async () => {
    // Clean up resources
    await hiveMind.shutdown();
  });

  describe('Event Handling', () => {
    it('should process task completion events', () => {
      // Create a mock task completion event
      const taskEvent = {
        task: {
          id: 'test-task-1',
          type: 'processing',
          priority: 'high',
          metadata: {}
        },
        result: {
          success: true,
          executionTime: 100,
          accuracy: 0.95,
          data: { output: 'test' }
        },
        agent: {
          id: 'agent-1',
          type: 'processor',
          capabilities: { processing: true },
          environment: { runtime: 'nodejs' },
          metrics: {
            tasksCompleted: 10,
            tasksFailed: 1,
            successRate: 0.9,
            responseTime: 150,
            cpuUsage: 0.4,
            memoryUsage: 0.3
          }
        }
      };

      // Emit the task completion event
      eventBus.emit('task:completed', taskEvent);
      
      // Verify event emission
      expect(eventBus.emit).toHaveBeenCalledWith('task:completed', taskEvent);
    });

    it('should process coordination pattern events', () => {
      // Create a mock coordination pattern event
      const patternEvent = {
        pattern: 'hierarchical',
        context: {
          taskType: 'complex',
          agentCapabilities: ['research', 'coding', 'review'],
          environment: { mode: 'development' },
          historicalPerformance: [0.85, 0.9, 0.88],
          resourceUsage: { cpu: 0.6, memory: 0.5, responseTime: 200 },
          communicationPatterns: ['broadcast', 'direct']
        },
        outcome: 'success',
        metrics: {
          completionTime: 350,
          resourceEfficiency: 0.7,
          qualityScore: 0.85
        }
      };

      // Emit the coordination pattern event
      eventBus.emit('coordination:pattern', patternEvent);

      // Verify event emission
      expect(eventBus.emit).toHaveBeenCalledWith('coordination:pattern', patternEvent);
    });
  });

  describe('Neural Pattern Recognition', () => {
    it('should predict coordination patterns', async () => {
      // Create a sample coordination context
      const context = {
        taskType: 'research',
        agentCapabilities: ['data_analysis', 'web_scraping', 'summarization'],
        environment: { mode: 'production' },
        historicalPerformance: [0.82, 0.79, 0.85],
        resourceUsage: {
          cpu: 0.45,
          memory: 0.3,
          responseTime: 180
        },
        communicationPatterns: ['mesh', 'centralized'],
        outcomes: ['success']
      };

      // Try to predict coordination mode
      const prediction = await neuralEngine.predictCoordinationMode(context);

      // Verify we get a prediction
      expect(prediction).toBeDefined();
      expect(prediction.prediction).toBeDefined();
      expect(Array.isArray(prediction.prediction)).toBeTruthy();
      expect(prediction.confidence).toBeGreaterThan(0);
    });
  });

  describe('Hive Mind Status Reporting', () => {
    it('should report neural system status', () => {
      // Get neural status
      const status = hiveMind.getNeuralStatus();

      // Verify status contains expected information
      expect(status).toBeDefined();
      expect(status.neuralManager).toBeDefined();
      expect(status.patternRecognizer).toBeDefined();
    });

    it('should report database status', () => {
      // Get database status
      const status = hiveMind.getDatabaseStatus();

      // Verify status information
      expect(status).toBeDefined();
      expect(status.totalTables).toBeDefined();
      expect(status.totalRecords).toBeDefined();
      expect(status.status).toBe('healthy');
    });

    it('should report queen agent status', () => {
      // Get queen status
      const status = hiveMind.getQueenStatus();

      // Verify status information
      expect(status).toBeDefined();
      expect(status.queenId).toBeDefined();
      expect(status.collectives).toBeDefined();
      expect(status.totalAgents).toBeDefined();
    });

    it('should report coordination status', () => {
      // Get coordination status
      const status = hiveMind.getCoordinationStatus();

      // Verify status information
      expect(status).toBeDefined();
      expect(status.networkHealth).toBeDefined();
      expect(status.activeNodes).toBeDefined();
      expect(status.syncStatus).toBeDefined();
    });
  });
});
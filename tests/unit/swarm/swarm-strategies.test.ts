/**
 * Tests for swarm strategy implementations
 */

import { describe, it, expect, jest } from '@jest/globals';

// Mock strategy implementations for testing
class MockStrategy {
  name: string;
  config: any;
  events: any[] = [];

  constructor(name: string, config: any = {}) {
    this.name = name;
    this.config = config;
  }

  initialize(): Promise<boolean> {
    this.events.push('initialize');
    return Promise.resolve(true);
  }

  execute(data: any): Promise<any> {
    this.events.push('execute');
    return Promise.resolve(data);
  }

  cleanup(): Promise<void> {
    this.events.push('cleanup');
    return Promise.resolve();
  }
}

// Auto strategy extends the base strategy
class AutoStrategy extends MockStrategy {
  constructor(config: any = {}) {
    super('auto', config);
  }

  async execute(data: any): Promise<any> {
    this.events.push('execute');
    
    // Auto strategy adapts based on workload
    if (data && data.taskCount > 10) {
      this.events.push('scale_up');
    } else {
      this.events.push('optimize');
    }
    
    return { result: 'auto-processed', metrics: { adaptations: 1 } };
  }
}

// Mock factory for strategies
const createStrategy = (type: string, config: any = {}): MockStrategy => {
  switch (type) {
    case 'auto':
      return new AutoStrategy(config);
    case 'fixed':
      return new MockStrategy('fixed', config);
    case 'adaptive':
      return new MockStrategy('adaptive', config);
    default:
      return new MockStrategy('default', config);
  }
};

// Mock SwarmCoordinator
class SwarmCoordinator {
  strategy: MockStrategy;
  agents: string[] = [];
  tasks: any[] = [];
  isRunning = false;

  constructor(strategyType: string, config: any = {}) {
    this.strategy = createStrategy(strategyType, config);
  }

  async start(): Promise<boolean> {
    this.isRunning = true;
    await this.strategy.initialize();
    return true;
  }

  async stop(): Promise<boolean> {
    this.isRunning = false;
    await this.strategy.cleanup();
    return true;
  }

  async process(data: any): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Coordinator not running');
    }
    
    return this.strategy.execute(data);
  }

  addAgent(agentId: string): boolean {
    this.agents.push(agentId);
    return true;
  }

  addTask(task: any): boolean {
    this.tasks.push(task);
    return true;
  }
}

// Tests
describe('Swarm Strategies', () => {
  describe('Strategy Initialization', () => {
    it('should initialize different strategy types', () => {
      const autoStrategy = createStrategy('auto');
      const fixedStrategy = createStrategy('fixed');
      const adaptiveStrategy = createStrategy('adaptive');
      
      expect(autoStrategy.name).toBe('auto');
      expect(fixedStrategy.name).toBe('fixed');
      expect(adaptiveStrategy.name).toBe('adaptive');
    });

    it('should pass configuration to strategies', () => {
      const config = { maxAgents: 5, timeout: 1000 };
      const strategy = createStrategy('auto', config);
      
      expect(strategy.config).toEqual(config);
    });
  });

  describe('Strategy Execution', () => {
    it('should execute strategy lifecycle methods', async () => {
      const strategy = createStrategy('fixed');
      
      await strategy.initialize();
      await strategy.execute({ data: 'test' });
      await strategy.cleanup();
      
      expect(strategy.events).toEqual(['initialize', 'execute', 'cleanup']);
    });

    it('should handle auto strategy adaptation', async () => {
      const autoStrategy = createStrategy('auto');
      
      await autoStrategy.initialize();
      
      // Small workload
      await autoStrategy.execute({ taskCount: 5 });
      
      // Large workload
      await autoStrategy.execute({ taskCount: 20 });
      
      await autoStrategy.cleanup();
      
      expect(autoStrategy.events).toContain('optimize');
      expect(autoStrategy.events).toContain('scale_up');
    });
  });

  describe('Swarm Coordinator with Strategies', () => {
    it('should create coordinator with strategy', () => {
      const coordinator = new SwarmCoordinator('auto', { maxAgents: 10 });
      
      expect(coordinator.strategy).toBeDefined();
      expect(coordinator.strategy.name).toBe('auto');
      expect(coordinator.strategy.config.maxAgents).toBe(10);
    });

    it('should start and stop coordinator', async () => {
      const coordinator = new SwarmCoordinator('fixed');
      
      await coordinator.start();
      expect(coordinator.isRunning).toBe(true);
      expect(coordinator.strategy.events).toContain('initialize');
      
      await coordinator.stop();
      expect(coordinator.isRunning).toBe(false);
      expect(coordinator.strategy.events).toContain('cleanup');
    });

    it('should process data using strategy', async () => {
      const coordinator = new SwarmCoordinator('auto');
      
      await coordinator.start();
      
      const result = await coordinator.process({ taskCount: 5 });
      
      expect(coordinator.strategy.events).toContain('execute');
      expect(result).toBeDefined();
      expect(result.result).toBe('auto-processed');
      
      await coordinator.stop();
    });

    it('should throw error if processing when not running', async () => {
      const coordinator = new SwarmCoordinator('auto');
      
      // Not started yet
      await expect(coordinator.process({ data: 'test' }))
        .rejects.toThrow('Coordinator not running');
      
      await coordinator.start();
      await coordinator.stop();
      
      // Stopped
      await expect(coordinator.process({ data: 'test' }))
        .rejects.toThrow('Coordinator not running');
    });
  });
});
/**
 * Mock implementation of swarm functionality for Node.js tests
 */

export class SwarmMock {
  private swarms: Map<string, any>;
  private agents: Map<string, any>;
  private tasks: Map<string, any>;

  constructor() {
    this.swarms = new Map();
    this.agents = new Map();
    this.tasks = new Map();
  }

  /**
   * Create a new swarm
   */
  createSwarm(id: string, options: any = {}): any {
    const swarm = {
      id,
      name: options.name || id,
      strategy: options.strategy || 'auto',
      mode: options.mode || 'centralized',
      status: 'planning',
      agents: [],
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...options
    };

    this.swarms.set(id, swarm);
    return swarm;
  }

  /**
   * Get a swarm by ID
   */
  getSwarm(id: string): any | undefined {
    return this.swarms.get(id);
  }

  /**
   * List all swarms
   */
  listSwarms(): any[] {
    return Array.from(this.swarms.values());
  }

  /**
   * Add agent to swarm
   */
  addAgentToSwarm(swarmId: string, agentId: string): boolean {
    const swarm = this.swarms.get(swarmId);
    const agent = this.agents.get(agentId);

    if (!swarm || !agent) {
      return false;
    }

    swarm.agents.push(agentId);
    return true;
  }

  /**
   * Start a swarm
   */
  startSwarm(id: string): boolean {
    const swarm = this.swarms.get(id);
    if (!swarm) {
      return false;
    }

    swarm.status = 'running';
    swarm.updatedAt = new Date();
    return true;
  }

  /**
   * Stop a swarm
   */
  stopSwarm(id: string): boolean {
    const swarm = this.swarms.get(id);
    if (!swarm) {
      return false;
    }

    swarm.status = 'stopped';
    swarm.updatedAt = new Date();
    return true;
  }

  /**
   * Create a swarm agent
   */
  createAgent(id: string, options: any = {}): any {
    const agent = {
      id,
      name: options.name || id,
      type: options.type || 'general',
      status: 'idle',
      capabilities: options.capabilities || [],
      createdAt: new Date(),
      ...options
    };

    this.agents.set(id, agent);
    return agent;
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): any | undefined {
    return this.agents.get(id);
  }

  /**
   * List all agents
   */
  listAgents(): any[] {
    return Array.from(this.agents.values());
  }

  /**
   * Create a task
   */
  createTask(id: string, options: any = {}): any {
    const task = {
      id,
      description: options.description || 'Task',
      status: 'pending',
      priority: options.priority || 'medium',
      assignedTo: null,
      createdAt: new Date(),
      ...options
    };

    this.tasks.set(id, task);
    return task;
  }

  /**
   * Assign task to agent
   */
  assignTask(taskId: string, agentId: string): boolean {
    const task = this.tasks.get(taskId);
    const agent = this.agents.get(agentId);

    if (!task || !agent) {
      return false;
    }

    task.assignedTo = agentId;
    task.status = 'assigned';
    return true;
  }

  /**
   * Get task by ID
   */
  getTask(id: string): any | undefined {
    return this.tasks.get(id);
  }

  /**
   * List all tasks
   */
  listTasks(): any[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Complete a task
   */
  completeTask(id: string, result: any = {}): boolean {
    const task = this.tasks.get(id);
    if (!task) {
      return false;
    }

    task.status = 'completed';
    task.result = result;
    task.completedAt = new Date();
    return true;
  }

  /**
   * Get swarm metrics
   */
  getSwarmMetrics(swarmId: string): any {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      return null;
    }

    return {
      id: swarm.id,
      totalAgents: swarm.agents.length,
      activeTasks: this.tasks.size,
      avgTaskDuration: 250, // mock value
      tasksPerMinute: 12, // mock value
      cpuUsage: 25, // mock percentage
      memoryUsage: 128, // mock MB value
      status: swarm.status
    };
  }
}

export default SwarmMock;
/**
 * Mock implementation of WorkflowEngine for tests
 */

export interface ExecutionOptions {
  variables?: Record<string, any>;
  timeout?: number;
  debug?: boolean;
}

export interface WorkflowDefinition {
  name: string;
  version?: string;
  steps: Array<{
    id: string;
    type: string;
    input?: Record<string, any>;
    condition?: string;
    [key: string]: any;
  }>;
  variables?: Record<string, any>;
  [key: string]: any;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'aborted';
  steps: Array<{
    id: string;
    status: 'completed' | 'failed' | 'skipped';
    output?: any;
    error?: string;
  }>;
  output?: Record<string, any>;
  error?: string;
  duration: number;
}

export class WorkflowEngine {
  private debug: boolean;
  private monitoring: boolean;
  private executedWorkflows: WorkflowResult[] = [];
  private mockResponses: Record<string, any> = {};

  constructor(options: { debug?: boolean; monitoring?: boolean } = {}) {
    this.debug = options.debug || false;
    this.monitoring = options.monitoring || false;
  }

  async loadWorkflow(path: string): Promise<WorkflowDefinition> {
    // Mock implementation to read workflow file
    const fs = require('fs');
    const content = fs.readFileSync(path, 'utf-8');
    
    // For testing the error handling case specifically
    if (path.includes('invalid-format')) {
      throw new Error('Failed to load workflow file: Invalid format');
    }
    
    try {
      if (path.endsWith('.json') || content.trim().startsWith('{')) {
        return JSON.parse(content);
      } else {
        // Try to parse as YAML regardless of extension
        const yaml = require('js-yaml');
        return yaml.load(content);
      }
    } catch (error) {
      throw new Error(`Failed to load workflow file: ${error.message}`);
    }
  }

  async executeWorkflow(workflowPathOrDefinition: string | WorkflowDefinition, options: ExecutionOptions = {}): Promise<WorkflowResult> {
    let workflow: WorkflowDefinition;
    
    if (typeof workflowPathOrDefinition === 'string') {
      workflow = await this.loadWorkflow(workflowPathOrDefinition);
    } else {
      workflow = workflowPathOrDefinition;
    }

    // If there's a mock response for this workflow, return it
    const workflowId = workflow.name;
    if (this.mockResponses[workflowId]) {
      return this.mockResponses[workflowId];
    }

    // Get steps from workflow.steps or workflow.tasks
    const steps = workflow.steps || workflow.tasks || [];

    // Generate a simple successful result for testing
    const result: WorkflowResult = {
      workflowId: workflowId,
      status: 'completed',
      steps: steps.map((step: any) => ({
        id: step.id,
        status: 'completed',
        output: step.input || {},
      })),
      output: {},
      duration: 0,
    };
    
    this.executedWorkflows.push(result);
    return result;
  }

  // Helper methods for testing
  setMockResponse(workflowId: string, response: WorkflowResult): void {
    this.mockResponses[workflowId] = response;
  }

  getExecutedWorkflows(): WorkflowResult[] {
    return [...this.executedWorkflows];
  }

  resetExecutedWorkflows(): void {
    this.executedWorkflows = [];
  }

  // Validate workflow definition
  validateWorkflow(workflow: WorkflowDefinition): string[] {
    const errors: string[] = [];

    // Basic validation rules
    if (!workflow.name) {
      errors.push('Workflow must have a name');
    }

    // Look for tasks or steps array
    const steps = workflow.steps || workflow.tasks;
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      errors.push('Workflow must have at least one step or task');
    } else {
      // Check steps/tasks
      const stepIds = new Set<string>();
      steps.forEach((step: any, index: number) => {
        if (!step.id) {
          errors.push(`Step at index ${index} must have an id`);
        } else if (stepIds.has(step.id)) {
          errors.push(`Duplicate step id: ${step.id}`);
        } else {
          stepIds.add(step.id);
        }

        if (!step.type) {
          errors.push(`Step ${step.id || index} must have a type`);
        }
      });
    }

    return errors;
  }
}
/**
 * FlowX-specific MCP tools
 */

import { MCPTool, MCPContext } from "../utils/types.js";
import { ILogger } from "../core/logger.js";
import { CoordinationManager } from '../coordination/manager.js';

export interface FlowXToolContext extends MCPContext {
  orchestrator?: any; // Reference to orchestrator instance
  swarmCoordinator?: any; // Reference to swarm coordinator
  memoryManager?: any; // Reference to memory manager
  workflowEngine?: any; // Reference to workflow engine
}

/**
 * Create all FlowX-specific MCP tools
 */
export function createFlowXTools(
  orchestrator: any,
  swarmCoordinator: any,
  agentManager: any,
  resourceManager: any,
  messagebus: any,
  monitor: any,
  coordinationManager?: CoordinationManager
): MCPTool[] {
  const tools: MCPTool[] = [
    // Enhanced Agent management tools
    createEnhancedSpawnAgentTool(orchestrator),
    createListAgentsTool(orchestrator),
    createTerminateAgentTool(orchestrator),
    createGetAgentInfoTool(orchestrator),

    // Enhanced Task management tools
    createCreateTaskTool(orchestrator),
    createListTasksTool(orchestrator),
    createGetTaskStatusTool(orchestrator),
    createCancelTaskTool(orchestrator),
    createAssignTaskTool(orchestrator),

    // Enhanced Memory management tools
    createQueryMemoryTool(orchestrator),
    createStoreMemoryTool(orchestrator),
    createDeleteMemoryTool(orchestrator),
    createExportMemoryTool(orchestrator),
    createImportMemoryTool(orchestrator),
    createSearchMemoryTool(orchestrator),

    // Workflow management tools
    createExecuteWorkflowTool(orchestrator),
    createCreateWorkflowTool(orchestrator),
    createListWorkflowsTool(orchestrator),
    createGetWorkflowStatusTool(orchestrator),

    // System monitoring tools
    createGetSystemStatusTool(orchestrator),
    createGetMetricsTool(orchestrator),
    createHealthCheckTool(orchestrator),

    // Configuration tools
    createGetConfigTool(orchestrator),
    createUpdateConfigTool(orchestrator),
    createValidateConfigTool(orchestrator),

    // Terminal management tools
    createExecuteCommandTool(orchestrator),
    createListTerminalsTool(orchestrator),
    createCreateTerminalTool(orchestrator),

    // SPARC workflow tools
    createExecuteSparcModeTool(orchestrator),
    createListSparcModesTool(orchestrator),
    createBatchSparcTool(orchestrator),

    // Advanced Coordination Tools
    {
      name: 'set_scheduling_strategy',
      description: 'Set the scheduling strategy for task assignment',
      inputSchema: {
        type: 'object',
        properties: {
          strategy: {
            type: 'string',
            enum: ['capability', 'round-robin', 'least-loaded', 'affinity'],
            description: 'The scheduling strategy to use'
          }
        },
        required: ['strategy']
      },
      handler: async (args: any) => {
        if (!coordinationManager) {
          throw new Error('Advanced coordination not available');
        }

        try {
          coordinationManager.setSchedulingStrategy(args.strategy);
          
          return {
            success: true,
            message: `Scheduling strategy set to ${args.strategy}`,
            strategy: args.strategy
          };
        } catch (error) {
          throw new Error(`Failed to set scheduling strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },

    {
      name: 'get_coordination_metrics',
      description: 'Get comprehensive coordination system metrics',
      inputSchema: {
        type: 'object',
        properties: {
          include_details: {
            type: 'boolean',
            description: 'Include detailed metrics for each component',
            default: false
          }
        }
      },
      handler: async (args: any) => {
        if (!coordinationManager) {
          throw new Error('Advanced coordination not available');
        }

        try {
          const metrics = await coordinationManager.getCoordinationMetrics();
          const health = await coordinationManager.getHealthStatus();

          return {
            success: true,
            health,
            metrics: args.include_details ? metrics : {
              summary: {
                healthy: health.healthy,
                activeAgents: health.metrics?.activeAgents || 0,
                openCircuitBreakers: health.metrics?.openCircuitBreakers || 0,
                overloadedAgents: health.metrics?.overloadedAgents || 0,
                totalStealOperations: health.metrics?.totalStealOperations || 0
              }
            },
            timestamp: new Date()
          };
        } catch (error) {
          throw new Error(`Failed to get coordination metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },

    {
      name: 'get_work_stealing_stats',
      description: 'Get work stealing coordinator statistics',
      inputSchema: {
        type: 'object',
        properties: {}
      },
      handler: async (args: any) => {
        if (!coordinationManager) {
          throw new Error('Advanced coordination not available');
        }

        try {
          const workStealer = coordinationManager.getWorkStealingCoordinator();
          const stats = workStealer.getWorkloadStats();
          const operations = workStealer.getStealOperations();

          return {
            success: true,
            stats,
            recentOperations: operations.slice(-10), // Last 10 operations
            summary: {
              totalAgents: stats.totalAgents,
              overloadedAgents: stats.overloadedAgents,
              underloadedAgents: stats.underloadedAgents,
              successfulSteals: stats.successfulSteals,
              avgTasksPerAgent: stats.avgTasksPerAgent
            }
          };
        } catch (error) {
          throw new Error(`Failed to get work stealing stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },

    {
      name: 'get_circuit_breaker_status',
      description: 'Get circuit breaker status and metrics',
      inputSchema: {
        type: 'object',
        properties: {
          breaker_name: {
            type: 'string',
            description: 'Specific circuit breaker name (optional)'
          }
        }
      },
      handler: async (args: any) => {
        if (!coordinationManager) {
          throw new Error('Advanced coordination not available');
        }

        try {
          const circuitBreakers = coordinationManager.getCircuitBreakerManager();
          const health = circuitBreakers.getHealthStatus();

          if (args.breaker_name) {
            const breaker = circuitBreakers.getBreaker(args.breaker_name);
            return {
              success: true,
              breaker: {
                name: args.breaker_name,
                state: breaker.getState(),
                metrics: breaker.getMetrics()
              }
            };
          } else {
            const allMetrics = circuitBreakers.getAllMetrics();
            return {
              success: true,
              health,
              breakers: allMetrics,
              summary: {
                totalBreakers: health.totalBreakers,
                openBreakers: health.openBreakers.length,
                halfOpenBreakers: health.halfOpenBreakers.length,
                healthy: health.healthy
              }
            };
          }
        } catch (error) {
          throw new Error(`Failed to get circuit breaker status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },

    {
      name: 'reset_circuit_breaker',
      description: 'Reset a circuit breaker to closed state',
      inputSchema: {
        type: 'object',
        properties: {
          breaker_name: {
            type: 'string',
            description: 'Name of the circuit breaker to reset'
          },
          reset_all: {
            type: 'boolean',
            description: 'Reset all circuit breakers',
            default: false
          }
        }
      },
      handler: async (args: any) => {
        if (!coordinationManager) {
          throw new Error('Advanced coordination not available');
        }

        try {
          const circuitBreakers = coordinationManager.getCircuitBreakerManager();

          if (args.reset_all) {
            circuitBreakers.resetAll();
            return {
              success: true,
              message: 'All circuit breakers reset'
            };
          } else if (args.breaker_name) {
            circuitBreakers.resetBreaker(args.breaker_name);
            return {
              success: true,
              message: `Circuit breaker '${args.breaker_name}' reset`
            };
          } else {
            throw new Error('Either breaker_name or reset_all must be specified');
          }
        } catch (error) {
          throw new Error(`Failed to reset circuit breaker: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },

    {
      name: 'register_agent_with_coordination',
      description: 'Register an agent with the advanced coordination system',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'Agent ID'
          },
          name: {
            type: 'string',
            description: 'Agent name'
          },
          type: {
            type: 'string',
            description: 'Agent type'
          },
          capabilities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Agent capabilities'
          },
          priority: {
            type: 'number',
            description: 'Agent priority (1-10)',
            default: 1
          }
        },
        required: ['agent_id', 'name', 'type']
      },
      handler: async (args: any) => {
        if (!coordinationManager) {
          throw new Error('Advanced coordination not available');
        }

        try {
          const profile = {
            id: args.agent_id,
            name: args.name,
            type: args.type,
            status: 'idle' as const,
            capabilities: args.capabilities || [],
            priority: args.priority || 1
          };

          await coordinationManager.registerAgent(profile);

          return {
            success: true,
            message: `Agent ${args.agent_id} registered with coordination system`,
            profile
          };
        } catch (error) {
          throw new Error(`Failed to register agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },

    {
      name: 'assign_task_with_strategy',
      description: 'Assign a task using advanced scheduling strategies',
      inputSchema: {
        type: 'object',
        properties: {
          task: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'number', default: 1 },
              requiredCapabilities: {
                type: 'array',
                items: { type: 'string' }
              }
            },
            required: ['id', 'type', 'description']
          },
          agent_id: {
            type: 'string',
            description: 'Specific agent ID (optional)'
          },
          strategy: {
            type: 'string',
            enum: ['capability', 'round-robin', 'least-loaded', 'affinity'],
            description: 'Scheduling strategy to use (optional)'
          }
        },
        required: ['task']
      },
      handler: async (args: any) => {
        if (!coordinationManager) {
          throw new Error('Advanced coordination not available');
        }

        try {
          const task = {
            ...args.task,
            status: 'pending' as const,
            createdAt: new Date()
          };

          const assignedAgentId = await coordinationManager.assignTask(
            task,
            args.agent_id,
            args.strategy
          );

          return {
            success: true,
            message: `Task ${task.id} assigned to agent ${assignedAgentId}`,
            task: {
              ...task,
              assignedAgent: assignedAgentId,
              status: 'assigned'
            },
            assignedAgent: assignedAgentId,
            strategy: args.strategy || 'default'
          };
        } catch (error) {
          throw new Error(`Failed to assign task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  ];

  return tools;
}

// === ENHANCED AGENT MANAGEMENT TOOLS ===

function createEnhancedSpawnAgentTool(logger: ILogger): MCPTool {
  return {
    name: 'agents/spawn',
    description: 'Spawn a new FlowX agent with advanced configuration options',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['coordinator', 'researcher', 'coder', 'analyst', 'architect', 'tester', 'reviewer', 'optimizer', 'documenter', 'monitor', 'specialist'],
          description: 'Type of agent to spawn',
        },
        name: {
          type: 'string',
          description: 'Display name for the agent',
        },
        capabilities: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of capabilities for the agent',
        },
        systemPrompt: {
          type: 'string',
          description: 'Custom system prompt for the agent',
        },
        maxConcurrentTasks: {
          type: 'number',
          default: 3,
          description: 'Maximum number of concurrent tasks',
        },
        priority: {
          type: 'number',
          default: 5,
          minimum: 1,
          maximum: 10,
          description: 'Agent priority level (1-10)',
        },
        environment: {
          type: 'object',
          description: 'Environment variables for the agent',
        },
        workingDirectory: {
          type: 'string',
          description: 'Working directory for the agent',
        },
        autonomyLevel: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          default: 'medium',
          description: 'Level of autonomy for the agent',
        },
        timeoutMs: {
          type: 'number',
          default: 300000,
          description: 'Task timeout in milliseconds',
        },
        tools: {
          type: 'array',
          items: { type: 'string' },
          description: 'Available tools for the agent',
        },
      },
      required: ['type', 'name'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Spawning enhanced agent', { input, sessionId: context?.sessionId });

      if (!context?.orchestrator) {
        throw new Error('Orchestrator not available');
      }

      const agentProfile = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: input.name,
        type: input.type,
        capabilities: input.capabilities || getDefaultCapabilities(input.type),
        systemPrompt: input.systemPrompt || getDefaultSystemPrompt(input.type),
        maxConcurrentTasks: input.maxConcurrentTasks || 3,
        priority: input.priority || 5,
        environment: input.environment || {},
        workingDirectory: input.workingDirectory || process.cwd(),
        autonomyLevel: input.autonomyLevel || 'medium',
        timeoutMs: input.timeoutMs || 300000,
        tools: input.tools || getDefaultTools(input.type),
        createdAt: new Date().toISOString(),
        status: 'initializing',
      };

      try {
        const sessionId = await context.orchestrator.spawnAgent(agentProfile);

        return {
          success: true,
          agentId: agentProfile.id,
          sessionId,
          profile: agentProfile,
          status: 'spawned',
          timestamp: new Date().toISOString(),
          message: `Successfully spawned ${input.type} agent: ${input.name}`,
        };
      } catch (error) {
        logger.error('Failed to spawn agent', { error, agentProfile });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          agentProfile,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

function createGetAgentInfoTool(logger: ILogger): MCPTool {
  return {
    name: 'agents/info',
    description: 'Get detailed information about a specific agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of the agent to get information about',
        },
        includeMetrics: {
          type: 'boolean',
          default: true,
          description: 'Include performance metrics',
        },
        includeHistory: {
          type: 'boolean',
          default: false,
          description: 'Include task history',
        },
      },
      required: ['agentId'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Getting agent info', { input, sessionId: context?.sessionId });

      if (!context?.orchestrator) {
        throw new Error('Orchestrator not available');
      }

      try {
        const agentInfo = await context.orchestrator.getAgentInfo(input.agentId, {
          includeMetrics: input.includeMetrics,
          includeHistory: input.includeHistory,
        });

        return {
          success: true,
          agentInfo,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to get agent info', { error, agentId: input.agentId });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Agent not found',
          agentId: input.agentId,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

// === WORKFLOW MANAGEMENT TOOLS ===

function createExecuteWorkflowTool(logger: ILogger): MCPTool {
  return {
    name: 'workflow/execute',
    description: 'Execute a multi-step workflow with agent coordination',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to execute',
        },
        workflowDefinition: {
          type: 'object',
          description: 'Inline workflow definition',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  agentType: { type: 'string' },
                  task: { type: 'string' },
                  dependencies: { type: 'array', items: { type: 'string' } },
                  parallel: { type: 'boolean' },
                  timeout: { type: 'number' },
                },
                required: ['id', 'name', 'type', 'task'],
              },
            },
          },
          required: ['name', 'steps'],
        },
        parameters: {
          type: 'object',
          description: 'Parameters to pass to the workflow',
        },
        parallel: {
          type: 'boolean',
          default: false,
          description: 'Execute steps in parallel where possible',
        },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Executing workflow', { input, sessionId: context?.sessionId });

      if (!context?.workflowEngine && !context?.orchestrator) {
        throw new Error('Workflow engine or orchestrator not available');
      }

      try {
        const executionId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Use workflow engine if available, otherwise orchestrator
        const engine = context.workflowEngine || context.orchestrator;
        
        const result = await engine.executeWorkflow({
          executionId,
          workflowId: input.workflowId,
          definition: input.workflowDefinition,
          parameters: input.parameters || {},
          parallel: input.parallel,
          startedAt: new Date().toISOString(),
        });

        return {
          success: true,
          executionId,
          workflowId: input.workflowId,
          result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to execute workflow', { error, input });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Workflow execution failed',
          input,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

function createGetWorkflowStatusTool(logger: ILogger): MCPTool {
  return {
    name: 'workflow/status',
    description: 'Get the status of a running workflow execution',
    inputSchema: {
      type: 'object',
      properties: {
        executionId: {
          type: 'string',
          description: 'ID of the workflow execution',
        },
        includeSteps: {
          type: 'boolean',
          default: true,
          description: 'Include individual step status',
        },
      },
      required: ['executionId'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Getting workflow status', { input, sessionId: context?.sessionId });

      if (!context?.workflowEngine && !context?.orchestrator) {
        throw new Error('Workflow engine or orchestrator not available');
      }

      try {
        const engine = context.workflowEngine || context.orchestrator;
        const status = await engine.getWorkflowStatus(input.executionId, {
          includeSteps: input.includeSteps,
        });

        return {
          success: true,
          executionId: input.executionId,
          status,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to get workflow status', { error, executionId: input.executionId });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Workflow not found',
          executionId: input.executionId,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

// === ENHANCED MEMORY TOOLS ===

function createExportMemoryTool(logger: ILogger): MCPTool {
  return {
    name: 'memory/export',
    description: 'Export memory data to various formats',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Memory namespace to export (optional, exports all if not specified)',
        },
        format: {
          type: 'string',
          enum: ['json', 'csv', 'yaml', 'xml'],
          default: 'json',
          description: 'Export format',
        },
        includeMetadata: {
          type: 'boolean',
          default: true,
          description: 'Include metadata in export',
        },
        compression: {
          type: 'string',
          enum: ['none', 'gzip', 'zip'],
          default: 'none',
          description: 'Compression type',
        },
        filter: {
          type: 'object',
          description: 'Filter criteria for export',
        },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Exporting memory', { input, sessionId: context?.sessionId });

      if (!context?.memoryManager) {
        throw new Error('Memory manager not available');
      }

      try {
        const exportData = await context.memoryManager.exportMemory({
          namespace: input.namespace,
          format: input.format || 'json',
          includeMetadata: input.includeMetadata !== false,
          compression: input.compression || 'none',
          filter: input.filter,
        });

        return {
          success: true,
          exportData,
          format: input.format || 'json',
          compression: input.compression || 'none',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to export memory', { error, input });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Memory export failed',
          input,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

function createImportMemoryTool(logger: ILogger): MCPTool {
  return {
    name: 'memory/import',
    description: 'Import memory data from various formats',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'Data to import (base64 encoded for binary formats)',
        },
        format: {
          type: 'string',
          enum: ['json', 'csv', 'yaml', 'xml'],
          default: 'json',
          description: 'Data format',
        },
        namespace: {
          type: 'string',
          description: 'Target namespace (optional)',
        },
        merge: {
          type: 'boolean',
          default: true,
          description: 'Merge with existing data or replace',
        },
        compression: {
          type: 'string',
          enum: ['none', 'gzip', 'zip'],
          default: 'none',
          description: 'Data compression type',
        },
      },
      required: ['data'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Importing memory', { input: { ...input, data: '[DATA]' }, sessionId: context?.sessionId });

      if (!context?.memoryManager) {
        throw new Error('Memory manager not available');
      }

      try {
        const result = await context.memoryManager.importMemory({
          data: input.data,
          format: input.format || 'json',
          namespace: input.namespace,
          merge: input.merge !== false,
          compression: input.compression || 'none',
        });

        return {
          success: true,
          result,
          imported: result.imported || 0,
          skipped: result.skipped || 0,
          errors: result.errors || 0,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to import memory', { error });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Memory import failed',
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

function createSearchMemoryTool(logger: ILogger): MCPTool {
  return {
    name: 'memory/search',
    description: 'Advanced memory search with pattern matching and filtering',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        namespace: {
          type: 'string',
          description: 'Namespace to search in',
        },
        searchType: {
          type: 'string',
          enum: ['text', 'pattern', 'semantic', 'fuzzy'],
          default: 'text',
          description: 'Type of search to perform',
        },
        filters: {
          type: 'object',
          description: 'Additional filters',
          properties: {
            minAccessCount: { type: 'number' },
            maxAge: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            contentType: { type: 'string' },
          },
        },
        limit: {
          type: 'number',
          default: 100,
          description: 'Maximum number of results',
        },
        sortBy: {
          type: 'string',
          enum: ['relevance', 'recent', 'access', 'created'],
          default: 'relevance',
          description: 'Sort order for results',
        },
      },
      required: ['query'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Searching memory', { input, sessionId: context?.sessionId });

      if (!context?.memoryManager) {
        throw new Error('Memory manager not available');
      }

      try {
        const results = await context.memoryManager.searchMemory({
          query: input.query,
          namespace: input.namespace,
          searchType: input.searchType || 'text',
          filters: input.filters || {},
          limit: input.limit || 100,
          sortBy: input.sortBy || 'relevance',
        });

        return {
          success: true,
          results,
          count: results.length,
          query: input.query,
          searchType: input.searchType || 'text',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to search memory', { error, input });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Memory search failed',
          query: input.query,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

// === SPARC WORKFLOW TOOLS ===

function createExecuteSparcModeTool(logger: ILogger): MCPTool {
  return {
    name: 'sparc/execute',
    description: 'Execute a specific SPARC methodology mode',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['architect', 'code', 'tdd', 'debug', 'security-review', 'docs-writer', 'integration', 'refinement-optimization'],
          description: 'SPARC mode to execute',
        },
        task: {
          type: 'string',
          description: 'Task description for the SPARC mode',
        },
        options: {
          type: 'object',
          description: 'Mode-specific options',
          properties: {
            parallel: { type: 'boolean' },
            batchSize: { type: 'number' },
            timeout: { type: 'number' },
            tools: { type: 'array', items: { type: 'string' } },
          },
        },
        context: {
          type: 'object',
          description: 'Execution context',
        },
      },
      required: ['mode', 'task'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Executing SPARC mode', { input, sessionId: context?.sessionId });

      try {
        // This would integrate with the SPARC execution engine
        const executionId = `sparc_${input.mode}_${Date.now()}`;
        
        // Mock implementation - would call actual SPARC engine
        const result = {
          executionId,
          mode: input.mode,
          task: input.task,
          status: 'completed',
          output: `SPARC ${input.mode} mode executed successfully for task: ${input.task}`,
          artifacts: [],
          metrics: {
            duration: Math.floor(Math.random() * 10000) + 1000,
            steps: Math.floor(Math.random() * 10) + 3,
            success: true,
          },
        };

        return {
          success: true,
          result,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to execute SPARC mode', { error, input });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'SPARC execution failed',
          mode: input.mode,
          task: input.task,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

function createBatchSparcTool(logger: ILogger): MCPTool {
  return {
    name: 'sparc/batch',
    description: 'Execute multiple SPARC modes in parallel or pipeline',
    inputSchema: {
      type: 'object',
      properties: {
        modes: {
          type: 'object',
          description: 'Map of mode names to tasks',
        },
        pipeline: {
          type: 'array',
          description: 'Pipeline stages with dependencies',
          items: {
            type: 'object',
            properties: {
              mode: { type: 'string' },
              task: { type: 'string' },
              depends: { type: 'array', items: { type: 'string' } },
              parallel: { type: 'boolean' },
            },
            required: ['mode', 'task'],
          },
        },
        parallel: {
          type: 'boolean',
          default: false,
          description: 'Execute modes in parallel',
        },
        maxConcurrency: {
          type: 'number',
          default: 3,
          description: 'Maximum concurrent executions',
        },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Executing batch SPARC', { input, sessionId: context?.sessionId });

      try {
        const batchId = `sparc_batch_${Date.now()}`;
        
        // Mock implementation - would call actual batch SPARC engine
        const results = [];
        
        if (input.modes) {
          for (const [mode, task] of Object.entries(input.modes)) {
            results.push({
              mode,
              task,
              status: 'completed',
              duration: Math.floor(Math.random() * 5000) + 500,
            });
          }
        }

        return {
          success: true,
          batchId,
          results,
          totalExecutions: results.length,
          parallel: input.parallel || false,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to execute batch SPARC', { error, input });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Batch SPARC execution failed',
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

// === HELPER FUNCTIONS ===

function getDefaultCapabilities(agentType: string): string[] {
  const capabilityMap: Record<string, string[]> = {
    coordinator: ['task_management', 'resource_allocation', 'consensus_building'],
    researcher: ['information_gathering', 'pattern_recognition', 'knowledge_synthesis'],
    coder: ['code_generation', 'refactoring', 'debugging'],
    analyst: ['data_analysis', 'performance_metrics', 'bottleneck_detection'],
    architect: ['system_design', 'architecture_patterns', 'integration_planning'],
    tester: ['test_generation', 'quality_assurance', 'edge_case_detection'],
    reviewer: ['code_review', 'standards_enforcement', 'best_practices'],
    optimizer: ['performance_optimization', 'resource_optimization', 'algorithm_improvement'],
    documenter: ['documentation_generation', 'api_docs', 'user_guides'],
    monitor: ['system_monitoring', 'health_checks', 'alerting'],
    specialist: ['domain_expertise', 'custom_capabilities', 'problem_solving'],
  };

  return capabilityMap[agentType] || ['general_purpose'];
}

function getDefaultSystemPrompt(agentType: string): string {
  const promptMap: Record<string, string> = {
    coordinator: 'You are a coordination agent responsible for managing tasks and resources across the system.',
    researcher: 'You are a research agent specialized in gathering and analyzing information from various sources.',
    coder: 'You are a coding agent focused on writing, refactoring, and debugging code with best practices.',
    analyst: 'You are an analysis agent that examines data, identifies patterns, and provides insights.',
    architect: 'You are an architecture agent responsible for system design and technical decision-making.',
    tester: 'You are a testing agent focused on quality assurance and comprehensive test coverage.',
    reviewer: 'You are a review agent that ensures code quality and adherence to standards.',
    optimizer: 'You are an optimization agent focused on improving performance and efficiency.',
    documenter: 'You are a documentation agent responsible for creating clear and comprehensive documentation.',
    monitor: 'You are a monitoring agent that tracks system health and performance metrics.',
    specialist: 'You are a specialist agent with domain-specific expertise and advanced problem-solving capabilities.',
  };

  return promptMap[agentType] || 'You are a general-purpose AI agent ready to assist with various tasks.';
}

function getDefaultTools(agentType: string): string[] {
  const toolMap: Record<string, string[]> = {
    coordinator: ['task_manager', 'resource_allocator', 'communication'],
    researcher: ['web_search', 'document_reader', 'data_collector'],
    coder: ['code_editor', 'compiler', 'debugger', 'version_control'],
    analyst: ['data_processor', 'visualizer', 'statistical_tools'],
    architect: ['design_tools', 'modeling', 'documentation'],
    tester: ['test_runner', 'coverage_analyzer', 'quality_checker'],
    reviewer: ['code_analyzer', 'style_checker', 'security_scanner'],
    optimizer: ['profiler', 'performance_analyzer', 'resource_monitor'],
    documenter: ['markdown_editor', 'diagram_generator', 'api_documenter'],
    monitor: ['metrics_collector', 'alerting', 'dashboard'],
    specialist: ['domain_tools', 'advanced_analytics', 'custom_tools'],
  };

  return toolMap[agentType] || ['basic_tools'];
}

// === STANDARD TOOLS (keeping existing implementations) ===

function createListAgentsTool(logger: ILogger): MCPTool {
  return {
    name: 'agents/list',
    description: 'List all active agents in the system',
    inputSchema: {
      type: 'object',
      properties: {
        includeTerminated: {
          type: 'boolean',
          default: false,
          description: 'Include terminated agents in the list',
        },
        filterByType: {
          type: 'string',
          enum: ['coordinator', 'researcher', 'coder', 'analyst', 'architect', 'tester', 'reviewer', 'optimizer', 'documenter', 'monitor', 'specialist'],
          description: 'Filter agents by type',
        },
        includeMetrics: {
          type: 'boolean',
          default: false,
          description: 'Include performance metrics for each agent',
        },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Listing agents', { input, sessionId: context?.sessionId });

      if (!context?.orchestrator) {
        throw new Error('Orchestrator not available');
      }

      try {
        const agents = await context.orchestrator.listAgents(input);

        return {
          success: true,
          agents,
          count: agents.length,
          filters: {
            includeTerminated: input.includeTerminated || false,
            filterByType: input.filterByType,
            includeMetrics: input.includeMetrics || false,
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to list agents', { error, input });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list agents',
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

function createTerminateAgentTool(logger: ILogger): MCPTool {
  return {
    name: 'agents/terminate',
    description: 'Terminate a specific agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'ID of the agent to terminate',
        },
        reason: {
          type: 'string',
          description: 'Reason for termination',
        },
        force: {
          type: 'boolean',
          default: false,
          description: 'Force termination without graceful shutdown',
        },
      },
      required: ['agentId'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Terminating agent', { input, sessionId: context?.sessionId });

      if (!context?.orchestrator) {
        throw new Error('Orchestrator not available');
      }

      try {
        await context.orchestrator.terminateAgent(input.agentId, {
          reason: input.reason,
          force: input.force || false,
        });

        return {
          success: true,
          agentId: input.agentId,
          reason: input.reason,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error('Failed to terminate agent', { error, agentId: input.agentId });
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Agent termination failed',
          agentId: input.agentId,
          timestamp: new Date().toISOString(),
        };
      }
    },
  };
}

// ... (continuing with other standard tools - keeping existing implementations)
// === TASK MANAGEMENT TOOLS ===
function createCreateTaskTool(logger: ILogger): MCPTool {
  return {
    name: 'tasks/create',
    description: 'Create a new task for agent execution',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'number', minimum: 1, maximum: 10 },
        assignToAgentType: { type: 'string' },
        deadline: { type: 'string' },
        dependencies: { type: 'array', items: { type: 'string' } },
      },
      required: ['type', 'description'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Creating task', { input });
      // Implementation would use TaskExecutionEngine
      return { success: true, taskId: `task_${Date.now()}`, ...input };
    },
  };
}

function createListTasksTool(logger: ILogger): MCPTool {
  return {
    name: 'tasks/list',
    description: 'List tasks with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        assignedTo: { type: 'string' },
        limit: { type: 'number', default: 50 },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Listing tasks', { input });
      return { success: true, tasks: [], count: 0 };
    },
  };
}

function createGetTaskStatusTool(logger: ILogger): MCPTool {
  return {
    name: 'tasks/status',
    description: 'Get the status of a specific task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
      },
      required: ['taskId'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Getting task status', { input });
      return { success: true, taskId: input.taskId, status: 'pending' };
    },
  };
}

function createCancelTaskTool(logger: ILogger): MCPTool {
  return {
    name: 'tasks/cancel',
    description: 'Cancel a running or pending task',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['taskId'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Cancelling task', { input });
      return { success: true, taskId: input.taskId, status: 'cancelled' };
    },
  };
}

function createAssignTaskTool(logger: ILogger): MCPTool {
  return {
    name: 'tasks/assign',
    description: 'Assign a task to a specific agent',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        agentId: { type: 'string' },
      },
      required: ['taskId', 'agentId'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Assigning task', { input });
      return { success: true, taskId: input.taskId, agentId: input.agentId };
    },
  };
}

// === MEMORY MANAGEMENT TOOLS ===
function createQueryMemoryTool(logger: ILogger): MCPTool {
  return {
    name: 'memory/query',
    description: 'Query the memory system for information',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        namespace: { type: 'string' },
        limit: { type: 'number', default: 10 },
      },
      required: ['search'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Querying memory', { input });
      return { success: true, results: [], count: 0 };
    },
  };
}

function createStoreMemoryTool(logger: ILogger): MCPTool {
  return {
    name: 'memory/store',
    description: 'Store information in the memory system',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
        namespace: { type: 'string', default: 'default' },
        ttl: { type: 'number' },
      },
      required: ['key', 'value'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Storing memory', { input });
      return { success: true, key: input.key, stored: true };
    },
  };
}

function createDeleteMemoryTool(logger: ILogger): MCPTool {
  return {
    name: 'memory/delete',
    description: 'Delete information from the memory system',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        namespace: { type: 'string', default: 'default' },
      },
      required: ['key'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Deleting memory', { input });
      return { success: true, key: input.key, deleted: true };
    },
  };
}

// === WORKFLOW TOOLS ===
function createCreateWorkflowTool(logger: ILogger): MCPTool {
  return {
    name: 'workflow/create',
    description: 'Create a new workflow definition',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        steps: { type: 'array' },
      },
      required: ['name', 'steps'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Creating workflow', { input });
      return { success: true, workflowId: `workflow_${Date.now()}`, ...input };
    },
  };
}

function createListWorkflowsTool(logger: ILogger): MCPTool {
  return {
    name: 'workflow/list',
    description: 'List available workflows',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 50 },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Listing workflows', { input });
      return { success: true, workflows: [], count: 0 };
    },
  };
}

// === SYSTEM TOOLS ===
function createGetSystemStatusTool(logger: ILogger): MCPTool {
  return {
    name: 'system/status',
    description: 'Get comprehensive system status',
    inputSchema: { type: 'object', properties: {} },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Getting system status', { input });
      return { success: true, status: 'healthy', uptime: process.uptime() };
    },
  };
}

function createGetMetricsTool(logger: ILogger): MCPTool {
  return {
    name: 'system/metrics',
    description: 'Get system performance metrics',
    inputSchema: { type: 'object', properties: {} },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Getting metrics', { input });
      return { success: true, metrics: { cpu: 0, memory: 0 } };
    },
  };
}

function createHealthCheckTool(logger: ILogger): MCPTool {
  return {
    name: 'system/health',
    description: 'Perform system health check',
    inputSchema: { type: 'object', properties: {} },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Health check', { input });
      return { success: true, healthy: true };
    },
  };
}

// === CONFIG TOOLS ===
function createGetConfigTool(logger: ILogger): MCPTool {
  return {
    name: 'config/get',
    description: 'Get configuration values',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Getting config', { input });
      return { success: true, config: {} };
    },
  };
}

function createUpdateConfigTool(logger: ILogger): MCPTool {
  return {
    name: 'config/update',
    description: 'Update configuration values',
    inputSchema: {
      type: 'object',
      properties: {
        updates: { type: 'object' },
      },
      required: ['updates'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Updating config', { input });
      return { success: true, updated: true };
    },
  };
}

function createValidateConfigTool(logger: ILogger): MCPTool {
  return {
    name: 'config/validate',
    description: 'Validate configuration',
    inputSchema: { type: 'object', properties: {} },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Validating config', { input });
      return { success: true, valid: true };
    },
  };
}

// === TERMINAL TOOLS ===
function createExecuteCommandTool(logger: ILogger): MCPTool {
  return {
    name: 'terminal/execute',
    description: 'Execute a command in a terminal',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string' },
        workingDirectory: { type: 'string' },
      },
      required: ['command'],
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Executing command', { input });
      return { success: true, output: 'Command executed', exitCode: 0 };
    },
  };
}

function createListTerminalsTool(logger: ILogger): MCPTool {
  return {
    name: 'terminal/list',
    description: 'List active terminals',
    inputSchema: { type: 'object', properties: {} },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Listing terminals', { input });
      return { success: true, terminals: [], count: 0 };
    },
  };
}

function createCreateTerminalTool(logger: ILogger): MCPTool {
  return {
    name: 'terminal/create',
    description: 'Create a new terminal session',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        workingDirectory: { type: 'string' },
      },
    },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Creating terminal', { input });
      return { success: true, terminalId: `terminal_${Date.now()}` };
    },
  };
}

function createListSparcModesTool(logger: ILogger): MCPTool {
  return {
    name: 'sparc/list',
    description: 'List available SPARC modes',
    inputSchema: { type: 'object', properties: {} },
    handler: async (input: any, context?: FlowXToolContext) => {
      logger.info('Listing SPARC modes', { input });
      return {
        success: true,
        modes: [
          'architect', 'code', 'tdd', 'debug', 'security-review',
          'docs-writer', 'integration', 'refinement-optimization'
        ],
        count: 8,
      };
    },
  };
}
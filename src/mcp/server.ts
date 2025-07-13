/**
 * MCP (Model Context Protocol) server implementation
 */

import {
  MCPConfig,
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPTool,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPSession,
  MCPMetrics,
  MCPProtocolVersion,
  MCPCapabilities,
  MCPContext,
} from "../utils/types.ts";
import { IEventBus } from "../core/event-bus.ts";
import { ILogger } from "../core/logger.ts";
import { MCPError as MCPErrorClass, MCPMethodNotFoundError } from "../utils/errors.ts";
import { ITransport } from "./transports/base.ts";
import { StdioTransport } from "./transports/stdio.ts";
import { HttpTransport } from "./transports/http.ts";
import { ToolRegistry } from "./tools.ts";
import { RequestRouter } from "./router.ts";
import { SessionManager, ISessionManager } from "./session-manager.ts";
import { AuthManager, IAuthManager } from "./auth.ts";
import { LoadBalancer, ILoadBalancer, RequestQueue } from "./load-balancer.ts";
import { createFlowXTools, FlowXToolContext } from "./flowx-tools.ts";
import { createSwarmTools, SwarmToolContext } from "./swarm-tools.ts";
import { platform, arch } from 'node:os';
import { performance } from 'node:perf_hooks';

export interface IMCPServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  registerTool(tool: MCPTool): void;
  getHealthStatus(): Promise<{
    healthy: boolean;
    error?: string;
    metrics?: Record<string, number>;
  }>;
  getMetrics(): MCPMetrics;
  getSessions(): MCPSession[];
  getSession(sessionId: string): MCPSession | undefined;
  terminateSession(sessionId: string): void;
}

/**
 * MCP server implementation
 */
export class MCPServer implements IMCPServer {
  private transport: ITransport;
  private toolRegistry: ToolRegistry;
  private router: RequestRouter;
  private sessionManager: ISessionManager;
  private authManager: IAuthManager;
  private loadBalancer?: ILoadBalancer;
  private requestQueue?: RequestQueue;
  private running = false;
  private currentSession?: MCPSession | undefined;

  private readonly serverInfo = {
    name: 'Claude-Flow MCP Server',
    version: '1.0.0',
  };
  
  private toolMetrics: Record<string, { count: number, errors: number, totalTime: number }> = {};
  private errorCounts: Record<string, number> = {};

  private readonly supportedProtocolVersion: MCPProtocolVersion = {
    major: 2024,
    minor: 11,
    patch: 5,
  };

  private readonly serverCapabilities: MCPCapabilities = {
    logging: {
      level: 'info',
    },
    tools: {
      listChanged: true,
    },
    resources: {
      listChanged: false,
      subscribe: false,
    },
    prompts: {
      listChanged: false,
    },
  };

  constructor(
    private config: MCPConfig,
    private eventBus: IEventBus,
    private logger: ILogger,
    private orchestrator?: any, // Reference to orchestrator instance
    private swarmCoordinator?: any, // Reference to swarm coordinator instance
    private agentManager?: any, // Reference to agent manager instance
    private resourceManager?: any, // Reference to resource manager instance
    private messagebus?: any, // Reference to message bus instance
    private monitor?: any, // Reference to real-time monitor instance
  ) {
    // Initialize transport
    this.transport = this.createTransport();
    
    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(logger);
    
    // Initialize session manager
    this.sessionManager = new SessionManager(config, logger);
    
    // Initialize auth manager
    this.authManager = new AuthManager(config.auth || { enabled: false, method: 'token' }, logger);
    
    // Initialize load balancer if enabled
    if (config.loadBalancer?.enabled) {
      this.loadBalancer = new LoadBalancer(config.loadBalancer, logger);
      this.requestQueue = new RequestQueue(1000, 30000, logger);
    }
    
    // Initialize request router
    this.router = new RequestRouter(this.toolRegistry, logger);
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new MCPErrorClass('MCP server already running');
    }

    this.logger.info('Starting MCP server');

    try {
      // Start session manager
      if (this.sessionManager && 'start' in this.sessionManager) {
        (this.sessionManager as any).start();
      }

      // Start transport
      await this.transport.start();

      // Register built-in tools
      this.registerBuiltInTools();

      this.running = true;
      this.logger.info('MCP server started successfully');
    } catch (error) {
      this.logger.error('Failed to start MCP server', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.logger.info('Stopping MCP server');

    try {
      // Stop transport
      await this.transport.stop();

      // Stop session manager
      if (this.sessionManager && 'stop' in this.sessionManager) {
        (this.sessionManager as any).stop();
      }

      // Clean up session manager
      if (this.sessionManager && 'destroy' in this.sessionManager) {
        (this.sessionManager as any).destroy();
      }

      // Clean up load balancer
      if (this.loadBalancer && 'destroy' in this.loadBalancer) {
        (this.loadBalancer as any).destroy();
      }

      // Clean up auth manager
      if (this.authManager && 'destroy' in this.authManager) {
        (this.authManager as any).destroy();
      }

      // Clean up all sessions
      for (const session of this.sessionManager.getActiveSessions()) {
        this.sessionManager.removeSession(session.id);
      }

      this.running = false;
      this.currentSession = undefined;
      this.logger.info('MCP server stopped');
    } catch (error) {
      this.logger.error('Error stopping MCP server', error);
      throw error;
    }
  }

  registerTool(tool: MCPTool): void {
    this.toolRegistry.register(tool);
    this.logger.info('Tool registered', { name: tool.name });
  }

  async getHealthStatus(): Promise<{ 
    healthy: boolean; 
    error?: string; 
    metrics?: Record<string, number>;
  }> {
    try {
      const transportHealth = await this.transport.getHealthStatus();
      const registeredTools = this.toolRegistry.getToolCount();
      const { totalRequests, successfulRequests, failedRequests } = this.router.getMetrics();
      const sessionMetrics = this.sessionManager.getSessionMetrics();

      const metrics: Record<string, number> = {
        registeredTools,
        totalRequests,
        successfulRequests,
        failedRequests,
        totalSessions: sessionMetrics.total,
        activeSessions: sessionMetrics.active,
        authenticatedSessions: sessionMetrics.authenticated,
        expiredSessions: sessionMetrics.expired,
        ...transportHealth.metrics,
      };

      if (this.loadBalancer) {
        const lbMetrics = this.loadBalancer.getMetrics();
        metrics.rateLimitedRequests = lbMetrics.rateLimitedRequests;
        metrics.averageResponseTime = lbMetrics.averageResponseTime;
        metrics.requestsPerSecond = lbMetrics.requestsPerSecond;
        metrics.circuitBreakerTrips = lbMetrics.circuitBreakerTrips;
      }

      const status: { healthy: boolean; error?: string; metrics?: Record<string, number> } = {
        healthy: this.running && transportHealth.healthy,
        metrics,
      };
      if (transportHealth.error !== undefined) {
        status.error = transportHealth.error;
      }
      return status;
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getMetrics(): MCPMetrics {
    const routerMetrics = this.router.getMetrics();
    const sessionMetrics = this.sessionManager.getSessionMetrics();
    const lbMetrics = this.loadBalancer?.getMetrics();

    return {
      totalRequests: routerMetrics.totalRequests,
      successfulRequests: routerMetrics.successfulRequests,
      failedRequests: routerMetrics.failedRequests,
      averageResponseTime: lbMetrics?.averageResponseTime || 0,
      activeSessions: sessionMetrics.active,
      toolInvocations: Object.fromEntries(
        Object.entries(this.getToolInvocations()).map(([key, value]) => [key, value.count])
      ),
      errors: this.getErrorMetrics(),
      lastReset: lbMetrics?.lastReset || new Date(),
    };
  }

  getSessions(): MCPSession[] {
    return this.sessionManager.getActiveSessions();
  }

  getSession(sessionId: string): MCPSession | undefined {
    return this.sessionManager.getSession(sessionId);
  }

  terminateSession(sessionId: string): void {
    this.sessionManager.removeSession(sessionId);
    if (this.currentSession?.id === sessionId) {
      this.currentSession = undefined;
    }
  }

  private async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    this.logger.debug('Handling MCP request', { 
      id: request.id,
      method: request.method,
    });

    try {
      // Handle initialization request separately
      if (request.method === 'initialize') {
        return await this.handleInitialize(request);
      }

      // Get or create session
      const session = this.getOrCreateSession();
      
      // Check if session is initialized for non-initialize requests
      if (!session.isInitialized) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32002,
            message: 'Server not initialized',
          },
        };
      }

      // Update session activity
      this.sessionManager.updateActivity(session.id);

      // Check load balancer constraints
      if (this.loadBalancer) {
        const allowed = await this.loadBalancer.shouldAllowRequest(session, request);
        if (!allowed) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32000,
              message: 'Rate limit exceeded or circuit breaker open',
            },
          };
        }
      }

      // Record request start
      const requestMetrics = this.loadBalancer?.recordRequestStart(session, request);

      try {
        // Track tool metrics start time
        const startTime = performance.now();
        const toolName = request.method;
        
        // Process request through router
        const result = await this.router.route(request);
        
        // Update tool metrics on success
        this.updateToolMetrics(toolName, performance.now() - startTime);
        
        const response: MCPResponse = {
          jsonrpc: '2.0',
          id: request.id,
          result,
        };

        // Record success
        if (requestMetrics) {
          this.loadBalancer?.recordRequestEnd(requestMetrics, response);
        }

        return response;
      } catch (error) {
        // Record tool error
        const toolName = request.method;
        this.updateToolMetricsError(toolName);
        
        // Categorize error
        this.updateErrorMetrics(error);
        
        // Record failure
        if (requestMetrics) {
          this.loadBalancer?.recordRequestEnd(requestMetrics, undefined, error as Error);
        }
        throw error;
      }
    } catch (error) {
      this.logger.error('Error handling MCP request', { 
        id: request.id,
        method: request.method,
        error,
      });
      
      // Categorize error
      this.updateErrorMetrics(error);
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: this.errorToMCPError(error),
      };
    }
  }

  private async handleInitialize(request: MCPRequest): Promise<MCPResponse> {
    try {
      const params = request.params as MCPInitializeParams;
      
      if (!params) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32602,
            message: 'Invalid params',
          },
        };
      }

      // Create session
      const session = this.sessionManager.createSession(this.config.transport);
      this.currentSession = session;

      // Initialize session
      this.sessionManager.initializeSession(session.id, params);

      // Prepare response
      const result: MCPInitializeResult = {
        protocolVersion: this.supportedProtocolVersion,
        capabilities: this.serverCapabilities,
        serverInfo: this.serverInfo,
        instructions: 'Claude-Flow MCP Server ready for tool execution',
      };

      this.logger.info('Session initialized', {
        sessionId: session.id,
        clientInfo: params.clientInfo,
        protocolVersion: params.protocolVersion,
      });

      return {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };
    } catch (error) {
      this.logger.error('Error during initialization', error);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: this.errorToMCPError(error),
      };
    }
  }

  private getOrCreateSession(): MCPSession {
    if (this.currentSession) {
      return this.currentSession;
    }

    // For stdio transport, create a default session
    const session = this.sessionManager.createSession(this.config.transport);
    this.currentSession = session;
    return session;
  }

  private createTransport(): ITransport {
    switch (this.config.transport) {
      case 'stdio':
        return new StdioTransport(this.logger);
      
      case 'http':
        return new HttpTransport(
          this.config.host || 'localhost',
          this.config.port || 3000,
          this.config.tlsEnabled || false,
          this.logger,
        );
      
      default:
        throw new MCPErrorClass(`Unknown transport type: ${this.config.transport}`);
    }
  }

  private registerBuiltInTools(): void {
    // System information tool
    this.registerTool({
      name: 'system/info',
      description: 'Get system information',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return {
          version: '1.0.0',
          platform: platform(),
          arch: arch(),
          runtime: 'Node.ts',
          uptime: performance.now(),
        };
      },
    });

    // Health check tool
    this.registerTool({
      name: 'system/health',
      description: 'Get system health status',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return await this.getHealthStatus();
      },
    });

    // List tools
    this.registerTool({
      name: 'tools/list',
      description: 'List all available tools',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async () => {
        return this.toolRegistry.listTools();
      },
    });

    // Tool schema
    this.registerTool({
      name: 'tools/schema',
      description: 'Get schema for a specific tool',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      handler: async (input: any) => {
        const tool = this.toolRegistry.getTool(input.name);
        if (!tool) {
          throw new Error(`Tool not found: ${input.name}`);
        }
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        };
      },
    });

    // Register Claude-Flow specific tools if orchestrator is available
    if (this.orchestrator) {
      const claudeFlowTools = createFlowXTools(this.logger);
      
      for (const tool of claudeFlowTools) {
        // Wrap the handler to inject orchestrator context
        const originalHandler = tool.handler;
        tool.handler = async (input: unknown, context?: MCPContext) => {
          const claudeFlowContext: FlowXToolContext = {
            ...context,
            orchestrator: this.orchestrator,
          } as FlowXToolContext;
          
          return await originalHandler(input, claudeFlowContext);
        };
        
        this.registerTool(tool);
      }
      
      this.logger.info('Registered Claude-Flow tools', { count: claudeFlowTools.length });
    } else {
      this.logger.warn('Orchestrator not available - Claude-Flow tools not registered');
    }

    // Register Swarm-specific tools if swarm components are available
    if (this.swarmCoordinator || this.agentManager || this.resourceManager) {
      const swarmTools = createSwarmTools(this.logger);
      
      for (const tool of swarmTools) {
        // Wrap the handler to inject swarm context
        const originalHandler = tool.handler;
        tool.handler = async (input: unknown, context?: MCPContext) => {
          const swarmContext: SwarmToolContext = {
            ...context,
            swarmCoordinator: this.swarmCoordinator,
            agentManager: this.agentManager,
            resourceManager: this.resourceManager,
            messageBus: this.messagebus,
            monitor: this.monitor,
          } as SwarmToolContext;
          
          return await originalHandler(input, swarmContext);
        };
        
        this.registerTool(tool);
      }
      
      this.logger.info('Registered Swarm tools', { count: swarmTools.length });
    } else {
      this.logger.warn('Swarm components not available - Swarm tools not registered');
    }
  }

  private errorToMCPError(error: unknown): MCPError {
    if (error instanceof MCPMethodNotFoundError) {
      return {
        code: -32601,
        message: error.message,
        data: error.details,
      };
    }

    if (error instanceof MCPErrorClass) {
      return {
        code: -32603,
        message: error.message,
        data: error.details,
      };
    }

    if (error instanceof Error) {
      return {
        code: -32603,
        message: error.message,
      };
    }

    return {
      code: -32603,
      message: 'Internal error',
      data: error,
    };
  }
  
  private updateToolMetrics(toolName: string, executionTime: number): void {
    if (!this.toolMetrics[toolName]) {
      this.toolMetrics[toolName] = { count: 0, errors: 0, totalTime: 0 };
    }
    
    this.toolMetrics[toolName].count++;
    this.toolMetrics[toolName].totalTime += executionTime;
  }
  
  private updateToolMetricsError(toolName: string): void {
    if (!this.toolMetrics[toolName]) {
      this.toolMetrics[toolName] = { count: 0, errors: 0, totalTime: 0 };
    }
    
    this.toolMetrics[toolName].errors++;
  }
  
  private updateErrorMetrics(error: unknown): void {
    let category = 'unknown';
    
    if (error instanceof MCPMethodNotFoundError) {
      category = 'method_not_found';
    } else if (error instanceof MCPErrorClass) {
      category = 'mcp_error';
    } else if (error instanceof URIError || error instanceof TypeError) {
      category = 'protocol_error';
    } else if (error instanceof SyntaxError) {
      category = 'parsing_error';
    } else if (error instanceof Error) {
      // Categorize common error patterns
      const message = error.message.toLowerCase();
      if (message.includes('permission') || message.includes('access') || message.includes('auth')) {
        category = 'permission_denied';
      } else if (message.includes('timeout') || message.includes('time out')) {
        category = 'timeout';
      } else if (message.includes('not found') || message.includes('missing')) {
        category = 'not_found';
      } else if (message.includes('invalid') || message.includes('bad')) {
        category = 'invalid_input';
      } else {
        category = 'general_error';
      }
    }
    
    this.errorCounts[category] = (this.errorCounts[category] || 0) + 1;
  }
  
  private getToolInvocations(): Record<string, { count: number; errors: number; avgTime: number }> {
    const result: Record<string, { count: number; errors: number; avgTime: number }> = {};
    
    for (const [tool, metrics] of Object.entries(this.toolMetrics)) {
      result[tool] = {
        count: metrics.count,
        errors: metrics.errors,
        avgTime: metrics.count > 0 ? Math.round(metrics.totalTime / metrics.count) : 0
      };
    }
    
    return result;
  }
  
  private getErrorMetrics(): Record<string, number> {
    return { ...this.errorCounts };
  }
}
/**
 * MCP (Model Context Protocol) Module
 * Export all MCP components for easy integration
 */

// Core MCP Server
export { MCPServer, type IMCPServer } from "./server.ts";

// Lifecycle Management
export { 
  MCPLifecycleManager, 
  LifecycleState,
  type LifecycleEvent,
  type HealthCheckResult,
  type LifecycleManagerConfig 
} from "./lifecycle-manager.ts";

// Tool Registry and Management
export { 
  ToolRegistry,
  type ToolCapability,
  type ToolMetrics,
  type ToolDiscoveryQuery 
} from "./tools.ts";

// Protocol Management
export { 
  MCPProtocolManager,
  type ProtocolVersionInfo,
  type CompatibilityResult,
  type NegotiationResult 
} from "./protocol-manager.ts";

// Authentication and Authorization
export { 
  AuthManager,
  type IAuthManager,
  type AuthResult,
  type TokenValidation,
  Permissions 
} from "./auth.ts";

// Performance Monitoring
export { 
  MCPPerformanceMonitor,
  type PerformanceMetrics,
  type RequestMetrics,
  type AlertRule,
  type Alert,
  type OptimizationSuggestion 
} from "./performance-monitor.ts";

// Orchestration Integration
export { 
  MCPOrchestrationIntegration,
  type OrchestrationComponents,
  type MCPOrchestrationConfig,
  type IntegrationStatus 
} from "./orchestration-integration.ts";

// Transport Implementations
export { type ITransport } from "./transports/base.ts";
export { StdioTransport } from "./transports/stdio.ts";
export { HttpTransport } from "./transports/http.ts";

// Request Routing
export { RequestRouter } from "./router.ts";

// Session Management
export { SessionManager, type ISessionManager } from "./session-manager.ts";

// Load Balancing
export { LoadBalancer, type ILoadBalancer, RequestQueue } from "./load-balancer.ts";

// Tool Implementations
export { createFlowXTools, type FlowXToolContext } from "./flowx-tools.ts";
export { createSwarmTools, type SwarmToolContext } from "./swarm-tools.ts";

// Import the types and classes we need for the factory
import { MCPOrchestrationIntegration, type MCPOrchestrationConfig, type OrchestrationComponents } from "./orchestration-integration.ts";
import { MCPServer } from "./server.ts";
import { MCPLifecycleManager } from "./lifecycle-manager.ts";
import { MCPPerformanceMonitor } from "./performance-monitor.ts";
import { MCPProtocolManager } from "./protocol-manager.ts";
import type { MCPConfig } from "../utils/types.ts";
import type { ILogger } from "../core/logger.ts";

/**
 * MCP Integration Factory
 * Provides a simple way to create a complete MCP integration
 */
export class MCPIntegrationFactory {
  /**
   * Create a complete MCP integration with all components
   */
  static async createIntegration(config: {
    mcpConfig: MCPConfig;
    orchestrationConfig?: Partial<MCPOrchestrationConfig>;
    components?: Partial<OrchestrationComponents>;
    logger: ILogger;
  }): Promise<MCPOrchestrationIntegration> {
    const { mcpConfig, orchestrationConfig = {}, components = {}, logger } = config;

    const integration = new MCPOrchestrationIntegration(
      mcpConfig,
      {
        enabledIntegrations: {
          orchestrator: true,
          swarm: true,
          agents: true,
          resources: true,
          memory: true,
          monitoring: true,
          terminals: true,
        },
        autoStart: true,
        healthCheckInterval: 30000,
        reconnectAttempts: 3,
        reconnectDelay: 5000,
        enableMetrics: true,
        enableAlerts: true,
        ...orchestrationConfig,
      },
      components,
      logger,
    );

    return integration;
  }

  /**
   * Create a standalone MCP server (without orchestration integration)
   */
  static async createStandaloneServer(config: {
    mcpConfig: MCPConfig;
    logger: ILogger;
    enableLifecycleManagement?: boolean;
    enablePerformanceMonitoring?: boolean;
  }): Promise<{
    server: MCPServer;
    lifecycleManager?: MCPLifecycleManager | undefined;
    performanceMonitor?: MCPPerformanceMonitor | undefined;
  }> {
    const { 
      mcpConfig, 
      logger, 
      enableLifecycleManagement = true,
      enablePerformanceMonitoring = true 
    } = config;

    const eventBus = new (await import('node:events')).EventEmitter();
    const server = new MCPServer(mcpConfig, eventBus, logger);

    let lifecycleManager: MCPLifecycleManager | undefined;
    let performanceMonitor: MCPPerformanceMonitor | undefined;

    if (enableLifecycleManagement) {
      lifecycleManager = new MCPLifecycleManager(
        mcpConfig,
        logger,
        () => server,
      );
    }

    if (enablePerformanceMonitoring) {
      performanceMonitor = new MCPPerformanceMonitor(logger);
    }

    return {
      server,
      lifecycleManager,
      performanceMonitor,
    };
  }

  /**
   * Create a development/testing MCP setup
   */
  static async createDevelopmentSetup(logger: ILogger): Promise<{
    server: MCPServer;
    lifecycleManager: MCPLifecycleManager;
    performanceMonitor: MCPPerformanceMonitor;
    protocolManager: MCPProtocolManager;
  }> {
    const mcpConfig: MCPConfig = {
      transport: 'stdio',
      enableMetrics: true,
      auth: {
        enabled: false,
        method: 'token',
      },
    };

    const { server, lifecycleManager, performanceMonitor } = await this.createStandaloneServer({
      mcpConfig,
      logger,
      enableLifecycleManagement: true,
      enablePerformanceMonitoring: true,
    });

    const protocolManager = new MCPProtocolManager(logger);

    return {
      server,
      lifecycleManager: lifecycleManager!,
      performanceMonitor: performanceMonitor!,
      protocolManager,
    };
  }
}

/**
 * Default MCP configuration for common use cases
 */
export const DefaultMCPConfigs = {
  /**
   * Development configuration with stdio transport
   */
  development: {
    transport: 'stdio' as const,
    enableMetrics: true,
    auth: {
      enabled: false,
      method: 'token' as const,
    },
  },

  /**
   * Production configuration with HTTP transport and authentication
   */
  production: {
    transport: 'http' as const,
    host: '0.0.0.0',
    port: 3000,
    tlsEnabled: true,
    enableMetrics: true,
    auth: {
      enabled: true,
      method: 'token' as const,
    },
    loadBalancer: {
      enabled: true,
      maxRequestsPerSecond: 100,
      maxConcurrentRequests: 50,
    },
    sessionTimeout: 3600000, // 1 hour
    maxSessions: 1000,
  },

  /**
   * Testing configuration with minimal features
   */
  testing: {
    transport: 'stdio' as const,
    enableMetrics: false,
    auth: {
      enabled: false,
      method: 'token' as const,
    },
  },
} as const;

/**
 * MCP Utility Functions
 */
export const MCPUtils = {
  /**
   * Validate MCP protocol version
   */
  isValidProtocolVersion(version: import("../utils/types.ts").MCPProtocolVersion): boolean {
    return (
      typeof version.major === 'number' &&
      typeof version.minor === 'number' &&
      typeof version.patch === 'number' &&
      version.major > 0
    );
  },

  /**
   * Compare two protocol versions
   */
  compareVersions(
    a: import("../utils/types.ts").MCPProtocolVersion,
    b: import("../utils/types.ts").MCPProtocolVersion
  ): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  },

  /**
   * Format protocol version as string
   */
  formatVersion(version: import("../utils/types.ts").MCPProtocolVersion): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  },

  /**
   * Parse protocol version from string
   */
  parseVersion(versionString: string): import("../utils/types.ts").MCPProtocolVersion {
    const parts = versionString.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(p => isNaN(p))) {
      throw new Error(`Invalid version string: ${versionString}`);
    }
    return {
      major: parts[0],
      minor: parts[1],
      patch: parts[2],
    };
  },

  /**
   * Generate a random session ID
   */
  generateSessionId(): string {
    return `mcp_session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },

  /**
   * Generate a random request ID
   */
  generateRequestId(): string {
    return `mcp_req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  },
};
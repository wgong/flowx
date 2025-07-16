/**
 * Secure Agent Integration Layer
 * Automatically integrates security rules and clean architecture into all agent spawning
 * Wraps the existing AgentProcessManager and AgentManager to add security-by-default
 */

import { EventEmitter } from 'node:events';
import { ILogger } from '../core/logger.js';
import { AgentProcessManager, AgentProcessConfig } from './agent-process-manager.js';
import { SecurityRulesEngine } from './security-rules-engine.js';
import { SecureCoderAgent, SecureCodeGenerationContext, SecureCoderConfig } from './secure-coder-agent.js';

export interface SecureAgentSpawnOptions {
  // Project context
  projectType: 'web-app' | 'api' | 'lambda' | 'microservice' | 'cli' | 'library';
  language: string;
  framework?: string;
  
  // Security requirements
  securityLevel: 'basic' | 'standard' | 'high' | 'critical';
  complianceRequirements: string[]; // ['PCI-DSS', 'GDPR', 'SOX', 'HIPAA']
  
  // Architecture preferences
  architecture: 'monolith' | 'microservices' | 'serverless' | 'hybrid';
  cloudProvider: 'aws' | 'gcp' | 'azure' | 'multi-cloud' | 'on-premise';
  
  // Code quality settings
  minTestCoverage?: number;
  enforceTypeSafety?: boolean;
  enableSecurityLinting?: boolean;
  
  // Templates to include
  includeSecurityTemplates?: boolean;
  includeSPARCTemplates?: boolean;
  customTemplates?: string[];
}

export class SecureAgentIntegration extends EventEmitter {
  private logger: ILogger;
  private securityRulesEngine: SecurityRulesEngine;
  private originalAgentProcessManager: AgentProcessManager;
  
  constructor(
    logger: ILogger,
    originalAgentProcessManager: AgentProcessManager,
    securityConfig: Partial<SecureCoderConfig> = {}
  ) {
    super();
    this.logger = logger;
    this.originalAgentProcessManager = originalAgentProcessManager;
    this.securityRulesEngine = new SecurityRulesEngine(logger, securityConfig);
    
    this.logger.info('Secure Agent Integration initialized with security-by-default');
  }

  /**
   * Create a secure agent with embedded security rules and clean architecture guidelines
   * This wraps the original createAgent method to add security context
   */
  async createSecureAgent(
    baseConfig: AgentProcessConfig,
    secureOptions: SecureAgentSpawnOptions
  ): Promise<string> {
    this.logger.info('Creating secure agent with embedded security rules', {
      agentId: baseConfig.id,
      securityLevel: secureOptions.securityLevel,
      compliance: secureOptions.complianceRequirements
    });

    // Create security context
    const securityContext: SecureCodeGenerationContext = {
      projectType: secureOptions.projectType,
      securityLevel: secureOptions.securityLevel,
      complianceRequirements: secureOptions.complianceRequirements,
      architecture: secureOptions.architecture,
      cloudProvider: secureOptions.cloudProvider,
      language: secureOptions.language,
      framework: secureOptions.framework
    };

    // Enhance the agent configuration with security rules
    const enhancedConfig = this.securityRulesEngine.enhanceAgentConfigWithSecurity(
      baseConfig,
      securityContext
    );

    // Add secure coding guidelines to environment
    enhancedConfig.environment = {
      ...enhancedConfig.environment,
      
      // Pass security context to Claude process
      SECURE_AGENT_MODE: 'true',
      SECURITY_CONTEXT: JSON.stringify(securityContext),
      SECURITY_OPTIONS: JSON.stringify(secureOptions),
      
      // Template paths for security and SPARC
      SECURITY_TEMPLATES_ENABLED: secureOptions.includeSecurityTemplates !== false ? 'true' : 'false',
      SPARC_TEMPLATES_ENABLED: secureOptions.includeSPARCTemplates !== false ? 'true' : 'false',
      CUSTOM_TEMPLATES: secureOptions.customTemplates?.join(',') || '',
      
      // CSA Blog URL for reference
      CSA_SECURE_VIBE_GUIDE: 'https://cloudsecurityalliance.org/blog/2025/04/09/secure-vibe-coding-guide',
      
      // Zero technical debt policy
      ZERO_TECHNICAL_DEBT: 'true',
      ONE_IMPLEMENTATION_PER_FUNCTION: 'true',
      CONSOLIDATE_BEFORE_CREATING: 'true',
      DELETE_REDUNDANT_CODE: 'true',
      REFACTOR_OVER_REWRITE: 'true'
    };

    // Add security validation prompt to Claude configuration
    if (enhancedConfig.claudeConfig) {
      // Store the security prompt for later use in Claude CLI arguments
      enhancedConfig.environment.SECURITY_SYSTEM_PROMPT = this.generateSecuritySystemPrompt(securityContext);
    }

    try {
      // Create the agent using the original process manager but with enhanced config
      const agentId = await this.originalAgentProcessManager.createAgent(enhancedConfig);
      
      this.logger.info('Secure agent created successfully', {
        agentId,
        securityLevel: secureOptions.securityLevel,
        rulesCount: this.securityRulesEngine.getSecurityMetrics().totalRules
      });

      // Emit security-enhanced event
      this.emit('secure-agent:created', {
        agentId,
        securityContext,
        securityOptions: secureOptions,
        securityMetrics: this.securityRulesEngine.getSecurityMetrics()
      });

      return agentId;

    } catch (error) {
      this.logger.error('Failed to create secure agent', {
        agentId: baseConfig.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive security system prompt
   */
  private generateSecuritySystemPrompt(context: SecureCodeGenerationContext): string {
    return this.securityRulesEngine.generateSecurePrompt(context);
  }

  /**
   * Validate generated code against security rules
   */
  async validateGeneratedCode(code: string, context: any = {}): Promise<any> {
    return this.securityRulesEngine.validateCode(code, context);
  }

  /**
   * Enhance Claude CLI arguments with security context
   */
  enhanceClaudeArgs(
    originalArgs: string[],
    securityContext: SecureCodeGenerationContext,
    workingDirectory: string
  ): string[] {
    // Get the user prompt from original args (usually the first argument)
    const userPrompt = originalArgs[0] || '';
    
    // Generate security-enhanced arguments
    const secureArgs = this.securityRulesEngine.generateSecureClaudeArgs(
      userPrompt,
      securityContext,
      workingDirectory
    );

    // Merge with any additional original arguments (excluding the prompt)
    const additionalArgs = originalArgs.slice(1).filter(arg => 
      !secureArgs.includes(arg) && // Avoid duplicates
      !arg.startsWith('--model') && // We set model in secure args
      !arg.startsWith('--temperature') && // We set temperature in secure args
      !arg.startsWith('--max-tokens') // We set max-tokens in secure args
    );

    return [...secureArgs, ...additionalArgs];
  }

  /**
   * Create a factory function for easy secure agent creation
   */
  createSecureAgentFactory(defaultSecureOptions: Partial<SecureAgentSpawnOptions> = {}) {
    return async (
      baseConfig: AgentProcessConfig,
      overrideOptions: Partial<SecureAgentSpawnOptions> = {}
    ): Promise<string> => {
      const secureOptions: SecureAgentSpawnOptions = {
        projectType: 'api',
        language: 'typescript',
        securityLevel: 'high',
        complianceRequirements: [],
        architecture: 'microservices',
        cloudProvider: 'aws',
        minTestCoverage: 95,
        enforceTypeSafety: true,
        enableSecurityLinting: true,
        includeSecurityTemplates: true,
        includeSPARCTemplates: true,
        ...defaultSecureOptions,
        ...overrideOptions
      };

      return this.createSecureAgent(baseConfig, secureOptions);
    };
  }

  /**
   * Get security metrics and validation results
   */
  getSecurityMetrics(): any {
    return this.securityRulesEngine.getSecurityMetrics();
  }

  /**
   * Export security rules for documentation
   */
  exportSecurityRules(): any[] {
    return this.securityRulesEngine.exportRules();
  }

  /**
   * Add custom security rules
   */
  addCustomSecurityRule(rule: any): void {
    this.securityRulesEngine.addRule(rule);
  }

  /**
   * Create secure agent configurations for different project types
   */
  static createConfigurationTemplates(): Record<string, SecureAgentSpawnOptions> {
    return {
      // Enterprise Web Application
      enterpriseWebApp: {
        projectType: 'web-app',
        language: 'typescript',
        framework: 'react',
        securityLevel: 'critical',
        complianceRequirements: ['SOX', 'GDPR'],
        architecture: 'microservices',
        cloudProvider: 'aws',
        minTestCoverage: 98,
        enforceTypeSafety: true,
        enableSecurityLinting: true,
        includeSecurityTemplates: true,
        includeSPARCTemplates: true
      },

      // Financial API Service
      financialAPI: {
        projectType: 'api',
        language: 'typescript',
        framework: 'nestjs',
        securityLevel: 'critical',
        complianceRequirements: ['PCI-DSS', 'SOX'],
        architecture: 'microservices',
        cloudProvider: 'aws',
        minTestCoverage: 98,
        enforceTypeSafety: true,
        enableSecurityLinting: true,
        includeSecurityTemplates: true,
        includeSPARCTemplates: true
      },

      // Healthcare Application
      healthcareApp: {
        projectType: 'web-app',
        language: 'typescript',
        framework: 'react',
        securityLevel: 'critical',
        complianceRequirements: ['HIPAA', 'GDPR'],
        architecture: 'microservices',
        cloudProvider: 'aws',
        minTestCoverage: 98,
        enforceTypeSafety: true,
        enableSecurityLinting: true,
        includeSecurityTemplates: true,
        includeSPARCTemplates: true
      },

      // Serverless Lambda Function
      serverlessLambda: {
        projectType: 'lambda',
        language: 'typescript',
        securityLevel: 'high',
        complianceRequirements: [],
        architecture: 'serverless',
        cloudProvider: 'aws',
        minTestCoverage: 95,
        enforceTypeSafety: true,
        enableSecurityLinting: true,
        includeSecurityTemplates: true,
        includeSPARCTemplates: true
      },

      // Standard Microservice
      standardMicroservice: {
        projectType: 'microservice',
        language: 'typescript',
        framework: 'express',
        securityLevel: 'standard',
        complianceRequirements: [],
        architecture: 'microservices',
        cloudProvider: 'aws',
        minTestCoverage: 90,
        enforceTypeSafety: true,
        enableSecurityLinting: true,
        includeSecurityTemplates: true,
        includeSPARCTemplates: true
      },

      // CLI Tool
      cliTool: {
        projectType: 'cli',
        language: 'typescript',
        securityLevel: 'standard',
        complianceRequirements: [],
        architecture: 'monolith',
        cloudProvider: 'on-premise',
        minTestCoverage: 85,
        enforceTypeSafety: true,
        enableSecurityLinting: true,
        includeSecurityTemplates: false,
        includeSPARCTemplates: true
      }
    };
  }
}

/**
 * Factory function to create secure agent integration
 */
export function createSecureAgentIntegration(
  logger: ILogger,
  originalAgentProcessManager: AgentProcessManager,
  securityConfig: Partial<SecureCoderConfig> = {}
): SecureAgentIntegration {
  return new SecureAgentIntegration(logger, originalAgentProcessManager, securityConfig);
}

/**
 * Modify existing AgentProcessManager to use secure integration by default
 */
export function wrapAgentProcessManagerWithSecurity(
  originalManager: AgentProcessManager,
  logger: ILogger,
  securityConfig: Partial<SecureCoderConfig> = {}
): AgentProcessManager {
  const secureIntegration = createSecureAgentIntegration(logger, originalManager, securityConfig);
  
  // Create a wrapper that intercepts createAgent calls
  const wrappedManager = Object.create(originalManager);
  
  // Override the createAgent method to use secure integration
  wrappedManager.createAgent = async function(config: AgentProcessConfig): Promise<string> {
    // Determine security options based on config
    const secureOptions: SecureAgentSpawnOptions = {
      projectType: config.type === 'backend' ? 'api' : 
                   config.type === 'frontend' ? 'web-app' :
                   config.type === 'test' ? 'api' : 'microservice',
      language: 'typescript', // Default, could be detected from config
      securityLevel: 'high', // Default to high security
      complianceRequirements: [], // Could be set based on environment
      architecture: 'microservices',
      cloudProvider: 'aws', // Could be detected from environment
      minTestCoverage: 95,
      enforceTypeSafety: true,
      enableSecurityLinting: true,
      includeSecurityTemplates: true,
      includeSPARCTemplates: true
    };

    // Use secure integration instead of original createAgent
    return secureIntegration.createSecureAgent(config, secureOptions);
  };

  return wrappedManager;
} 
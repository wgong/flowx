/**
 * Secure Agent Framework Usage Examples
 * Demonstrates how to integrate and use the secure coder agent framework
 * with different project types and security requirements
 */

import { Logger } from '../core/logger.js';
import { AgentProcessManager } from '../agents/agent-process-manager.js';
import { 
  SecureAgentIntegration, 
  SecureAgentSpawnOptions,
  createSecureAgentIntegration,
  wrapAgentProcessManagerWithSecurity
} from '../agents/secure-agent-integration.js';
import { SecureCoderConfig } from '../agents/secure-coder-agent.js';

// Example usage scenarios

/**
 * Example 1: Creating a secure enterprise web application with PCI-DSS compliance
 */
async function createSecureECommerceApp(): Promise<void> {
  const logger = new Logger('SecureAgentExample');
  const originalAgentManager = new AgentProcessManager(logger);
  
  // Create secure agent integration
  const secureIntegration = createSecureAgentIntegration(logger, originalAgentManager, {
    enableCSAGuidelines: true,
    enableOWASPCompliance: true,
    enableAWSSecurityPatterns: true,
    enableCleanArchitecture: true,
    minTestCoverage: 98, // Critical application requires 98% coverage
    enforceTypeSafety: true,
    enableSecurityLinting: true,
    requireSecurityReviews: true
  });

  // Define security requirements for e-commerce
  const ecommerceSecurityOptions: SecureAgentSpawnOptions = {
    projectType: 'web-app',
    language: 'typescript',
    framework: 'react',
    securityLevel: 'critical',
    complianceRequirements: ['PCI-DSS', 'GDPR', 'SOX'],
    architecture: 'microservices',
    cloudProvider: 'aws',
    minTestCoverage: 98,
    enforceTypeSafety: true,
    enableSecurityLinting: true,
    includeSecurityTemplates: true,
    includeSPARCTemplates: true
  };

  // Create secure agents for different components
  const paymentServiceConfig = {
    id: 'payment-service-agent',
    type: 'backend' as const,
    specialization: 'payment-processing',
    maxMemory: 1024,
    maxConcurrentTasks: 2,
    timeout: 300000
  };

  const userServiceConfig = {
    id: 'user-service-agent',
    type: 'backend' as const,
    specialization: 'user-management',
    maxMemory: 512,
    maxConcurrentTasks: 3,
    timeout: 300000
  };

  const frontendConfig = {
    id: 'frontend-agent',
    type: 'frontend' as const,
    specialization: 'react-ecommerce',
    maxMemory: 512,
    maxConcurrentTasks: 2,
    timeout: 300000
  };

  try {
    // Create secure agents with embedded security rules
    const paymentAgentId = await secureIntegration.createSecureAgent(
      paymentServiceConfig, 
      ecommerceSecurityOptions
    );

    const userAgentId = await secureIntegration.createSecureAgent(
      userServiceConfig,
      ecommerceSecurityOptions
    );

    const frontendAgentId = await secureIntegration.createSecureAgent(
      frontendConfig,
      ecommerceSecurityOptions
    );

    logger.info('E-commerce secure agents created successfully', {
      paymentAgentId,
      userAgentId,
      frontendAgentId,
      securityMetrics: secureIntegration.getSecurityMetrics()
    });

    // Example: Validate some generated code
    const sampleCode = `
      // Sample payment processing code
      export class PaymentService {
        async processPayment(cardNumber: string, amount: number) {
          // This would trigger security violations
          const query = "SELECT * FROM payments WHERE card_number = '" + cardNumber + "'";
          console.log("Processing payment for card:", cardNumber);
          return { success: true };
        }
      }
    `;

    const validationResult = await secureIntegration.validateGeneratedCode(sampleCode);
    logger.info('Code validation result', {
      passed: validationResult.passed,
      score: validationResult.score,
      violations: validationResult.violations.length,
      recommendations: validationResult.recommendations
    });

  } catch (error) {
    logger.error('Failed to create secure e-commerce agents', error);
    throw error;
  }
}

/**
 * Example 2: Using the wrapper for automatic security integration
 */
async function demonstrateAutomaticSecurityWrapper(): Promise<void> {
  const logger = new Logger('AutoSecurityWrapper');
  const originalAgentManager = new AgentProcessManager(logger);

  // Wrap the original agent manager to automatically add security
  const secureAgentManager = wrapAgentProcessManagerWithSecurity(
    originalAgentManager,
    logger,
    {
      enableCSAGuidelines: true,
      enableOWASPCompliance: true,
      minTestCoverage: 95,
      enableCleanArchitecture: true
    }
  );

  // Now all createAgent calls automatically include security
  const microserviceConfig = {
    id: 'api-service-agent',
    type: 'backend' as const,
    specialization: 'rest-api',
    maxMemory: 512,
    maxConcurrentTasks: 3,
    timeout: 300000
  };

  try {
    // This call automatically includes security rules and clean architecture
    const agentId = await secureAgentManager.createAgent(microserviceConfig);
    
    logger.info('Secure agent created automatically', { agentId });
  } catch (error) {
    logger.error('Failed to create automatic secure agent', error);
  }
}

/**
 * Example 3: Healthcare application with HIPAA compliance
 */
async function createHIPAACompliantHealthcareApp(): Promise<void> {
  const logger = new Logger('HealthcareSecureAgent');
  const originalAgentManager = new AgentProcessManager(logger);
  
  const secureIntegration = createSecureAgentIntegration(logger, originalAgentManager, {
    enableCSAGuidelines: true,
    enableOWASPCompliance: true,
    minTestCoverage: 98, // Critical for healthcare
    requireSecurityReviews: true,
    enforceImmutability: true // Important for patient data integrity
  });

  const healthcareSecurityOptions: SecureAgentSpawnOptions = {
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
  };

  const patientServiceConfig = {
    id: 'patient-service-agent',
    type: 'backend' as const,
    specialization: 'patient-management',
    maxMemory: 1024,
    maxConcurrentTasks: 2,
    timeout: 300000
  };

  try {
    const patientAgentId = await secureIntegration.createSecureAgent(
      patientServiceConfig,
      healthcareSecurityOptions
    );

    logger.info('HIPAA-compliant healthcare agent created', { 
      patientAgentId,
      complianceRequirements: healthcareSecurityOptions.complianceRequirements
    });
  } catch (error) {
    logger.error('Failed to create healthcare secure agent', error);
  }
}

/**
 * Example 4: Using configuration templates for common scenarios
 */
async function demonstrateConfigurationTemplates(): Promise<void> {
  const logger = new Logger('ConfigTemplates');
  const originalAgentManager = new AgentProcessManager(logger);
  
  const secureIntegration = createSecureAgentIntegration(logger, originalAgentManager);

  // Get predefined configuration templates
  const templates = SecureAgentIntegration.createConfigurationTemplates();

  // Use financial API template
  const financialAPIConfig = {
    id: 'financial-api-agent',
    type: 'backend' as const,
    specialization: 'financial-api',
    maxMemory: 1024,
    maxConcurrentTasks: 2,
    timeout: 300000
  };

  try {
    const financialAgentId = await secureIntegration.createSecureAgent(
      financialAPIConfig,
      templates.financialAPI
    );

    logger.info('Financial API agent created with template', {
      financialAgentId,
      template: 'financialAPI',
      securityLevel: templates.financialAPI.securityLevel,
      compliance: templates.financialAPI.complianceRequirements
    });

    // Use serverless lambda template
    const lambdaConfig = {
      id: 'lambda-function-agent',
      type: 'backend' as const,
      specialization: 'serverless-function',
      maxMemory: 256,
      maxConcurrentTasks: 1,
      timeout: 300000
    };

    const lambdaAgentId = await secureIntegration.createSecureAgent(
      lambdaConfig,
      templates.serverlessLambda
    );

    logger.info('Serverless Lambda agent created with template', {
      lambdaAgentId,
      template: 'serverlessLambda'
    });

  } catch (error) {
    logger.error('Failed to create agents with templates', error);
  }
}

/**
 * Example 5: Custom security rules and validation
 */
async function demonstrateCustomSecurityRules(): Promise<void> {
  const logger = new Logger('CustomSecurityRules');
  const originalAgentManager = new AgentProcessManager(logger);
  
  const secureIntegration = createSecureAgentIntegration(logger, originalAgentManager);

  // Add custom security rule
  secureIntegration.addCustomSecurityRule({
    id: 'CUSTOM-001',
    category: 'OWASP',
    severity: 'HIGH',
    description: 'Company-specific security pattern violation',
    pattern: /(company_secret|internal_api_key)/i,
    documentation: 'Never use company-specific sensitive keywords in code'
  });

  // Example of code validation with custom rules
  const codeToValidate = `
    const config = {
      company_secret: "ABC123",
      database_url: "mongodb://localhost:27017/app"
    };
  `;

  const validationResult = await secureIntegration.validateGeneratedCode(codeToValidate);
  
  logger.info('Custom validation result', {
    passed: validationResult.passed,
    score: validationResult.score,
    violations: validationResult.violations.map((v: any) => ({
      ruleId: v.ruleId,
      severity: v.severity,
      message: v.message
    }))
  });

  // Export security rules for documentation
  const allRules = secureIntegration.exportSecurityRules();
  logger.info('Total security rules available', { count: allRules.length });

  // Get security metrics
  const metrics = secureIntegration.getSecurityMetrics();
  logger.info('Security framework metrics', metrics);
}

/**
 * Example 6: Integration with existing swarm coordination
 */
async function integrateWithSwarmCoordination(): Promise<void> {
  const logger = new Logger('SwarmSecureIntegration');
  
  // This would be called from the swarm coordinator
  // when spawning multiple agents for a complex task
  
  const originalAgentManager = new AgentProcessManager(logger);
  const secureFactory = createSecureAgentIntegration(
    logger, 
    originalAgentManager
  ).createSecureAgentFactory({
    securityLevel: 'high',
    architecture: 'microservices',
    includeSecurityTemplates: true,
    includeSPARCTemplates: true
  });

  // Create multiple secure agents for swarm
  const agentConfigs = [
    {
      id: 'swarm-frontend-agent',
      type: 'frontend' as const,
      specialization: 'react-frontend'
    },
    {
      id: 'swarm-backend-agent',
      type: 'backend' as const,
      specialization: 'api-backend'
    },
    {
      id: 'swarm-test-agent',
      type: 'test' as const,
      specialization: 'automated-testing'
    }
  ];

  try {
    const agentIds = await Promise.all(
      agentConfigs.map(config => 
        secureFactory(config, {
          projectType: config.type === 'frontend' ? 'web-app' : 'api',
          language: 'typescript',
          complianceRequirements: ['GDPR']
        })
      )
    );

    logger.info('Secure swarm agents created', { agentIds });
  } catch (error) {
    logger.error('Failed to create secure swarm agents', error);
  }
}

/**
 * Main demonstration function
 */
export async function runSecureAgentExamples(): Promise<void> {
  const logger = new Logger('SecureAgentExamples');
  
  logger.info('🔐 Starting Secure Agent Framework Examples');

  try {
    logger.info('Example 1: E-commerce application with PCI-DSS compliance');
    await createSecureECommerceApp();

    logger.info('Example 2: Automatic security wrapper');
    await demonstrateAutomaticSecurityWrapper();

    logger.info('Example 3: Healthcare application with HIPAA compliance');
    await createHIPAACompliantHealthcareApp();

    logger.info('Example 4: Configuration templates');
    await demonstrateConfigurationTemplates();

    logger.info('Example 5: Custom security rules');
    await demonstrateCustomSecurityRules();

    logger.info('Example 6: Swarm coordination integration');
    await integrateWithSwarmCoordination();

    logger.info('✅ All secure agent examples completed successfully');

  } catch (error) {
    logger.error('❌ Secure agent examples failed', error);
    throw error;
  }
}

// Export for use in other parts of the system
export {
  createSecureECommerceApp,
  demonstrateAutomaticSecurityWrapper,
  createHIPAACompliantHealthcareApp,
  demonstrateConfigurationTemplates,
  demonstrateCustomSecurityRules,
  integrateWithSwarmCoordination
}; 
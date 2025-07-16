/**
 * Security Rules Engine
 * Validates and enforces security patterns across all agent-generated code
 * Integrates with the Claude Flow agent spawning system
 */

import { EventEmitter } from 'node:events';
import { ILogger } from '../core/logger.js';
import { SecureCoderAgent, SecureCoderConfig, SecureCodeGenerationContext } from './secure-coder-agent.js';
import { AgentProcessConfig } from './agent-process-manager.js';

export interface SecurityRule {
  id: string;
  category: 'OWASP' | 'CSA' | 'AWS' | 'ARCHITECTURE' | 'COMPLIANCE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  pattern?: RegExp;
  validator?: (code: string, context: any) => boolean;
  autoFix?: (code: string, context: any) => string;
  documentation?: string;
}

export interface SecurityValidationResult {
  passed: boolean;
  violations: SecurityViolation[];
  score: number; // 0-100
  recommendations: string[];
}

export interface SecurityViolation {
  ruleId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  line?: number;
  column?: number;
  code?: string;
  fix?: string;
}

export class SecurityRulesEngine extends EventEmitter {
  private logger: ILogger;
  private rules = new Map<string, SecurityRule>();
  private secureCoderAgent: SecureCoderAgent;
  
  constructor(logger: ILogger, config: Partial<SecureCoderConfig> = {}) {
    super();
    this.logger = logger;
    
    // Initialize with a default secure coder agent
    const defaultContext: SecureCodeGenerationContext = {
      projectType: 'api',
      securityLevel: 'high',
      complianceRequirements: [],
      architecture: 'microservices',
      cloudProvider: 'aws',
      language: 'typescript'
    };
    
    this.secureCoderAgent = new SecureCoderAgent(logger, config);
    this.initializeSecurityRules();
  }

  /**
   * Initialize all security rules
   */
  private initializeSecurityRules(): void {
    // OWASP Top 10 Rules
    this.addOWASPRules();
    
    // CSA Guidelines Rules
    this.addCSARules();
    
    // AWS Security Rules
    this.addAWSSecurityRules();
    
    // Clean Architecture Rules
    this.addArchitectureRules();
    
    // Compliance Rules
    this.addComplianceRules();
    
    this.logger.info(`Initialized ${this.rules.size} security rules`);
  }

  /**
   * Add OWASP Top 10 security rules
   */
  private addOWASPRules(): void {
    // A01: Broken Access Control
    this.addRule({
      id: 'OWASP-A01-001',
      category: 'OWASP',
      severity: 'CRITICAL',
      description: 'Hardcoded admin credentials detected',
      pattern: /(admin|root|administrator).*=.*["'](admin|password|123|root)["']/i,
      documentation: 'Never hardcode admin credentials. Use secure configuration management.'
    });

    this.addRule({
      id: 'OWASP-A01-002',
      category: 'OWASP',
      severity: 'HIGH',
      description: 'Missing authorization check',
      validator: (code: string) => {
        // Check for endpoints without authorization
        const hasEndpoint = /\.(get|post|put|delete|patch)\s*\(/i.test(code);
        const hasAuth = /(auth|authorize|isAuthenticated|requireAuth|@RequireAuth|middleware.*auth)/i.test(code);
        return !hasEndpoint || hasAuth;
      },
      documentation: 'All endpoints must have proper authorization checks.'
    });

    // A02: Cryptographic Failures
    this.addRule({
      id: 'OWASP-A02-001',
      category: 'OWASP',
      severity: 'CRITICAL',
      description: 'Weak cryptographic algorithm detected',
      pattern: /(MD5|SHA1|DES|RC4|crypto\.createHash\(['"]md5['"])/i,
      documentation: 'Use strong cryptographic algorithms like AES-256-GCM, SHA-256, or better.'
    });

    this.addRule({
      id: 'OWASP-A02-002',
      category: 'OWASP',
      severity: 'HIGH',
      description: 'Hardcoded encryption key or secret',
      pattern: /(secret|key|password|token).*=.*["'][a-zA-Z0-9+/=]{8,}["']/i,
      documentation: 'Use secure key management services like AWS Secrets Manager.'
    });

    // A03: Injection
    this.addRule({
      id: 'OWASP-A03-001',
      category: 'OWASP',
      severity: 'CRITICAL',
      description: 'SQL injection vulnerability detected',
      pattern: /query.*\+|query.*\$\{|execute.*\+|execute.*\$\{/i,
      documentation: 'Use parameterized queries to prevent SQL injection.'
    });

    this.addRule({
      id: 'OWASP-A03-002',
      category: 'OWASP',
      severity: 'HIGH',
      description: 'Command injection vulnerability',
      pattern: /(exec|spawn|system|shell).*\+|eval\s*\(/i,
      documentation: 'Avoid dynamic command execution. Validate and sanitize all inputs.'
    });

    // A07: Authentication Failures
    this.addRule({
      id: 'OWASP-A07-001',
      category: 'OWASP',
      severity: 'HIGH',
      description: 'Weak password requirements',
      validator: (code: string) => {
        if (!/password.*validation|password.*requirement/i.test(code)) return true;
        return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/i.test(code);
      },
      documentation: 'Implement strong password requirements: minimum 8 characters, mixed case, numbers, special characters.'
    });

    // A09: Security Logging and Monitoring Failures
    this.addRule({
      id: 'OWASP-A09-001',
      category: 'OWASP',
      severity: 'MEDIUM',
      description: 'Missing security event logging',
      validator: (code: string) => {
        const hasSecurityEvents = /(login|auth|access|permission|error)/i.test(code);
        const hasLogging = /(log|audit|track|monitor)/i.test(code);
        return !hasSecurityEvents || hasLogging;
      },
      documentation: 'Log all security-relevant events for monitoring and incident response.'
    });
  }

  /**
   * Add CSA (Cloud Security Alliance) rules
   */
  private addCSARules(): void {
    this.addRule({
      id: 'CSA-001',
      category: 'CSA',
      severity: 'HIGH',
      description: 'Cloud credentials exposed in code',
      pattern: /(aws_access_key_id|aws_secret_access_key|AKIA[0-9A-Z]{16})/i,
      documentation: 'Never expose cloud credentials in code. Use IAM roles and secure credential management.'
    });

    this.addRule({
      id: 'CSA-002',
      category: 'CSA',
      severity: 'MEDIUM',
      description: 'Missing data classification',
      validator: (code: string) => {
        const hasDataHandling = /(user.*data|personal.*info|sensitive|confidential)/i.test(code);
        const hasClassification = /(classification|sensitive|public|internal|confidential)/i.test(code);
        return !hasDataHandling || hasClassification;
      },
      documentation: 'Classify data according to sensitivity and apply appropriate protection measures.'
    });

    this.addRule({
      id: 'CSA-003',
      category: 'CSA',
      severity: 'HIGH',
      description: 'Insufficient encryption for data at rest',
      validator: (code: string) => {
        const hasDataStorage = /(save|store|persist|database|file.*write)/i.test(code);
        const hasEncryption = /(encrypt|cipher|aes|kms)/i.test(code);
        return !hasDataStorage || hasEncryption;
      },
      documentation: 'Encrypt sensitive data at rest using strong encryption algorithms.'
    });
  }

  /**
   * Add AWS-specific security rules
   */
  private addAWSSecurityRules(): void {
    this.addRule({
      id: 'AWS-001',
      category: 'AWS',
      severity: 'CRITICAL',
      description: 'Overly permissive IAM policy',
      pattern: /"Effect":\s*"Allow".*"Resource":\s*"\*".*"Action":\s*"\*"/i,
      documentation: 'Follow principle of least privilege. Avoid wildcard permissions.'
    });

    this.addRule({
      id: 'AWS-002',
      category: 'AWS',
      severity: 'HIGH',
      description: 'S3 bucket with public access',
      pattern: /"PublicAccessBlockConfiguration":\s*false|"BlockPublicAcls":\s*false/i,
      documentation: 'Block public access to S3 buckets unless explicitly required and properly secured.'
    });

    this.addRule({
      id: 'AWS-003',
      category: 'AWS',
      severity: 'MEDIUM',
      description: 'Lambda function without error handling',
      validator: (code: string) => {
        const isLambda = /exports\.handler|lambda/i.test(code);
        const hasErrorHandling = /try.*catch|\.catch\(|throw|error/i.test(code);
        return !isLambda || hasErrorHandling;
      },
      documentation: 'Implement proper error handling in Lambda functions to prevent information disclosure.'
    });

    this.addRule({
      id: 'AWS-004',
      category: 'AWS',
      severity: 'HIGH',
      description: 'Missing CloudTrail logging configuration',
      validator: (code: string) => {
        const hasAWSConfig = /cloudformation|terraform|aws-cdk/i.test(code);
        const hasCloudTrail = /cloudtrail|aws::cloudtrail/i.test(code);
        return !hasAWSConfig || hasCloudTrail;
      },
      documentation: 'Enable CloudTrail logging for audit trails and compliance.'
    });
  }

  /**
   * Add clean architecture rules
   */
  private addArchitectureRules(): void {
    // Single Responsibility Principle
    this.addRule({
      id: 'ARCH-SRP-001',
      category: 'ARCHITECTURE',
      severity: 'MEDIUM',
      description: 'Class violates Single Responsibility Principle',
      validator: (code: string) => {
        const classMatches = code.match(/class\s+\w+/g);
        if (!classMatches) return true;
        
        // Simple heuristic: count methods per class
        const methodCount = (code.match(/\s+(public|private|protected)?\s*\w+\s*\(/g) || []).length;
        return methodCount <= 10;
      },
      documentation: 'Classes should have only one reason to change. Consider splitting large classes.'
    });

    // Dependency Injection
    this.addRule({
      id: 'ARCH-DI-001',
      category: 'ARCHITECTURE',
      severity: 'MEDIUM',
      description: 'Direct instantiation instead of dependency injection',
      pattern: /new\s+[A-Z]\w*Service\(|new\s+[A-Z]\w*Repository\(|new\s+[A-Z]\w*Client\(/,
      documentation: 'Use dependency injection instead of direct instantiation for better testability.'
    });

    // Layered Architecture
    this.addRule({
      id: 'ARCH-LAYER-001',
      category: 'ARCHITECTURE',
      severity: 'HIGH',
      description: 'Domain layer depends on infrastructure',
      validator: (code: string) => {
        const isDomainFile = /\/domain\/|domain\./i.test(code);
        const hasInfraImports = /import.*\/infrastructure\/|import.*database|import.*http/i.test(code);
        return !isDomainFile || !hasInfraImports;
      },
      documentation: 'Domain layer should not depend on infrastructure. Use abstractions/interfaces.'
    });

    // Immutability
    this.addRule({
      id: 'ARCH-IMMUT-001',
      category: 'ARCHITECTURE',
      severity: 'LOW',
      description: 'Mutable state in value object',
      validator: (code: string) => {
        const isValueObject = /ValueObject|VO\b/i.test(code);
        const hasMutableFields = /public\s+\w+\s*:|let\s+|var\s+/i.test(code);
        return !isValueObject || !hasMutableFields;
      },
      documentation: 'Value objects should be immutable. Use readonly properties.'
    });
  }

  /**
   * Add compliance-specific rules
   */
  private addComplianceRules(): void {
    // GDPR
    this.addRule({
      id: 'GDPR-001',
      category: 'COMPLIANCE',
      severity: 'HIGH',
      description: 'Personal data without encryption',
      validator: (code: string) => {
        const hasPersonalData = /(email|phone|address|name|ssn|personal)/i.test(code);
        const hasEncryption = /(encrypt|cipher|hash|pseudonym)/i.test(code);
        return !hasPersonalData || hasEncryption;
      },
      documentation: 'Personal data must be encrypted or pseudonymized according to GDPR requirements.'
    });

    // PCI DSS
    this.addRule({
      id: 'PCI-001',
      category: 'COMPLIANCE',
      severity: 'CRITICAL',
      description: 'Credit card data in logs or storage',
      pattern: /(card.*number|credit.*card|4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2})/i,
      documentation: 'Never log or store credit card data. Use tokenization and comply with PCI DSS.'
    });

    // SOX
    this.addRule({
      id: 'SOX-001',
      category: 'COMPLIANCE',
      severity: 'MEDIUM',
      description: 'Financial data without audit trail',
      validator: (code: string) => {
        const hasFinancialData = /(financial|accounting|revenue|transaction|amount)/i.test(code);
        const hasAuditTrail = /(audit|log|track|history)/i.test(code);
        return !hasFinancialData || hasAuditTrail;
      },
      documentation: 'Financial data modifications must be auditable for SOX compliance.'
    });
  }

  /**
   * Add a security rule to the engine
   */
  addRule(rule: SecurityRule): void {
    this.rules.set(rule.id, rule);
    this.logger.debug('Added security rule', { ruleId: rule.id, category: rule.category });
  }

  /**
   * Validate code against all security rules
   */
  validateCode(code: string, context: any = {}): SecurityValidationResult {
    const violations: SecurityViolation[] = [];
    let score = 100;

    for (const [ruleId, rule] of this.rules) {
      const violation = this.checkRule(code, rule, context);
      if (violation) {
        violations.push(violation);
        
        // Deduct points based on severity
        switch (rule.severity) {
          case 'CRITICAL': score -= 25; break;
          case 'HIGH': score -= 15; break;
          case 'MEDIUM': score -= 10; break;
          case 'LOW': score -= 5; break;
        }
      }
    }

    score = Math.max(0, score);
    const passed = violations.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length === 0;

    return {
      passed,
      violations,
      score,
      recommendations: this.generateRecommendations(violations)
    };
  }

  /**
   * Check a single rule against code
   */
  private checkRule(code: string, rule: SecurityRule, context: any): SecurityViolation | null {
    let isViolation = false;
    let matchDetails: any = null;

    // Check pattern-based rules
    if (rule.pattern) {
      const match = code.match(rule.pattern);
      if (match) {
        isViolation = true;
        matchDetails = { match: match[0], index: match.index };
      }
    }

    // Check validator-based rules
    if (rule.validator && !rule.pattern) {
      isViolation = !rule.validator(code, context);
    }

    if (isViolation) {
      const lines = code.substring(0, matchDetails?.index || 0).split('\n');
      
      return {
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.description,
        line: matchDetails ? lines.length : undefined,
        code: matchDetails?.match,
        fix: rule.autoFix ? rule.autoFix(code, context) : undefined
      };
    }

    return null;
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: SecurityViolation[]): string[] {
    const recommendations: string[] = [];
    const categoryCounts = new Map<string, number>();

    // Count violations by category
    for (const violation of violations) {
      const rule = this.rules.get(violation.ruleId);
      if (rule) {
        categoryCounts.set(rule.category, (categoryCounts.get(rule.category) || 0) + 1);
      }
    }

    // Generate category-specific recommendations
    if (categoryCounts.get('OWASP')) {
      recommendations.push('Review OWASP Top 10 guidelines and implement secure coding practices');
    }
    if (categoryCounts.get('CSA')) {
      recommendations.push('Follow Cloud Security Alliance guidelines for cloud-native security');
    }
    if (categoryCounts.get('AWS')) {
      recommendations.push('Implement AWS security best practices and Well-Architected Framework');
    }
    if (categoryCounts.get('ARCHITECTURE')) {
      recommendations.push('Refactor code to follow clean architecture and SOLID principles');
    }
    if (categoryCounts.get('COMPLIANCE')) {
      recommendations.push('Ensure compliance with regulatory requirements and data protection laws');
    }

    // Add specific high-severity recommendations
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    if (criticalViolations.length > 0) {
      recommendations.unshift('CRITICAL: Address all critical security vulnerabilities immediately');
    }

    return recommendations;
  }

  /**
   * Enhance agent configuration with security rules
   */
  enhanceAgentConfigWithSecurity(
    baseConfig: AgentProcessConfig,
    context: SecureCodeGenerationContext
  ): AgentProcessConfig {
    return this.secureCoderAgent.generateSecureAgentConfig(baseConfig, context);
  }

  /**
   * Generate secure system prompt for Claude
   */
  generateSecurePrompt(context: SecureCodeGenerationContext): string {
    return this.secureCoderAgent.generateSecureSystemPrompt(context);
  }

  /**
   * Generate security-enhanced Claude CLI arguments
   */
  generateSecureClaudeArgs(
    prompt: string,
    context: SecureCodeGenerationContext,
    workingDirectory: string
  ): string[] {
    return this.secureCoderAgent.generateSecureClaudeArgs(prompt, context, workingDirectory);
  }

  /**
   * Auto-fix security violations where possible
   */
  autoFixViolations(code: string, violations: SecurityViolation[]): string {
    let fixedCode = code;

    for (const violation of violations) {
      const rule = this.rules.get(violation.ruleId);
      if (rule?.autoFix) {
        try {
          fixedCode = rule.autoFix(fixedCode, {});
          this.logger.info(`Auto-fixed security violation: ${rule.id}`);
        } catch (error) {
          this.logger.warn(`Failed to auto-fix violation ${rule.id}:`, error);
        }
      }
    }

    return fixedCode;
  }

  /**
   * Get security rules by category
   */
  getRulesByCategory(category: SecurityRule['category']): SecurityRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.category === category);
  }

  /**
   * Get security rules by severity
   */
  getRulesBySeverity(severity: SecurityRule['severity']): SecurityRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.severity === severity);
  }

  /**
   * Export security rules for documentation
   */
  exportRules(): SecurityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): any {
    const totalRules = this.rules.size;
    const rulesByCategory = new Map<string, number>();
    const rulesBySeverity = new Map<string, number>();

    for (const rule of this.rules.values()) {
      rulesByCategory.set(rule.category, (rulesByCategory.get(rule.category) || 0) + 1);
      rulesBySeverity.set(rule.severity, (rulesBySeverity.get(rule.severity) || 0) + 1);
    }

    return {
      totalRules,
      rulesByCategory: Object.fromEntries(rulesByCategory),
      rulesBySeverity: Object.fromEntries(rulesBySeverity),
      coverage: {
        owasp: rulesByCategory.get('OWASP') || 0,
        csa: rulesByCategory.get('CSA') || 0,
        aws: rulesByCategory.get('AWS') || 0,
        architecture: rulesByCategory.get('ARCHITECTURE') || 0,
        compliance: rulesByCategory.get('COMPLIANCE') || 0
      }
    };
  }
} 
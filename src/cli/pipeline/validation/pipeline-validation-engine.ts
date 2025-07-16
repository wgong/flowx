/**
 * Pipeline Validation Engine - Phase 5
 * Handles data quality validation, automated testing frameworks, and monitoring
 */

import { Logger } from '../../../core/logger.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export interface ValidationRule {
  ruleId: string;
  ruleName: string;
  ruleType: 'data_quality' | 'schema_validation' | 'business_logic' | 'performance' | 'security' | 'compliance';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  target: {
    table?: string;
    column?: string;
    pipeline?: string;
    stage?: string;
  };
  condition: string;
  expectedOutcome: string;
  failureAction: 'block' | 'alert' | 'log' | 'quarantine' | 'retry';
  automatedFix?: string;
  tags: string[];
}

export interface TestFramework {
  frameworkId: string;
  name: string;
  type: 'great_expectations' | 'dbt_test' | 'custom_sql' | 'python_test' | 'api_test';
  configuration: any;
  testSuites: TestSuite[];
  reportingConfig: {
    format: 'html' | 'json' | 'junit' | 'slack' | 'email';
    destinations: string[];
    triggers: string[];
  };
}

export interface TestSuite {
  suiteId: string;
  name: string;
  description: string;
  tests: ValidationTest[];
  schedule: string;
  dependencies: string[];
  environment: 'development' | 'staging' | 'production' | 'all';
  parallelizable: boolean;
}

export interface ValidationTest {
  testId: string;
  name: string;
  type: 'expectation' | 'assertion' | 'custom' | 'performance' | 'schema';
  description: string;
  query?: string;
  pythonCode?: string;
  parameters: Record<string, any>;
  threshold?: {
    min?: number;
    max?: number;
    variance?: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface QualityMetrics {
  completeness: {
    score: number;
    missing_values: number;
    null_percentage: number;
  };
  accuracy: {
    score: number;
    format_violations: number;
    constraint_violations: number;
  };
  consistency: {
    score: number;
    duplicate_records: number;
    referential_integrity_issues: number;
  };
  timeliness: {
    score: number;
    latency_ms: number;
    staleness_hours: number;
  };
  validity: {
    score: number;
    schema_violations: number;
    business_rule_violations: number;
  };
  overall_score: number;
}

export interface ValidationPlan {
  validationId: string;
  projectName: string;
  description: string;
  validationRules: ValidationRule[];
  testFrameworks: TestFramework[];
  qualityMetrics: QualityMetrics;
  monitoring: {
    dashboards: Array<{
      name: string;
      type: 'grafana' | 'tableau' | 'powerbi' | 'custom';
      metrics: string[];
      alerts: string[];
    }>;
    alerting: {
      channels: string[];
      escalation: Array<{
        level: string;
        threshold: number;
        action: string;
      }>;
    };
    sla: Array<{
      metric: string;
      target: number;
      timeframe: string;
    }>;
  };
  automation: {
    cicdIntegration: string;
    scheduledValidation: string;
    autoRemediation: boolean;
    notificationRules: Array<{
      trigger: string;
      recipients: string[];
      format: string;
    }>;
  };
  reporting: {
    executiveReports: boolean;
    technicalReports: boolean;
    complianceReports: boolean;
    frequency: string;
    format: string[];
  };
}

export class PipelineValidationEngine {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PipelineValidationEngine');
  }

  /**
   * Create comprehensive validation plan from natural language
   */
  async createValidationPlan(
    input: string,
    discoveryPlan?: any,
    designPlan?: any,
    extractionPlan?: any,
    transformationPlan?: any
  ): Promise<ValidationPlan> {
    this.logger.info('Creating validation plan', { input });

    try {
      // Generate validation rules based on input and previous phases
      const validationRules = this.generateValidationRules(input, transformationPlan);
      
      // Create test frameworks
      const testFrameworks = this.generateTestFrameworks(validationRules, transformationPlan);
      
      // Calculate quality metrics baseline
      const qualityMetrics = this.generateQualityMetrics(input);
      
      // Setup monitoring and alerting
      const monitoring = this.generateMonitoringConfiguration(input);
      
      // Configure automation
      const automation = this.generateAutomationConfiguration(input);
      
      // Setup reporting
      const reporting = this.generateReportingConfiguration(input);

      const plan: ValidationPlan = {
        validationId: `validation-${Date.now()}`,
        projectName: this.extractProjectName(input),
        description: this.generateDescription(input, validationRules),
        validationRules,
        testFrameworks,
        qualityMetrics,
        monitoring,
        automation,
        reporting
      };

      return plan;
    } catch (error) {
      this.logger.error('Failed to create validation plan', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Generate comprehensive validation rules
   */
  private generateValidationRules(input: string, transformationPlan?: any): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Data Quality Rules
    rules.push(
      {
        ruleId: 'dq_001',
        ruleName: 'Primary Key Uniqueness',
        ruleType: 'data_quality',
        severity: 'critical',
        description: 'Ensure all primary keys are unique across the dataset',
        target: { table: 'all_tables', column: 'primary_key' },
        condition: 'COUNT(*) = COUNT(DISTINCT primary_key)',
        expectedOutcome: 'No duplicate primary keys found',
        failureAction: 'block',
        automatedFix: 'Remove duplicate records based on latest timestamp',
        tags: ['uniqueness', 'integrity', 'critical']
      },
      {
        ruleId: 'dq_002',
        ruleName: 'Null Value Validation',
        ruleType: 'data_quality',
        severity: 'high',
        description: 'Validate required fields are not null',
        target: { table: 'customer_data', column: 'required_fields' },
        condition: 'required_field IS NOT NULL',
        expectedOutcome: 'All required fields populated',
        failureAction: 'quarantine',
        automatedFix: 'Apply default values where appropriate',
        tags: ['completeness', 'required']
      },
      {
        ruleId: 'dq_003',
        ruleName: 'Email Format Validation',
        ruleType: 'data_quality',
        severity: 'medium',
        description: 'Ensure email addresses follow proper format',
        target: { table: 'customer_data', column: 'email' },
        condition: 'REGEXP_LIKE(email, "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")',
        expectedOutcome: 'All emails properly formatted',
        failureAction: 'alert',
        automatedFix: 'Flag for manual review and correction',
        tags: ['format', 'contact']
      }
    );

    // Schema Validation Rules
    rules.push(
      {
        ruleId: 'sv_001',
        ruleName: 'Schema Drift Detection',
        ruleType: 'schema_validation',
        severity: 'high',
        description: 'Detect unexpected changes in table schemas',
        target: { table: 'all_tables' },
        condition: 'schema_version = expected_schema_version',
        expectedOutcome: 'Schema matches expected structure',
        failureAction: 'block',
        automatedFix: 'Trigger schema migration process',
        tags: ['schema', 'migration', 'compatibility']
      },
      {
        ruleId: 'sv_002',
        ruleName: 'Data Type Validation',
        ruleType: 'schema_validation',
        severity: 'critical',
        description: 'Validate data types match expected schema',
        target: { table: 'all_tables', column: 'all_columns' },
        condition: 'data_type matches expected_type',
        expectedOutcome: 'All columns have correct data types',
        failureAction: 'block',
        automatedFix: 'Cast to correct type or reject record',
        tags: ['data_type', 'casting', 'compatibility']
      }
    );

    // Business Logic Rules
    if (input.toLowerCase().includes('revenue') || input.toLowerCase().includes('financial')) {
      rules.push(
        {
          ruleId: 'bl_001',
          ruleName: 'Revenue Calculation Accuracy',
          ruleType: 'business_logic',
          severity: 'critical',
          description: 'Ensure revenue calculations are mathematically correct',
          target: { table: 'revenue_metrics' },
          condition: 'calculated_revenue = SUM(line_item_amounts)',
          expectedOutcome: 'Revenue calculations match sum of components',
          failureAction: 'block',
          automatedFix: 'Recalculate revenue using verified formula',
          tags: ['finance', 'calculation', 'accuracy']
        },
        {
          ruleId: 'bl_002',
          ruleName: 'Financial Data Range Validation',
          ruleType: 'business_logic',
          severity: 'high',
          description: 'Validate financial amounts are within reasonable ranges',
          target: { table: 'transactions', column: 'amount' },
          condition: 'amount BETWEEN 0 AND 10000000',
          expectedOutcome: 'All amounts within valid business range',
          failureAction: 'alert',
          automatedFix: 'Flag for manual review if outside normal range',
          tags: ['finance', 'range', 'anomaly']
        }
      );
    }

    // Performance Rules
    rules.push(
      {
        ruleId: 'pf_001',
        ruleName: 'Query Performance Validation',
        ruleType: 'performance',
        severity: 'medium',
        description: 'Ensure queries complete within acceptable time limits',
        target: { pipeline: 'etl_pipeline' },
        condition: 'execution_time_ms < 300000',
        expectedOutcome: 'All queries complete within 5 minutes',
        failureAction: 'alert',
        automatedFix: 'Optimize query or increase resources',
        tags: ['performance', 'sla', 'optimization']
      },
      {
        ruleId: 'pf_002',
        ruleName: 'Data Volume Validation',
        ruleType: 'performance',
        severity: 'high',
        description: 'Validate expected data volumes for capacity planning',
        target: { table: 'staging_tables' },
        condition: 'record_count BETWEEN expected_min AND expected_max',
        expectedOutcome: 'Data volumes within expected ranges',
        failureAction: 'alert',
        automatedFix: 'Scale resources if needed',
        tags: ['volume', 'capacity', 'scaling']
      }
    );

    // Compliance Rules
    if (input.toLowerCase().includes('gdpr') || input.toLowerCase().includes('compliance')) {
      rules.push(
        {
          ruleId: 'cp_001',
          ruleName: 'GDPR Data Retention Compliance',
          ruleType: 'compliance',
          severity: 'critical',
          description: 'Ensure data retention policies comply with GDPR',
          target: { table: 'customer_data' },
          condition: 'data_age_days <= max_retention_days',
          expectedOutcome: 'No data exceeds retention limits',
          failureAction: 'block',
          automatedFix: 'Archive or delete data per retention policy',
          tags: ['gdpr', 'retention', 'privacy']
        },
        {
          ruleId: 'cp_002',
          ruleName: 'PII Data Encryption Validation',
          ruleType: 'security',
          severity: 'critical',
          description: 'Ensure all PII data is properly encrypted',
          target: { table: 'customer_data', column: 'pii_fields' },
          condition: 'is_encrypted = true',
          expectedOutcome: 'All PII fields encrypted',
          failureAction: 'block',
          automatedFix: 'Apply encryption to unencrypted PII',
          tags: ['pii', 'encryption', 'security']
        }
      );
    }

    return rules;
  }

  /**
   * Generate test frameworks configuration
   */
  private generateTestFrameworks(rules: ValidationRule[], transformationPlan?: any): TestFramework[] {
    const frameworks: TestFramework[] = [];

    // Great Expectations Framework
    frameworks.push({
      frameworkId: 'ge_001',
      name: 'Great Expectations Data Quality',
      type: 'great_expectations',
      configuration: {
        datasource: {
          name: 'data_warehouse',
          class_name: 'Datasource',
          execution_engine: {
            class_name: 'SqlAlchemyExecutionEngine',
            connection_string: '${DATA_WAREHOUSE_URL}'
          }
        },
        data_context_config: {
          stores: {
            expectations_store: {
              class_name: 'ExpectationsStore',
              store_backend: {
                class_name: 'TupleFilesystemStoreBackend',
                base_directory: 'expectations/'
              }
            },
            validations_store: {
              class_name: 'ValidationsStore',
              store_backend: {
                class_name: 'TupleFilesystemStoreBackend',
                base_directory: 'validations/'
              }
            }
          }
        }
      },
      testSuites: [
        {
          suiteId: 'ge_suite_001',
          name: 'Data Quality Expectations',
          description: 'Core data quality validations using Great Expectations',
          tests: [
            {
              testId: 'ge_test_001',
              name: 'Expect Column Values To Not Be Null',
              type: 'expectation',
              description: 'Validate required columns have no null values',
              parameters: {
                column: 'customer_id',
                mostly: 1.0
              },
              retryPolicy: { maxRetries: 3, backoffMs: 5000 }
            },
            {
              testId: 'ge_test_002',
              name: 'Expect Column Values To Be Unique',
              type: 'expectation',
              description: 'Validate primary key uniqueness',
              parameters: {
                column: 'customer_id'
              },
              retryPolicy: { maxRetries: 3, backoffMs: 5000 }
            },
            {
              testId: 'ge_test_003',
              name: 'Expect Column Values To Match Regex',
              type: 'expectation',
              description: 'Validate email format',
              parameters: {
                column: 'email',
                regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                mostly: 0.95
              },
              retryPolicy: { maxRetries: 3, backoffMs: 5000 }
            }
          ],
          schedule: '0 */6 * * *', // Every 6 hours
          dependencies: ['data_ingestion'],
          environment: 'all',
          parallelizable: true
        }
      ],
      reportingConfig: {
        format: 'html',
        destinations: ['s3://data-quality-reports/', 'slack://data-team'],
        triggers: ['failure', 'success']
      }
    });

    // dbt Test Framework
    frameworks.push({
      frameworkId: 'dbt_001',
      name: 'dbt Data Testing',
      type: 'dbt_test',
      configuration: {
        profiles_dir: '/app/profiles',
        project_dir: '/app/dbt_project',
        target: 'prod'
      },
      testSuites: [
        {
          suiteId: 'dbt_suite_001',
          name: 'dbt Model Tests',
          description: 'dbt built-in and custom tests for data models',
          tests: [
            {
              testId: 'dbt_test_001',
              name: 'Test Unique Customer IDs',
              type: 'assertion',
              description: 'Ensure customer IDs are unique in dim_customers',
              query: 'SELECT customer_id, COUNT(*) as cnt FROM {{ ref("dim_customers") }} GROUP BY customer_id HAVING cnt > 1',
              parameters: {
                model: 'dim_customers',
                column: 'customer_id'
              },
              retryPolicy: { maxRetries: 2, backoffMs: 3000 }
            },
            {
              testId: 'dbt_test_002',
              name: 'Test Not Null Required Fields',
              type: 'assertion',
              description: 'Ensure required fields are not null',
              query: 'SELECT COUNT(*) FROM {{ ref("dim_customers") }} WHERE customer_id IS NULL OR email IS NULL',
              parameters: {
                expected_result: 0
              },
              retryPolicy: { maxRetries: 2, backoffMs: 3000 }
            }
          ],
          schedule: '0 2 * * *', // Daily at 2 AM
          dependencies: ['dbt_run'],
          environment: 'production',
          parallelizable: true
        }
      ],
      reportingConfig: {
        format: 'junit',
        destinations: ['file:///app/test-results/', 'slack://data-team'],
        triggers: ['failure']
      }
    });

    // Custom SQL Test Framework
    frameworks.push({
      frameworkId: 'sql_001',
      name: 'Custom SQL Validation Tests',
      type: 'custom_sql',
      configuration: {
        connection: '${DATA_WAREHOUSE_URL}',
        timeout_seconds: 300,
        retry_attempts: 3
      },
      testSuites: [
        {
          suiteId: 'sql_suite_001',
          name: 'Business Logic Validation',
          description: 'Custom SQL tests for business logic validation',
          tests: [
            {
              testId: 'sql_test_001',
              name: 'Revenue Calculation Accuracy',
              type: 'custom',
              description: 'Validate revenue calculations match sum of line items',
              query: `
                SELECT 
                  COUNT(*) as failed_records
                FROM revenue_summary r
                JOIN (
                  SELECT 
                    order_id,
                    SUM(line_amount) as calculated_total
                  FROM order_line_items 
                  GROUP BY order_id
                ) calc ON r.order_id = calc.order_id
                WHERE ABS(r.total_revenue - calc.calculated_total) > 0.01
              `,
              parameters: {
                expected_result: 0,
                tolerance: 0.01
              },
              threshold: { max: 0 },
              retryPolicy: { maxRetries: 3, backoffMs: 10000 }
            }
          ],
          schedule: '0 4 * * *', // Daily at 4 AM
          dependencies: ['transformation_complete'],
          environment: 'production',
          parallelizable: false
        }
      ],
      reportingConfig: {
        format: 'json',
        destinations: ['elasticsearch://validation-results'],
        triggers: ['failure', 'success']
      }
    });

    return frameworks;
  }

  /**
   * Generate quality metrics baseline
   */
  private generateQualityMetrics(input: string): QualityMetrics {
    return {
      completeness: {
        score: 95.0,
        missing_values: 500,
        null_percentage: 2.5
      },
      accuracy: {
        score: 98.0,
        format_violations: 100,
        constraint_violations: 50
      },
      consistency: {
        score: 92.0,
        duplicate_records: 25,
        referential_integrity_issues: 10
      },
      timeliness: {
        score: 88.0,
        latency_ms: 120000,
        staleness_hours: 2
      },
      validity: {
        score: 96.0,
        schema_violations: 5,
        business_rule_violations: 15
      },
      overall_score: 93.8
    };
  }

  /**
   * Generate monitoring configuration
   */
  private generateMonitoringConfiguration(input: string) {
    return {
      dashboards: [
        {
          name: 'Data Quality Overview',
          type: 'grafana' as const,
          metrics: [
            'data_quality_score',
            'test_pass_rate',
            'data_completeness',
            'schema_violations',
            'performance_metrics'
          ],
          alerts: [
            'quality_score_below_threshold',
            'test_failure_rate_high',
            'schema_drift_detected'
          ]
        },
        {
          name: 'Pipeline Health Dashboard',
          type: 'grafana' as const,
          metrics: [
            'pipeline_success_rate',
            'execution_time',
            'data_volume_trends',
            'error_rates'
          ],
          alerts: [
            'pipeline_failure',
            'performance_degradation',
            'volume_anomaly'
          ]
        },
        {
          name: 'Executive Quality Report',
          type: 'tableau' as const,
          metrics: [
            'overall_quality_score',
            'trend_analysis',
            'business_impact',
            'compliance_status'
          ],
          alerts: [
            'quality_sla_breach',
            'compliance_violation'
          ]
        }
      ],
      alerting: {
        channels: ['slack://data-team', 'email://data-ops@company.com', 'pagerduty://critical'],
        escalation: [
          {
            level: 'warning',
            threshold: 85,
            action: 'notify_team'
          },
          {
            level: 'critical',
            threshold: 75,
            action: 'page_on_call'
          },
          {
            level: 'emergency',
            threshold: 60,
            action: 'escalate_to_management'
          }
        ]
      },
      sla: [
        {
          metric: 'overall_quality_score',
          target: 95,
          timeframe: '24h'
        },
        {
          metric: 'test_pass_rate',
          target: 98,
          timeframe: '1h'
        },
        {
          metric: 'pipeline_availability',
          target: 99.9,
          timeframe: '30d'
        }
      ]
    };
  }

  /**
   * Generate automation configuration
   */
  private generateAutomationConfiguration(input: string) {
    return {
      cicdIntegration: `
        validation_pipeline:
          stages:
            - data_quality_tests:
                script: great_expectations checkpoint run data_quality_suite
                artifacts:
                  reports:
                    - ge_reports/
            - dbt_tests:
                script: dbt test --profiles-dir profiles
                artifacts:
                  reports:
                    - target/run_results.json
            - custom_validations:
                script: python validation_scripts/run_custom_tests.py
                artifacts:
                  reports:
                    - validation_results/
          deploy:
            only: 
              - main
            when: manual
      `,
      scheduledValidation: '0 2,8,14,20 * * *', // Every 6 hours
      autoRemediation: true,
      notificationRules: [
        {
          trigger: 'validation_failure',
          recipients: ['data-team@company.com', 'on-call@company.com'],
          format: 'detailed_report'
        },
        {
          trigger: 'quality_score_below_threshold',
          recipients: ['data-manager@company.com'],
          format: 'summary'
        },
        {
          trigger: 'compliance_violation',
          recipients: ['compliance@company.com', 'data-protection@company.com'],
          format: 'audit_report'
        }
      ]
    };
  }

  /**
   * Generate reporting configuration
   */
  private generateReportingConfiguration(input: string) {
    return {
      executiveReports: true,
      technicalReports: true,
      complianceReports: input.toLowerCase().includes('compliance') || input.toLowerCase().includes('gdpr'),
      frequency: 'daily',
      format: ['pdf', 'html', 'json']
    };
  }

  /**
   * Save validation plan to file
   */
  async saveValidationPlan(plan: ValidationPlan, outputDir: string = './pipeline-output'): Promise<void> {
    try {
      await mkdir(outputDir, { recursive: true });
      
      const filename = `pipeline-validation-plan-${new Date().toISOString().split('T')[0]}.md`;
      const filepath = join(outputDir, filename);
      
      const markdown = this.generateMarkdownReport(plan);
      await writeFile(filepath, markdown, 'utf-8');
      
      this.logger.info('Validation plan saved', { filepath });
    } catch (error) {
      this.logger.error('Failed to save validation plan', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Generate comprehensive markdown report
   */
  private generateMarkdownReport(plan: ValidationPlan): string {
    return `# Pipeline Validation Plan

## Project Overview
- **Project**: ${plan.projectName}
- **Description**: ${plan.description}
- **Validation ID**: ${plan.validationId}
- **Generated**: ${new Date().toISOString()}

## Quality Metrics Baseline

### Overall Quality Score: ${plan.qualityMetrics.overall_score}%

| Dimension | Score | Details |
|-----------|-------|---------|
| **Completeness** | ${plan.qualityMetrics.completeness.score}% | Missing: ${plan.qualityMetrics.completeness.missing_values}, Null: ${plan.qualityMetrics.completeness.null_percentage}% |
| **Accuracy** | ${plan.qualityMetrics.accuracy.score}% | Format violations: ${plan.qualityMetrics.accuracy.format_violations}, Constraint violations: ${plan.qualityMetrics.accuracy.constraint_violations} |
| **Consistency** | ${plan.qualityMetrics.consistency.score}% | Duplicates: ${plan.qualityMetrics.consistency.duplicate_records}, Integrity issues: ${plan.qualityMetrics.consistency.referential_integrity_issues} |
| **Timeliness** | ${plan.qualityMetrics.timeliness.score}% | Latency: ${plan.qualityMetrics.timeliness.latency_ms}ms, Staleness: ${plan.qualityMetrics.timeliness.staleness_hours}h |
| **Validity** | ${plan.qualityMetrics.validity.score}% | Schema violations: ${plan.qualityMetrics.validity.schema_violations}, Business rule violations: ${plan.qualityMetrics.validity.business_rule_violations} |

## Validation Rules

${plan.validationRules.map(rule => `
### ${rule.ruleName} (${rule.ruleId})
- **Type**: ${rule.ruleType}
- **Severity**: ${rule.severity}
- **Description**: ${rule.description}
- **Target**: ${rule.target.table ? `Table: ${rule.target.table}` : ''}${rule.target.column ? `, Column: ${rule.target.column}` : ''}
- **Condition**: \`${rule.condition}\`
- **Expected Outcome**: ${rule.expectedOutcome}
- **Failure Action**: ${rule.failureAction}
${rule.automatedFix ? `- **Automated Fix**: ${rule.automatedFix}` : ''}
- **Tags**: ${rule.tags.join(', ')}
`).join('')}

## Test Frameworks

${plan.testFrameworks.map(framework => `
### ${framework.name} (${framework.frameworkId})
- **Type**: ${framework.type}
- **Test Suites**: ${framework.testSuites.length}

${framework.testSuites.map(suite => `
#### ${suite.name}
- **Description**: ${suite.description}
- **Tests**: ${suite.tests.length}
- **Schedule**: ${suite.schedule}
- **Environment**: ${suite.environment}
- **Parallelizable**: ${suite.parallelizable ? 'Yes' : 'No'}

**Test Details:**
${suite.tests.map(test => `
- **${test.name}**: ${test.description}
  - Type: ${test.type}
  - Retry Policy: ${test.retryPolicy.maxRetries} retries, ${test.retryPolicy.backoffMs}ms backoff
`).join('')}
`).join('')}

**Reporting:**
- Format: ${framework.reportingConfig.format}
- Destinations: ${framework.reportingConfig.destinations.join(', ')}
- Triggers: ${framework.reportingConfig.triggers.join(', ')}
`).join('')}

## Monitoring & Alerting

### Dashboards
${plan.monitoring.dashboards.map(dashboard => `
#### ${dashboard.name} (${dashboard.type})
- **Metrics**: ${dashboard.metrics.join(', ')}
- **Alerts**: ${dashboard.alerts.join(', ')}
`).join('')}

### SLA Targets
${plan.monitoring.sla.map(sla => `
- **${sla.metric}**: ${sla.target}% target over ${sla.timeframe}
`).join('')}

### Alert Escalation
${plan.monitoring.alerting.escalation.map(level => `
- **${level.level}**: Threshold ${level.threshold}% → ${level.action}
`).join('')}

### Alert Channels
${plan.monitoring.alerting.channels.join(', ')}

## Automation

### CI/CD Integration
\`\`\`yaml
${plan.automation.cicdIntegration}
\`\`\`

### Scheduled Validation
- **Schedule**: ${plan.automation.scheduledValidation}
- **Auto-remediation**: ${plan.automation.autoRemediation ? 'Enabled' : 'Disabled'}

### Notification Rules
${plan.automation.notificationRules.map(rule => `
- **${rule.trigger}**: ${rule.recipients.join(', ')} (${rule.format})
`).join('')}

## Reporting

- **Executive Reports**: ${plan.reporting.executiveReports ? 'Enabled' : 'Disabled'}
- **Technical Reports**: ${plan.reporting.technicalReports ? 'Enabled' : 'Disabled'}
- **Compliance Reports**: ${plan.reporting.complianceReports ? 'Enabled' : 'Disabled'}
- **Frequency**: ${plan.reporting.frequency}
- **Formats**: ${plan.reporting.format.join(', ')}

## Implementation Checklist

### Infrastructure Setup
- [ ] Deploy Great Expectations environment
- [ ] Configure dbt test environment
- [ ] Set up monitoring dashboards
- [ ] Configure alert channels
- [ ] Deploy CI/CD pipeline

### Test Implementation
- [ ] Implement Great Expectations test suites
- [ ] Create dbt test models
- [ ] Deploy custom SQL validation tests
- [ ] Configure automated remediation
- [ ] Set up reporting automation

### Operational Readiness
- [ ] Train team on validation framework
- [ ] Document incident response procedures
- [ ] Establish quality SLA agreements
- [ ] Configure compliance reporting
- [ ] Test disaster recovery procedures
`;
  }

  // Utility methods
  private extractProjectName(input: string): string {
    const projectMatches = input.match(/(?:project|pipeline|system)\s+(?:named|called)?\s*["']?([a-zA-Z0-9_-]+)["']?/i);
    return projectMatches ? projectMatches[1] : 'data-validation-pipeline';
  }

  private generateDescription(input: string, rules: ValidationRule[]): string {
    return `Enterprise data validation and quality assurance pipeline for ${this.extractProjectName(input)} with ${rules.length} validation rules, automated testing frameworks, and comprehensive monitoring.`;
  }
} 
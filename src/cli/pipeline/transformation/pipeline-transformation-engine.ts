/**
 * Pipeline Transformation Engine - Phase 4
 * Handles data transformation logic, ETL processes, and dbt integration
 */

import { Logger } from '../../../core/logger.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

export interface TransformationRequirement {
  sourceField: string;
  targetField: string;
  transformationType: 'mapping' | 'calculation' | 'aggregation' | 'filter' | 'join' | 'custom';
  expression?: string;
  description: string;
  dataType: string;
  nullable?: boolean;
  validation?: string;
}

export interface DataQualityRule {
  ruleName: string;
  ruleType: 'null_check' | 'range_check' | 'format_check' | 'uniqueness' | 'referential_integrity' | 'custom';
  field: string;
  condition: string;
  action: 'reject' | 'flag' | 'correct' | 'default';
  severity: 'critical' | 'warning' | 'info';
}

export interface TransformationStep {
  stepId: string;
  stepName: string;
  stepType: 'extract' | 'transform' | 'filter' | 'aggregate' | 'join' | 'validate' | 'load';
  description: string;
  inputTables: string[];
  outputTable: string;
  sql?: string;
  pythonCode?: string;
  dependencies: string[];
  parallelizable: boolean;
  estimatedTime: string;
}

export interface PipelineTransformationPlan {
  transformationId: string;
  projectName: string;
  description: string;
  requirements: TransformationRequirement[];
  qualityRules: DataQualityRule[];
  transformationSteps: TransformationStep[];
  dbtProject: {
    models: Array<{
      name: string;
      sql: string;
      description: string;
      materialisation: 'table' | 'view' | 'incremental' | 'ephemeral';
      tags: string[];
    }>;
    seeds: Array<{
      name: string;
      description: string;
      csvPath: string;
    }>;
    tests: Array<{
      name: string;
      model: string;
      testType: 'unique' | 'not_null' | 'accepted_values' | 'relationships' | 'custom';
      config: any;
    }>;
    macros: Array<{
      name: string;
      description: string;
      sql: string;
    }>;
  };
  airflowDag: {
    dagId: string;
    schedule: string;
    description: string;
    tasks: Array<{
      taskId: string;
      taskType: 'python' | 'sql' | 'dbt' | 'sensor' | 'trigger';
      code: string;
      dependencies: string[];
    }>;
  };
  visualWorkflow: {
    nodes: Array<{
      id: string;
      type: 'source' | 'transform' | 'quality' | 'target';
      label: string;
      position: { x: number; y: number };
      data: any;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
    }>;
  };
  infrastructure: {
    computeRequirements: {
      cpu: string;
      memory: string;
      storage: string;
      estimatedCost: string;
    };
    monitoring: {
      metrics: string[];
      alerts: string[];
      dashboards: string[];
    };
  };
  deployment: {
    environments: string[];
    cicdPipeline: string;
    testingStrategy: string;
    rollbackPlan: string;
  };
}

export class PipelineTransformationEngine {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PipelineTransformationEngine');
  }

  /**
   * Create comprehensive transformation plan from natural language
   */
  async createTransformationPlan(
    input: string,
    discoveryPlan?: any,
    designPlan?: any,
    extractionPlan?: any
  ): Promise<PipelineTransformationPlan> {
    this.logger.info('Creating transformation plan', { input });

    try {
      // Parse transformation requirements from input
      const requirements = this.parseTransformationRequirements(input, designPlan);
      
      // Generate data quality rules
      const qualityRules = this.generateDataQualityRules(requirements, designPlan);
      
      // Create transformation steps
      const transformationSteps = this.generateTransformationSteps(requirements, designPlan);
      
      // Generate dbt project structure
      const dbtProject = this.generateDbtProject(requirements, transformationSteps);
      
      // Create Airflow DAG
      const airflowDag = this.generateAirflowDag(transformationSteps, dbtProject);
      
      // Generate visual workflow
      const visualWorkflow = this.generateVisualWorkflow(transformationSteps);
      
      // Calculate infrastructure requirements
      const infrastructure = this.calculateInfrastructure(transformationSteps, designPlan);
      
      // Create deployment strategy
      const deployment = this.generateDeploymentStrategy();

      const plan: PipelineTransformationPlan = {
        transformationId: `transform-${Date.now()}`,
        projectName: this.extractProjectName(input),
        description: this.generateDescription(input, requirements),
        requirements,
        qualityRules,
        transformationSteps,
        dbtProject,
        airflowDag,
        visualWorkflow,
        infrastructure,
        deployment
      };

      return plan;
    } catch (error) {
      this.logger.error('Failed to create transformation plan', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Parse transformation requirements from natural language input
   */
  private parseTransformationRequirements(input: string, designPlan?: any): TransformationRequirement[] {
    const requirements: TransformationRequirement[] = [];

    // Common transformation patterns
    const patterns = [
      { keyword: 'calculate|compute|derive', type: 'calculation' },
      { keyword: 'sum|count|average|aggregate', type: 'aggregation' },
      { keyword: 'filter|where|exclude', type: 'filter' },
      { keyword: 'join|merge|combine', type: 'join' },
      { keyword: 'map|transform|convert', type: 'mapping' }
    ];

    // Extract requirements based on input analysis
    if (input.toLowerCase().includes('customer')) {
      requirements.push({
        sourceField: 'customer_id',
        targetField: 'customer_key',
        transformationType: 'mapping',
        expression: 'CONCAT("CUST_", LPAD(customer_id, 8, "0"))',
        description: 'Generate customer business key',
        dataType: 'VARCHAR(12)',
        nullable: false
      });
    }

    if (input.toLowerCase().includes('revenue') || input.toLowerCase().includes('sales')) {
      requirements.push({
        sourceField: 'order_amount',
        targetField: 'monthly_revenue',
        transformationType: 'aggregation',
        expression: 'SUM(order_amount) OVER (PARTITION BY customer_id, YEAR(order_date), MONTH(order_date))',
        description: 'Calculate monthly revenue per customer',
        dataType: 'DECIMAL(15,2)',
        nullable: true
      });
    }

    if (input.toLowerCase().includes('clean') || input.toLowerCase().includes('quality')) {
      requirements.push({
        sourceField: 'email',
        targetField: 'email_clean',
        transformationType: 'mapping',
        expression: 'LOWER(TRIM(email))',
        description: 'Standardize email format',
        dataType: 'VARCHAR(255)',
        validation: 'REGEXP_LIKE(email_clean, "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")'
      });
    }

    if (input.toLowerCase().includes('date') || input.toLowerCase().includes('time')) {
      requirements.push({
        sourceField: 'created_at',
        targetField: 'created_date',
        transformationType: 'mapping',
        expression: 'DATE(created_at)',
        description: 'Extract date component from timestamp',
        dataType: 'DATE',
        nullable: false
      });
    }

    // Add default requirements if none found
    if (requirements.length === 0) {
      requirements.push({
        sourceField: 'id',
        targetField: 'surrogate_key',
        transformationType: 'mapping',
        expression: 'ROW_NUMBER() OVER (ORDER BY id)',
        description: 'Generate surrogate key',
        dataType: 'BIGINT',
        nullable: false
      });
    }

    return requirements;
  }

  /**
   * Generate comprehensive data quality rules
   */
  private generateDataQualityRules(requirements: TransformationRequirement[], designPlan?: any): DataQualityRule[] {
    const rules: DataQualityRule[] = [];

    // Standard quality rules
    rules.push(
      {
        ruleName: 'primary_key_uniqueness',
        ruleType: 'uniqueness',
        field: 'id',
        condition: 'COUNT(*) = COUNT(DISTINCT id)',
        action: 'reject',
        severity: 'critical'
      },
      {
        ruleName: 'email_format_validation',
        ruleType: 'format_check',
        field: 'email',
        condition: 'REGEXP_LIKE(email, "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")',
        action: 'flag',
        severity: 'warning'
      },
      {
        ruleName: 'amount_range_check',
        ruleType: 'range_check',
        field: 'amount',
        condition: 'amount >= 0 AND amount <= 1000000',
        action: 'flag',
        severity: 'warning'
      },
      {
        ruleName: 'required_fields_check',
        ruleType: 'null_check',
        field: 'customer_id',
        condition: 'customer_id IS NOT NULL',
        action: 'reject',
        severity: 'critical'
      }
    );

    // Add requirement-specific rules
    requirements.forEach(req => {
      if (req.validation) {
        rules.push({
          ruleName: `${req.targetField}_validation`,
          ruleType: 'custom',
          field: req.targetField,
          condition: req.validation,
          action: 'flag',
          severity: 'warning'
        });
      }
    });

    return rules;
  }

  /**
   * Generate detailed transformation steps
   */
  private generateTransformationSteps(requirements: TransformationRequirement[], designPlan?: any): TransformationStep[] {
    const steps: TransformationStep[] = [];

    // Step 1: Data Extraction and Staging
    steps.push({
      stepId: 'extract_stage',
      stepName: 'Extract and Stage Raw Data',
      stepType: 'extract',
      description: 'Extract data from sources and load into staging tables',
      inputTables: ['source_systems'],
      outputTable: 'staging_raw_data',
      sql: `
        CREATE TABLE staging_raw_data AS
        SELECT 
          *,
          CURRENT_TIMESTAMP as extracted_at,
          '{{ ds }}' as batch_date
        FROM source_table
        WHERE DATE(created_at) = '{{ ds }}'
      `,
      dependencies: [],
      parallelizable: true,
      estimatedTime: '10-15 minutes'
    });

    // Step 2: Data Cleaning and Standardization
    steps.push({
      stepId: 'clean_standardize',
      stepName: 'Clean and Standardize Data',
      stepType: 'transform',
      description: 'Apply data cleaning and standardization rules',
      inputTables: ['staging_raw_data'],
      outputTable: 'staging_clean_data',
      sql: `
        CREATE TABLE staging_clean_data AS
        SELECT 
          id,
          LOWER(TRIM(email)) as email_clean,
          UPPER(TRIM(country)) as country_standardized,
          CASE 
            WHEN amount < 0 THEN 0 
            WHEN amount > 1000000 THEN 1000000 
            ELSE amount 
          END as amount_validated,
          DATE(created_at) as created_date,
          extracted_at,
          batch_date
        FROM staging_raw_data
        WHERE email IS NOT NULL 
          AND email != ''
      `,
      dependencies: ['extract_stage'],
      parallelizable: true,
      estimatedTime: '5-10 minutes'
    });

    // Step 3: Business Logic Transformations
    requirements.forEach((req, index) => {
      steps.push({
        stepId: `transform_${index + 1}`,
        stepName: `Transform: ${req.description}`,
        stepType: 'transform',
        description: req.description,
        inputTables: ['staging_clean_data'],
        outputTable: `transformed_${req.targetField}`,
        sql: `
          CREATE TABLE transformed_${req.targetField} AS
          SELECT 
            *,
            ${req.expression} as ${req.targetField}
          FROM staging_clean_data
        `,
        dependencies: ['clean_standardize'],
        parallelizable: req.transformationType !== 'join',
        estimatedTime: '3-5 minutes'
      });
    });

    // Step 4: Data Quality Validation
    steps.push({
      stepId: 'quality_validation',
      stepName: 'Data Quality Validation',
      stepType: 'validate',
      description: 'Run comprehensive data quality checks',
      inputTables: ['staging_clean_data'],
      outputTable: 'quality_metrics',
      pythonCode: `
import pandas as pd
from great_expectations import DataContext

def validate_data_quality():
    # Load data
    df = pd.read_sql("SELECT * FROM staging_clean_data", connection)
    
    # Run quality checks
    context = DataContext()
    suite = context.get_expectation_suite("data_quality_suite")
    
    # Validate expectations
    results = context.run_validation_operator(
        "action_list_operator",
        assets_to_validate=[df],
        run_id="validation_run"
    )
    
    return results
      `,
      dependencies: ['clean_standardize'],
      parallelizable: false,
      estimatedTime: '5-8 minutes'
    });

    // Step 5: Final Aggregations and Loading
    steps.push({
      stepId: 'final_aggregation',
      stepName: 'Create Final Aggregated Views',
      stepType: 'aggregate',
      description: 'Create final business views and aggregations',
      inputTables: requirements.map((_, i) => `transformed_${requirements[i].targetField}`),
      outputTable: 'final_business_view',
      sql: `
        CREATE TABLE final_business_view AS
        SELECT 
          customer_id,
          COUNT(*) as transaction_count,
          SUM(amount_validated) as total_amount,
          AVG(amount_validated) as avg_amount,
          MIN(created_date) as first_transaction,
          MAX(created_date) as last_transaction,
          CURRENT_TIMESTAMP as processed_at
        FROM staging_clean_data
        GROUP BY customer_id
      `,
      dependencies: requirements.map((_, i) => `transform_${i + 1}`),
      parallelizable: false,
      estimatedTime: '10-15 minutes'
    });

    return steps;
  }

  /**
   * Generate comprehensive dbt project structure
   */
  private generateDbtProject(requirements: TransformationRequirement[], steps: TransformationStep[]) {
    const models = [
      {
        name: 'staging_customers',
        sql: `
          {{ config(materialized='view') }}
          
          SELECT 
            customer_id,
            LOWER(TRIM(email)) as email,
            UPPER(TRIM(country)) as country,
            created_at,
            updated_at
          FROM {{ source('raw', 'customers') }}
          WHERE customer_id IS NOT NULL
        `,
        description: 'Cleaned and standardized customer data',
        materialisation: 'view' as const,
        tags: ['staging', 'customers']
      },
      {
        name: 'dim_customers',
        sql: `
          {{ config(materialized='table') }}
          
          SELECT 
            {{ dbt_utils.surrogate_key(['customer_id']) }} as customer_key,
            customer_id,
            email,
            country,
            created_at,
            updated_at,
            CURRENT_TIMESTAMP as dbt_loaded_at
          FROM {{ ref('staging_customers') }}
        `,
        description: 'Customer dimension table with business keys',
        materialisation: 'table' as const,
        tags: ['dimension', 'customers']
      },
      {
        name: 'fact_transactions',
        sql: `
          {{ config(
            materialized='incremental',
            unique_key='transaction_id',
            on_schema_change='fail'
          ) }}
          
          SELECT 
            transaction_id,
            {{ dbt_utils.surrogate_key(['customer_id']) }} as customer_key,
            amount,
            transaction_date,
            status,
            CURRENT_TIMESTAMP as dbt_loaded_at
          FROM {{ source('raw', 'transactions') }}
          
          {% if is_incremental() %}
            WHERE transaction_date > (SELECT MAX(transaction_date) FROM {{ this }})
          {% endif %}
        `,
        description: 'Transaction fact table with incremental loading',
        materialisation: 'incremental' as const,
        tags: ['fact', 'transactions']
      }
    ];

    const tests = [
      {
        name: 'unique_customer_key',
        model: 'dim_customers',
        testType: 'unique' as const,
        config: { column_name: 'customer_key' }
      },
      {
        name: 'not_null_customer_id',
        model: 'dim_customers',
        testType: 'not_null' as const,
        config: { column_name: 'customer_id' }
      },
      {
        name: 'valid_email_format',
        model: 'staging_customers',
        testType: 'custom' as const,
        config: {
          sql: `
            SELECT COUNT(*) as failures
            FROM {{ ref('staging_customers') }}
            WHERE email IS NOT NULL 
              AND NOT REGEXP_LIKE(email, '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
          `
        }
      }
    ];

    const macros = [
      {
        name: 'clean_email',
        description: 'Standardize email format',
        sql: `
          {% macro clean_email(column_name) %}
            LOWER(TRIM({{ column_name }}))
          {% endmacro %}
        `
      },
      {
        name: 'validate_amount',
        description: 'Validate and cap transaction amounts',
        sql: `
          {% macro validate_amount(column_name, min_value=0, max_value=1000000) %}
            CASE 
              WHEN {{ column_name }} < {{ min_value }} THEN {{ min_value }}
              WHEN {{ column_name }} > {{ max_value }} THEN {{ max_value }}
              ELSE {{ column_name }}
            END
          {% endmacro %}
        `
      }
    ];

    return {
      models,
      seeds: [
        {
          name: 'country_codes',
          description: 'ISO country code reference data',
          csvPath: 'seeds/country_codes.csv'
        }
      ],
      tests,
      macros
    };
  }

  /**
   * Generate Airflow DAG for orchestration
   */
  private generateAirflowDag(steps: TransformationStep[], dbtProject: any) {
    const tasks = steps.map(step => ({
      taskId: step.stepId,
      taskType: (step.stepType === 'transform' ? 'dbt' : 
                step.stepType === 'extract' ? 'sql' :
                step.stepType === 'validate' ? 'python' : 'sql') as 'python' | 'sql' | 'dbt' | 'sensor' | 'trigger',
      code: step.stepType === 'transform' ? 
        `dbt run --models ${step.outputTable}` : 
        step.pythonCode || step.sql || '',
      dependencies: step.dependencies
    }));

    // Add dbt-specific tasks
    tasks.push(
      {
        taskId: 'dbt_seed',
        taskType: 'dbt' as const,
        code: 'dbt seed',
        dependencies: []
      },
      {
        taskId: 'dbt_test',
        taskType: 'dbt' as const,
        code: 'dbt test',
        dependencies: ['final_aggregation']
      },
      {
        taskId: 'dbt_docs_generate',
        taskType: 'dbt' as const,
        code: 'dbt docs generate',
        dependencies: ['dbt_test']
      }
    );

    return {
      dagId: 'data_transformation_pipeline',
      schedule: '0 2 * * *', // Daily at 2 AM
      description: 'Enterprise data transformation pipeline with dbt',
      tasks
    };
  }

  /**
   * Generate visual workflow representation
   */
  private generateVisualWorkflow(steps: TransformationStep[]) {
    const nodes = steps.map((step, index) => ({
      id: step.stepId,
      type: (step.stepType === 'extract' ? 'source' : 
            step.stepType === 'load' ? 'target' : 
            step.stepType === 'validate' ? 'quality' : 'transform') as 'source' | 'transform' | 'quality' | 'target',
      label: step.stepName,
      position: { x: 100 + (index % 3) * 200, y: 100 + Math.floor(index / 3) * 150 },
      data: {
        description: step.description,
        estimatedTime: step.estimatedTime,
        parallelizable: step.parallelizable
      }
    }));

    const edges: Array<{ id: string; source: string; target: string; label?: string }> = [];
    steps.forEach(step => {
      step.dependencies.forEach(dep => {
        edges.push({
          id: `${dep}-${step.stepId}`,
          source: dep,
          target: step.stepId,
          label: 'depends on'
        });
      });
    });

    return { nodes, edges };
  }

  /**
   * Calculate infrastructure requirements
   */
  private calculateInfrastructure(steps: TransformationStep[], designPlan?: any) {
    const stepCount = steps.length;
    const parallelSteps = steps.filter(s => s.parallelizable).length;
    
    return {
      computeRequirements: {
        cpu: `${Math.max(4, stepCount * 2)} vCPUs`,
        memory: `${Math.max(16, stepCount * 4)} GB`,
        storage: `${Math.max(100, stepCount * 20)} GB SSD`,
        estimatedCost: `$${(stepCount * 0.50).toFixed(2)}/hour`
      },
      monitoring: {
        metrics: [
          'transformation_success_rate',
          'data_quality_score',
          'processing_time',
          'throughput_rows_per_second',
          'error_rate',
          'resource_utilization'
        ],
        alerts: [
          'transformation_failure',
          'data_quality_below_threshold',
          'processing_time_exceeded',
          'high_error_rate'
        ],
        dashboards: [
          'transformation_overview',
          'data_quality_metrics',
          'performance_analytics',
          'cost_optimization'
        ]
      }
    };
  }

  /**
   * Generate deployment strategy
   */
  private generateDeploymentStrategy() {
    return {
      environments: ['development', 'staging', 'production'],
      cicdPipeline: `
        stages:
          - lint: dbt parse && sqlfluff lint
          - test: dbt test --target dev
          - deploy_staging: dbt run --target staging
          - integration_test: pytest tests/integration/
          - deploy_production: dbt run --target prod
          - monitoring: deploy dashboards and alerts
      `,
      testingStrategy: `
        - Unit tests for dbt models
        - Integration tests for end-to-end pipeline
        - Data quality tests with Great Expectations
        - Performance tests for large datasets
        - Security tests for data access
      `,
      rollbackPlan: `
        - Maintain previous version snapshots
        - Blue-green deployment strategy
        - Automated rollback triggers
        - Data integrity verification
      `
    };
  }

  /**
   * Save transformation plan to file
   */
  async saveTransformationPlan(plan: PipelineTransformationPlan, outputDir: string = './pipeline-output'): Promise<void> {
    try {
      await mkdir(outputDir, { recursive: true });
      
      const filename = `pipeline-transformation-plan-${new Date().toISOString().split('T')[0]}.md`;
      const filepath = join(outputDir, filename);
      
      const markdown = this.generateMarkdownReport(plan);
      await writeFile(filepath, markdown, 'utf-8');
      
      this.logger.info('Transformation plan saved', { filepath });
    } catch (error) {
      this.logger.error('Failed to save transformation plan', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Generate comprehensive markdown report
   */
  private generateMarkdownReport(plan: PipelineTransformationPlan): string {
    return `# Pipeline Transformation Plan

## Project Overview
- **Project**: ${plan.projectName}
- **Description**: ${plan.description}
- **Transformation ID**: ${plan.transformationId}
- **Generated**: ${new Date().toISOString()}

## Transformation Requirements

${plan.requirements.map(req => `
### ${req.targetField}
- **Source**: ${req.sourceField}
- **Type**: ${req.transformationType}
- **Expression**: \`${req.expression}\`
- **Description**: ${req.description}
- **Data Type**: ${req.dataType}
- **Nullable**: ${req.nullable || false}
${req.validation ? `- **Validation**: \`${req.validation}\`` : ''}
`).join('')}

## Data Quality Rules

| Rule | Field | Condition | Action | Severity |
|------|--------|-----------|---------|----------|
${plan.qualityRules.map(rule => 
  `| ${rule.ruleName} | ${rule.field} | ${rule.condition} | ${rule.action} | ${rule.severity} |`
).join('\n')}

## Transformation Steps

${plan.transformationSteps.map((step, i) => `
### Step ${i + 1}: ${step.stepName}
- **ID**: ${step.stepId}
- **Type**: ${step.stepType}
- **Description**: ${step.description}
- **Input Tables**: ${step.inputTables.join(', ')}
- **Output Table**: ${step.outputTable}
- **Dependencies**: ${step.dependencies.join(', ') || 'None'}
- **Parallelizable**: ${step.parallelizable ? 'Yes' : 'No'}
- **Estimated Time**: ${step.estimatedTime}

${step.sql ? `**SQL:**
\`\`\`sql
${step.sql}
\`\`\`` : ''}

${step.pythonCode ? `**Python Code:**
\`\`\`python
${step.pythonCode}
\`\`\`` : ''}
`).join('')}

## dbt Project Structure

### Models
${plan.dbtProject.models.map(model => `
#### ${model.name}
- **Materialization**: ${model.materialisation}
- **Description**: ${model.description}
- **Tags**: ${model.tags.join(', ')}

\`\`\`sql
${model.sql}
\`\`\`
`).join('')}

### Tests
${plan.dbtProject.tests.map(test => `
- **${test.name}**: ${test.testType} test on ${test.model}
`).join('')}

### Macros
${plan.dbtProject.macros.map(macro => `
#### ${macro.name}
${macro.description}

\`\`\`sql
${macro.sql}
\`\`\`
`).join('')}

## Airflow DAG

- **DAG ID**: ${plan.airflowDag.dagId}
- **Schedule**: ${plan.airflowDag.schedule}
- **Description**: ${plan.airflowDag.description}

### Tasks
${plan.airflowDag.tasks.map(task => `
- **${task.taskId}** (${task.taskType}): Dependencies: ${task.dependencies.join(', ') || 'None'}
`).join('')}

## Infrastructure Requirements

### Compute
- **CPU**: ${plan.infrastructure.computeRequirements.cpu}
- **Memory**: ${plan.infrastructure.computeRequirements.memory}
- **Storage**: ${plan.infrastructure.computeRequirements.storage}
- **Estimated Cost**: ${plan.infrastructure.computeRequirements.estimatedCost}

### Monitoring
- **Metrics**: ${plan.infrastructure.monitoring.metrics.join(', ')}
- **Alerts**: ${plan.infrastructure.monitoring.alerts.join(', ')}
- **Dashboards**: ${plan.infrastructure.monitoring.dashboards.join(', ')}

## Deployment Strategy

### Environments
${plan.deployment.environments.join(' → ')}

### CI/CD Pipeline
\`\`\`yaml
${plan.deployment.cicdPipeline}
\`\`\`

### Testing Strategy
${plan.deployment.testingStrategy}

### Rollback Plan
${plan.deployment.rollbackPlan}

## Visual Workflow

### Nodes
${plan.visualWorkflow.nodes.map(node => `
- **${node.id}**: ${node.label} (${node.type})
`).join('')}

### Dependencies
${plan.visualWorkflow.edges.map(edge => `
- ${edge.source} → ${edge.target}
`).join('')}
`;
  }

  // Utility methods
  private extractProjectName(input: string): string {
    const projectMatches = input.match(/(?:project|pipeline|system)\s+(?:named|called)?\s*["']?([a-zA-Z0-9_-]+)["']?/i);
    return projectMatches ? projectMatches[1] : 'data-transformation-pipeline';
  }

  private generateDescription(input: string, requirements: TransformationRequirement[]): string {
    return `Enterprise data transformation pipeline for ${this.extractProjectName(input)} with ${requirements.length} transformation rules, comprehensive data quality validation, and automated ETL processing.`;
  }
} 
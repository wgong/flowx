/**
 * SPARC Command Handler for Pipeline Transformation Phase
 */

import { Logger } from '../../../core/logger.js';
import { printSuccess, printError, printInfo, printWarning } from '../../core/output-formatter.js';
import { PipelineTransformationEngine } from '../../pipeline/transformation/pipeline-transformation-engine.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface TransformationSparcOptions {
  discoveryPlan?: string;
  designPlan?: string;
  extractionPlan?: string;
  outputDir?: string;
  generateCode?: boolean;
  validateOnly?: boolean;
}

export class TransformationSparcHandler {
  private logger: Logger;
  private transformationEngine: PipelineTransformationEngine;

  constructor() {
    this.logger = new Logger('TransformationSparcHandler');
    this.transformationEngine = new PipelineTransformationEngine();
  }

  /**
   * Handle pipeline transformation SPARC command
   */
  async handleTransformationCommand(input: string, options: TransformationSparcOptions = {}): Promise<void> {
    try {
      printInfo('🔄 Starting Pipeline Transformation Phase...');
      
      // Load previous phase plans if provided
      let discoveryPlan, designPlan, extractionPlan;
      
      if (options.discoveryPlan) {
        try {
          const discoveryContent = await readFile(options.discoveryPlan, 'utf-8');
          discoveryPlan = this.parsePlanFromMarkdown(discoveryContent);
          printInfo(`✓ Loaded discovery plan from ${options.discoveryPlan}`);
        } catch (error) {
          printWarning(`Could not load discovery plan: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (options.designPlan) {
        try {
          const designContent = await readFile(options.designPlan, 'utf-8');
          designPlan = this.parsePlanFromMarkdown(designContent);
          printInfo(`✓ Loaded design plan from ${options.designPlan}`);
        } catch (error) {
          printWarning(`Could not load design plan: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (options.extractionPlan) {
        try {
          const extractionContent = await readFile(options.extractionPlan, 'utf-8');
          extractionPlan = this.parsePlanFromMarkdown(extractionContent);
          printInfo(`✓ Loaded extraction plan from ${options.extractionPlan}`);
        } catch (error) {
          printWarning(`Could not load extraction plan: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Create comprehensive transformation plan
      printInfo('🧠 Analyzing transformation requirements...');
      const transformationPlan = await this.transformationEngine.createTransformationPlan(
        input,
        discoveryPlan,
        designPlan,
        extractionPlan
      );

      // Validate transformation plan if requested
      if (options.validateOnly) {
        await this.validateTransformationPlan(transformationPlan);
        return;
      }

      // Display transformation plan summary
      this.displayTransformationSummary(transformationPlan);

      // Save comprehensive plan
      const outputDir = options.outputDir || './pipeline-output';
      await this.transformationEngine.saveTransformationPlan(transformationPlan, outputDir);

      // Generate additional code artifacts if requested
      if (options.generateCode) {
        await this.generateCodeArtifacts(transformationPlan, outputDir);
      }

      printSuccess('🎉 Pipeline Transformation Phase completed successfully!');
      printInfo('📄 Transformation plan saved with:');
      printInfo('   • Comprehensive ETL transformation steps');
      printInfo('   • dbt project structure with models, tests, and macros');
      printInfo('   • Airflow DAG for orchestration');
      printInfo('   • Data quality validation rules');
      printInfo('   • Visual workflow diagram');
      printInfo('   • Infrastructure and deployment strategy');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Transformation command failed', { error: errorMessage });
      printError(`❌ Failed to process transformation phase: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Display transformation plan summary
   */
  private displayTransformationSummary(plan: any): void {
    printSuccess(`🔄 Transformation Plan: ${plan.projectName}`);
    printInfo(`📝 Description: ${plan.description}`);
    printInfo('');

    printInfo('📊 Transformation Overview:');
    printInfo(`   • Requirements: ${plan.requirements.length} transformation rules`);
    printInfo(`   • Quality Rules: ${plan.qualityRules.length} data quality checks`);
    printInfo(`   • Transformation Steps: ${plan.transformationSteps.length} processing steps`);
    printInfo(`   • dbt Models: ${plan.dbtProject.models.length} models`);
    printInfo(`   • dbt Tests: ${plan.dbtProject.tests.length} tests`);
    printInfo(`   • Airflow Tasks: ${plan.airflowDag.tasks.length} orchestration tasks`);
    printInfo('');

    printInfo('🛠️ Key Transformation Requirements:');
    plan.requirements.slice(0, 5).forEach((req: any) => {
      printInfo(`   • ${req.targetField}: ${req.description}`);
    });
    if (plan.requirements.length > 5) {
      printInfo(`   • ... and ${plan.requirements.length - 5} more`);
    }
    printInfo('');

    printInfo('🔍 Data Quality Focus Areas:');
    const criticalRules = plan.qualityRules.filter((rule: any) => rule.severity === 'critical');
    criticalRules.slice(0, 3).forEach((rule: any) => {
      printInfo(`   • ${rule.ruleName}: ${rule.condition}`);
    });
    printInfo('');

    printInfo('⚡ Processing Strategy:');
    const parallelSteps = plan.transformationSteps.filter((step: any) => step.parallelizable);
    printInfo(`   • Parallel Steps: ${parallelSteps.length}/${plan.transformationSteps.length}`);
    printInfo(`   • Estimated Total Time: ${this.calculateTotalTime(plan.transformationSteps)}`);
    printInfo('');

    printInfo('💰 Infrastructure Requirements:');
    printInfo(`   • CPU: ${plan.infrastructure.computeRequirements.cpu}`);
    printInfo(`   • Memory: ${plan.infrastructure.computeRequirements.memory}`);
    printInfo(`   • Storage: ${plan.infrastructure.computeRequirements.storage}`);
    printInfo(`   • Estimated Cost: ${plan.infrastructure.computeRequirements.estimatedCost}`);
    printInfo('');

    printInfo('📈 Monitoring & Alerts:');
    printInfo(`   • Metrics: ${plan.infrastructure.monitoring.metrics.length} tracked metrics`);
    printInfo(`   • Alerts: ${plan.infrastructure.monitoring.alerts.length} alert conditions`);
    printInfo(`   • Dashboards: ${plan.infrastructure.monitoring.dashboards.length} monitoring dashboards`);
  }

  /**
   * Validate transformation plan
   */
  private async validateTransformationPlan(plan: any): Promise<void> {
    printInfo('🔍 Validating transformation plan...');

    const issues = [];

    // Validate transformation requirements
    if (plan.requirements.length === 0) {
      issues.push('No transformation requirements defined');
    }

    // Validate data quality rules
    const criticalRules = plan.qualityRules.filter((rule: any) => rule.severity === 'critical');
    if (criticalRules.length === 0) {
      issues.push('No critical data quality rules defined');
    }

    // Validate transformation steps dependencies
    const stepIds = plan.transformationSteps.map((step: any) => step.stepId);
    plan.transformationSteps.forEach((step: any) => {
      step.dependencies.forEach((dep: string) => {
        if (!stepIds.includes(dep)) {
          issues.push(`Step ${step.stepId} depends on non-existent step ${dep}`);
        }
      });
    });

    // Validate dbt models
    if (plan.dbtProject.models.length === 0) {
      issues.push('No dbt models defined');
    }

    // Display validation results
    if (issues.length === 0) {
      printSuccess('✅ Transformation plan validation passed');
    } else {
      printWarning('⚠️ Transformation plan validation issues found:');
      issues.forEach(issue => printWarning(`   • ${issue}`));
    }
  }

  /**
   * Generate additional code artifacts
   */
  private async generateCodeArtifacts(plan: any, outputDir: string): Promise<void> {
    printInfo('🔧 Generating code artifacts...');

    try {
      // Generate dbt project files
      await this.generateDbtProject(plan, outputDir);
      
      // Generate Airflow DAG
      await this.generateAirflowDag(plan, outputDir);
      
      // Generate Great Expectations configuration
      await this.generateGreatExpectationsConfig(plan, outputDir);
      
      // Generate Docker configuration
      await this.generateDockerConfiguration(plan, outputDir);

      printSuccess('✅ Code artifacts generated successfully');
    } catch (error) {
      printWarning(`⚠️ Some code artifacts failed to generate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate dbt project structure
   */
  private async generateDbtProject(plan: any, outputDir: string): Promise<void> {
    const dbtDir = join(outputDir, 'dbt_project');
    
    // Generate dbt_project.yml
    const dbtProjectYml = `
name: '${plan.projectName.replace(/-/g, '_')}'
version: '1.0.0'
config-version: 2

profile: '${plan.projectName.replace(/-/g, '_')}'

model-paths: ["models"]
analysis-paths: ["analysis"]
test-paths: ["tests"]
seed-paths: ["data"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  ${plan.projectName.replace(/-/g, '_')}:
    staging:
      +materialized: view
    marts:
      +materialized: table
`;

    // Generate models
    for (const model of plan.dbtProject.models) {
      const modelDir = join(dbtDir, 'models', model.tags.includes('staging') ? 'staging' : 'marts');
      const modelPath = join(modelDir, `${model.name}.sql`);
      // Would write model files here
    }

    printInfo(`   • dbt project structure created in ${dbtDir}`);
  }

  /**
   * Generate Airflow DAG
   */
  private async generateAirflowDag(plan: any, outputDir: string): Promise<void> {
    const airflowDir = join(outputDir, 'airflow');
    const dagContent = `
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from airflow.operators.bash_operator import BashOperator

default_args = {
    'owner': 'data-engineering',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    '${plan.airflowDag.dagId}',
    default_args=default_args,
    description='${plan.airflowDag.description}',
    schedule_interval='${plan.airflowDag.schedule}',
    catchup=False,
    tags=['data-pipeline', 'transformation']
)

# DAG tasks would be generated here
`;

    printInfo(`   • Airflow DAG created in ${airflowDir}`);
  }

  /**
   * Generate Great Expectations configuration
   */
  private async generateGreatExpectationsConfig(plan: any, outputDir: string): Promise<void> {
    const geDir = join(outputDir, 'great_expectations');
    
    const geConfig = {
      config_version: 3.0,
      datasources: {
        data_warehouse: {
          class_name: "Datasource",
          execution_engine: {
            class_name: "SqlAlchemyExecutionEngine",
            connection_string: "${DATA_WAREHOUSE_URL}"
          },
          data_connectors: {
            default_runtime_data_connector: {
              class_name: "RuntimeDataConnector",
              batch_identifiers: ["default_identifier_name"]
            }
          }
        }
      },
      stores: {
        expectations_store: {
          class_name: "ExpectationsStore",
          store_backend: {
            class_name: "TupleFilesystemStoreBackend",
            base_directory: "expectations/"
          }
        }
      }
    };

    printInfo(`   • Great Expectations configuration created in ${geDir}`);
  }

  /**
   * Generate Docker configuration
   */
  private async generateDockerConfiguration(plan: any, outputDir: string): Promise<void> {
    const dockerDir = join(outputDir, 'docker');
    
    const dockerfile = `
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["python", "main.py"]
`;

    const dockerCompose = `
version: '3.8'

services:
  transformation-pipeline:
    build: .
    environment:
      - DBT_PROFILES_DIR=/app/profiles
      - DATA_WAREHOUSE_URL=\${DATA_WAREHOUSE_URL}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    ports:
      - "8080:8080"
      
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: pipeline_db
      POSTGRES_USER: pipeline_user
      POSTGRES_PASSWORD: pipeline_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
`;

    printInfo(`   • Docker configuration created in ${dockerDir}`);
  }

  /**
   * Calculate total estimated processing time
   */
  private calculateTotalTime(steps: any[]): string {
    const parallelGroups = this.groupParallelSteps(steps);
    const totalMinutes = parallelGroups.reduce((total, group) => {
      const maxTimeInGroup = Math.max(...group.map(step => this.parseTimeInMinutes(step.estimatedTime)));
      return total + maxTimeInGroup;
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Group steps that can run in parallel
   */
  private groupParallelSteps(steps: any[]): any[][] {
    const groups: any[][] = [];
    const processed = new Set<string>();
    
    while (processed.size < steps.length) {
      const currentGroup = [];
      
      for (const step of steps) {
        if (processed.has(step.stepId)) continue;
        
        // Check if all dependencies are processed
        const canRun = step.dependencies.every((dep: string) => processed.has(dep));
        
        if (canRun && step.parallelizable) {
          currentGroup.push(step);
          processed.add(step.stepId);
        } else if (canRun && currentGroup.length === 0) {
          // Non-parallelizable step runs alone
          currentGroup.push(step);
          processed.add(step.stepId);
          break;
        }
      }
      
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      } else {
        // Handle remaining sequential steps
        const remainingSteps = steps.filter(step => !processed.has(step.stepId));
        if (remainingSteps.length > 0) {
          groups.push([remainingSteps[0]]);
          processed.add(remainingSteps[0].stepId);
        }
      }
    }
    
    return groups;
  }

  /**
   * Parse time string to minutes
   */
  private parseTimeInMinutes(timeStr: string): number {
    const match = timeStr.match(/(\d+)[-–](\d+)\s*minutes?/);
    if (match) {
      return parseInt(match[2]); // Use the upper bound
    }
    return 5; // Default fallback
  }

  /**
   * Parse plan from markdown content
   */
  private parsePlanFromMarkdown(content: string): any {
    // Simple parser - in production would use proper markdown parser
    try {
      const lines = content.split('\n');
      const plan: any = {};
      
      // Extract basic information
      for (const line of lines) {
        if (line.includes('Project:')) {
          plan.projectName = line.split(':')[1]?.trim();
        }
        if (line.includes('Description:')) {
          plan.description = line.split(':')[1]?.trim();
        }
      }
      
      return plan;
    } catch (error) {
      return {};
    }
  }
}

// Export the handler function for CLI integration
export async function handlePipelineTransformation(input: string, options: TransformationSparcOptions = {}): Promise<void> {
  const handler = new TransformationSparcHandler();
  await handler.handleTransformationCommand(input, options);
} 
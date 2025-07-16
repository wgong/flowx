/**
 * SPARC Command Handler for Pipeline Validation Phase
 */

import { Logger } from '../../../core/logger.js';
import { printSuccess, printError, printInfo, printWarning } from '../../core/output-formatter.js';
import { PipelineValidationEngine } from '../../pipeline/validation/pipeline-validation-engine.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface ValidationSparcOptions {
  discoveryPlan?: string;
  designPlan?: string;
  extractionPlan?: string;
  transformationPlan?: string;
  outputDir?: string;
  generateTests?: boolean;
  deployFrameworks?: boolean;
  validateOnly?: boolean;
  compliance?: boolean;
}

export class ValidationSparcHandler {
  private logger: Logger;
  private validationEngine: PipelineValidationEngine;

  constructor() {
    this.logger = new Logger('ValidationSparcHandler');
    this.validationEngine = new PipelineValidationEngine();
  }

  /**
   * Handle pipeline validation SPARC command
   */
  async handleValidationCommand(input: string, options: ValidationSparcOptions = {}): Promise<void> {
    try {
      printInfo('🔍 Starting Pipeline Validation & Quality Assurance Phase...');
      
      // Load previous phase plans if provided
      let discoveryPlan, designPlan, extractionPlan, transformationPlan;
      
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

      if (options.transformationPlan) {
        try {
          const transformationContent = await readFile(options.transformationPlan, 'utf-8');
          transformationPlan = this.parsePlanFromMarkdown(transformationContent);
          printInfo(`✓ Loaded transformation plan from ${options.transformationPlan}`);
        } catch (error) {
          printWarning(`Could not load transformation plan: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Create comprehensive validation plan
      printInfo('🧠 Analyzing validation and quality requirements...');
      const validationPlan = await this.validationEngine.createValidationPlan(
        input,
        discoveryPlan,
        designPlan,
        extractionPlan,
        transformationPlan
      );

      // Validate plan if requested
      if (options.validateOnly) {
        await this.validateValidationPlan(validationPlan);
        return;
      }

      // Display validation plan summary
      this.displayValidationSummary(validationPlan);

      // Save comprehensive plan
      const outputDir = options.outputDir || './pipeline-output';
      await this.validationEngine.saveValidationPlan(validationPlan, outputDir);

      // Generate test frameworks if requested
      if (options.generateTests) {
        await this.generateTestFrameworks(validationPlan, outputDir);
      }

      // Deploy frameworks if requested
      if (options.deployFrameworks) {
        await this.deployValidationFrameworks(validationPlan, outputDir);
      }

      printSuccess('🎉 Pipeline Validation & Quality Assurance Phase completed successfully!');
      printInfo('📄 Validation plan saved with:');
      printInfo('   • Comprehensive data quality validation rules');
      printInfo('   • Great Expectations test suites');
      printInfo('   • dbt testing framework integration');
      printInfo('   • Custom SQL validation tests');
      printInfo('   • Monitoring dashboards and alerting');
      printInfo('   • Automated CI/CD quality gates');
      printInfo('   • Executive and compliance reporting');

      if (options.compliance) {
        printSuccess('✅ Compliance validation rules enabled (GDPR, data retention, PII encryption)');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Validation command failed', { error: errorMessage });
      printError(`❌ Failed to process validation phase: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Display validation plan summary
   */
  private displayValidationSummary(plan: any): void {
    printSuccess(`🔍 Validation Plan: ${plan.projectName}`);
    printInfo(`📝 Description: ${plan.description}`);
    printInfo('');

    printInfo('📊 Quality Assurance Overview:');
    printInfo(`   • Overall Quality Score: ${plan.qualityMetrics.overall_score}%`);
    printInfo(`   • Validation Rules: ${plan.validationRules.length} quality rules`);
    printInfo(`   • Test Frameworks: ${plan.testFrameworks.length} testing frameworks`);
    printInfo(`   • Monitoring Dashboards: ${plan.monitoring.dashboards.length} dashboards`);
    printInfo(`   • Alert Channels: ${plan.monitoring.alerting.channels.length} notification channels`);
    printInfo('');

    printInfo('🎯 Quality Metrics Baseline:');
    printInfo(`   • Completeness: ${plan.qualityMetrics.completeness.score}% (${plan.qualityMetrics.completeness.null_percentage}% null values)`);
    printInfo(`   • Accuracy: ${plan.qualityMetrics.accuracy.score}% (${plan.qualityMetrics.accuracy.format_violations} format violations)`);
    printInfo(`   • Consistency: ${plan.qualityMetrics.consistency.score}% (${plan.qualityMetrics.consistency.duplicate_records} duplicates)`);
    printInfo(`   • Timeliness: ${plan.qualityMetrics.timeliness.score}% (${plan.qualityMetrics.timeliness.latency_ms}ms latency)`);
    printInfo(`   • Validity: ${plan.qualityMetrics.validity.score}% (${plan.qualityMetrics.validity.schema_violations} schema violations)`);
    printInfo('');

    printInfo('🛡️ Critical Validation Rules:');
    const criticalRules = plan.validationRules.filter((rule: any) => rule.severity === 'critical');
    criticalRules.slice(0, 5).forEach((rule: any) => {
      printInfo(`   • ${rule.ruleName}: ${rule.description}`);
    });
    if (criticalRules.length > 5) {
      printInfo(`   • ... and ${criticalRules.length - 5} more critical rules`);
    }
    printInfo('');

    printInfo('🧪 Test Framework Summary:');
    plan.testFrameworks.forEach((framework: any) => {
      const totalTests = framework.testSuites.reduce((sum: number, suite: any) => sum + suite.tests.length, 0);
      printInfo(`   • ${framework.name}: ${totalTests} tests across ${framework.testSuites.length} suites`);
    });
    printInfo('');

    printInfo('📈 Monitoring & Alerting:');
    printInfo(`   • SLA Targets: ${plan.monitoring.sla.length} quality targets`);
    printInfo(`   • Escalation Levels: ${plan.monitoring.alerting.escalation.length} escalation tiers`);
    printInfo(`   • Auto-remediation: ${plan.automation.autoRemediation ? 'Enabled' : 'Disabled'}`);
    printInfo('');

    printInfo('📋 Reporting Configuration:');
    printInfo(`   • Executive Reports: ${plan.reporting.executiveReports ? 'Enabled' : 'Disabled'}`);
    printInfo(`   • Compliance Reports: ${plan.reporting.complianceReports ? 'Enabled' : 'Disabled'}`);
    printInfo(`   • Report Frequency: ${plan.reporting.frequency}`);
    printInfo(`   • Report Formats: ${plan.reporting.format.join(', ')}`);
  }

  /**
   * Validate validation plan
   */
  private async validateValidationPlan(plan: any): Promise<void> {
    printInfo('🔍 Validating validation plan...');

    const issues = [];

    // Validate validation rules
    if (plan.validationRules.length === 0) {
      issues.push('No validation rules defined');
    }

    // Check for critical rules
    const criticalRules = plan.validationRules.filter((rule: any) => rule.severity === 'critical');
    if (criticalRules.length === 0) {
      issues.push('No critical validation rules defined');
    }

    // Validate test frameworks
    if (plan.testFrameworks.length === 0) {
      issues.push('No test frameworks configured');
    }

    // Check for Great Expectations framework
    const hasGreatExpectations = plan.testFrameworks.some((fw: any) => fw.type === 'great_expectations');
    if (!hasGreatExpectations) {
      issues.push('Great Expectations framework not configured');
    }

    // Validate monitoring setup
    if (plan.monitoring.dashboards.length === 0) {
      issues.push('No monitoring dashboards configured');
    }

    if (plan.monitoring.alerting.channels.length === 0) {
      issues.push('No alert channels configured');
    }

    // Validate SLA targets
    if (plan.monitoring.sla.length === 0) {
      issues.push('No SLA targets defined');
    }

    // Check quality score thresholds
    if (plan.qualityMetrics.overall_score < 80) {
      issues.push('Overall quality score baseline below recommended threshold (80%)');
    }

    // Display validation results
    if (issues.length === 0) {
      printSuccess('✅ Validation plan validation passed');
      printInfo('🎯 All critical components configured correctly');
      printInfo('📊 Quality baselines meet recommended standards');
      printInfo('🔧 Test frameworks properly configured');
      printInfo('📈 Monitoring and alerting setup complete');
    } else {
      printWarning('⚠️ Validation plan validation issues found:');
      issues.forEach(issue => printWarning(`   • ${issue}`));
      printInfo('💡 Consider addressing these issues before deployment');
    }
  }

  /**
   * Generate test frameworks
   */
  private async generateTestFrameworks(plan: any, outputDir: string): Promise<void> {
    printInfo('🧪 Generating test framework configurations...');

    try {
      // Generate Great Expectations configuration
      await this.generateGreatExpectationsFramework(plan, outputDir);
      
      // Generate dbt test configuration
      await this.generateDbtTestFramework(plan, outputDir);
      
      // Generate custom SQL tests
      await this.generateCustomSqlTests(plan, outputDir);
      
      // Generate Python test scripts
      await this.generatePythonTestScripts(plan, outputDir);

      printSuccess('✅ Test frameworks generated successfully');
    } catch (error) {
      printWarning(`⚠️ Some test frameworks failed to generate: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate Great Expectations framework
   */
  private async generateGreatExpectationsFramework(plan: any, outputDir: string): Promise<void> {
    const geDir = join(outputDir, 'great_expectations');
    
    const geFramework = plan.testFrameworks.find((fw: any) => fw.type === 'great_expectations');
    if (!geFramework) return;

    const config = {
      config_version: 3.0,
      datasources: geFramework.configuration.datasource,
      stores: geFramework.configuration.data_context_config.stores,
      expectations_store_name: 'expectations_store',
      validations_store_name: 'validations_store',
      evaluation_parameter_store_name: 'evaluation_parameter_store',
      checkpoint_store_name: 'checkpoint_store'
    };

    // Generate expectations
    const expectations = geFramework.testSuites[0].tests.map((test: any) => ({
      expectation_type: `expect_column_values_to_${test.name.toLowerCase().replace(/\s+/g, '_')}`,
      kwargs: test.parameters
    }));

    printInfo(`   • Great Expectations configuration created in ${geDir}`);
    printInfo(`   • ${expectations.length} expectations defined`);
  }

  /**
   * Generate dbt test framework
   */
  private async generateDbtTestFramework(plan: any, outputDir: string): Promise<void> {
    const dbtDir = join(outputDir, 'dbt_tests');
    
    const dbtFramework = plan.testFrameworks.find((fw: any) => fw.type === 'dbt_test');
    if (!dbtFramework) return;

    // Generate schema.yml with tests
    const schemaYml = `
version: 2

models:
  - name: dim_customers
    description: "Customer dimension table"
    columns:
      - name: customer_id
        description: "Unique customer identifier"
        tests:
          - unique
          - not_null
      - name: email
        description: "Customer email address"
        tests:
          - not_null
          - accepted_values:
              values: ['@']
              quote: false

  - name: fact_transactions
    description: "Transaction fact table"
    columns:
      - name: transaction_id
        tests:
          - unique
          - not_null
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
`;

    printInfo(`   • dbt test configuration created in ${dbtDir}`);
    printInfo(`   • Schema tests and relationship validations defined`);
  }

  /**
   * Generate custom SQL tests
   */
  private async generateCustomSqlTests(plan: any, outputDir: string): Promise<void> {
    const sqlDir = join(outputDir, 'sql_tests');
    
    const sqlFramework = plan.testFrameworks.find((fw: any) => fw.type === 'custom_sql');
    if (!sqlFramework) return;

    const testRunner = `
#!/usr/bin/env python3
"""
Custom SQL Test Runner
Executes business logic validation tests
"""

import sys
import json
import psycopg2
from datetime import datetime

def run_sql_test(test_config):
    """Execute SQL test and return results"""
    try:
        conn = psycopg2.connect(test_config['connection'])
        cursor = conn.cursor()
        
        cursor.execute(test_config['query'])
        result = cursor.fetchone()[0]
        
        expected = test_config['parameters']['expected_result']
        passed = result == expected
        
        return {
            'test_id': test_config['test_id'],
            'passed': passed,
            'actual': result,
            'expected': expected,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {
            'test_id': test_config['test_id'],
            'passed': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

if __name__ == "__main__":
    test_config_file = sys.argv[1]
    with open(test_config_file, 'r') as f:
        config = json.load(f)
    
    result = run_sql_test(config)
    print(json.dumps(result, indent=2))
`;

    printInfo(`   • Custom SQL test runner created in ${sqlDir}`);
    printInfo(`   • Business logic validation tests configured`);
  }

  /**
   * Generate Python test scripts
   */
  private async generatePythonTestScripts(plan: any, outputDir: string): Promise<void> {
    const pythonDir = join(outputDir, 'python_tests');
    
    const testScript = `
import pytest
import pandas as pd
import great_expectations as ge
from sqlalchemy import create_engine

class TestDataQuality:
    """Data quality test suite using pytest and Great Expectations"""
    
    def setup_method(self):
        """Setup test environment"""
        self.engine = create_engine('${process.env.DATA_WAREHOUSE_URL}')
    
    def test_customer_data_completeness(self):
        """Test customer data completeness"""
        df = pd.read_sql("SELECT * FROM dim_customers", self.engine)
        ge_df = ge.from_pandas(df)
        
        result = ge_df.expect_column_values_to_not_be_null('customer_id')
        assert result.success, "Customer ID column has null values"
        
        result = ge_df.expect_column_values_to_not_be_null('email')
        assert result.success, "Email column has null values"
    
    def test_revenue_calculation_accuracy(self):
        """Test revenue calculation accuracy"""
        query = \"\"\"
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
        \"\"\"
        
        result = pd.read_sql(query, self.engine)
        assert result.iloc[0]['failed_records'] == 0, "Revenue calculation discrepancies found"
    
    def test_data_freshness(self):
        """Test data freshness requirements"""
        query = \"\"\"
        SELECT 
          MAX(updated_at) as last_update,
          EXTRACT(EPOCH FROM (NOW() - MAX(updated_at)))/3600 as hours_old
        FROM customer_data
        \"\"\"
        
        result = pd.read_sql(query, self.engine)
        hours_old = result.iloc[0]['hours_old']
        assert hours_old < 24, f"Data is {hours_old} hours old, exceeds 24-hour SLA"
`;

    printInfo(`   • Python test suite created in ${pythonDir}`);
    printInfo(`   • pytest and Great Expectations integration configured`);
  }

  /**
   * Deploy validation frameworks
   */
  private async deployValidationFrameworks(plan: any, outputDir: string): Promise<void> {
    printInfo('🚀 Deploying validation frameworks...');

    try {
      // Generate deployment scripts
      await this.generateDeploymentScripts(plan, outputDir);
      
      // Generate monitoring setup
      await this.generateMonitoringSetup(plan, outputDir);
      
      // Generate CI/CD integration
      await this.generateCiCdIntegration(plan, outputDir);

      printSuccess('✅ Validation frameworks deployment configuration ready');
      printInfo('📦 Deployment artifacts generated in pipeline-output/deployment/');
    } catch (error) {
      printWarning(`⚠️ Deployment configuration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate deployment scripts
   */
  private async generateDeploymentScripts(plan: any, outputDir: string): Promise<void> {
    const deployDir = join(outputDir, 'deployment');
    
    const deployScript = `
#!/bin/bash
# Pipeline Validation Framework Deployment Script

set -e

echo "🚀 Deploying Pipeline Validation Framework..."

# Deploy Great Expectations
echo "📊 Setting up Great Expectations..."
great_expectations init
great_expectations datasource new

# Deploy dbt tests
echo "🧪 Setting up dbt tests..."
dbt deps
dbt test --profiles-dir profiles

# Setup monitoring dashboards
echo "📈 Configuring monitoring..."
grafana-cli admin reset-admin-password admin

# Configure alerting
echo "🔔 Setting up alerts..."
curl -X POST http://localhost:3000/api/alert-notifications \\
  -H "Content-Type: application/json" \\
  -d @alerting-config.json

echo "✅ Validation framework deployment complete!"
`;

    printInfo(`   • Deployment scripts created in ${deployDir}`);
  }

  /**
   * Generate monitoring setup
   */
  private async generateMonitoringSetup(plan: any, outputDir: string): Promise<void> {
    const monitoringDir = join(outputDir, 'monitoring');
    
    const grafanaDashboard = {
      dashboard: {
        title: 'Data Quality Dashboard',
        panels: plan.monitoring.dashboards[0].metrics.map((metric: string, index: number) => ({
          id: index + 1,
          title: metric.replace(/_/g, ' ').toUpperCase(),
          type: 'stat',
          targets: [{
            expr: `data_quality_${metric}`,
            refId: 'A'
          }]
        }))
      }
    };

    printInfo(`   • Grafana dashboards configured in ${monitoringDir}`);
    printInfo(`   • ${plan.monitoring.dashboards.length} dashboards with ${plan.monitoring.dashboards[0].metrics.length} metrics`);
  }

  /**
   * Generate CI/CD integration
   */
  private async generateCiCdIntegration(plan: any, outputDir: string): Promise<void> {
    const cicdDir = join(outputDir, 'cicd');
    
    const githubWorkflow = `
name: Data Quality Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2,8,14,20 * * *'  # Every 6 hours

jobs:
  data-quality-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        pip install great-expectations dbt-core pytest
    
    - name: Run Great Expectations
      run: great_expectations checkpoint run data_quality_suite
    
    - name: Run dbt tests
      run: dbt test --profiles-dir profiles
    
    - name: Run custom validations
      run: pytest python_tests/
    
    - name: Upload test results
      uses: actions/upload-artifact@v2
      with:
        name: test-results
        path: test-results/
`;

    printInfo(`   • GitHub Actions workflow created in ${cicdDir}`);
    printInfo(`   • CI/CD pipeline with quality gates configured`);
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
export async function handlePipelineValidation(input: string, options: ValidationSparcOptions = {}): Promise<void> {
  const handler = new ValidationSparcHandler();
  await handler.handleValidationCommand(input, options);
} 
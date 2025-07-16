/**
 * SPARC command for Pipeline Loading & Storage (Phase 6)
 */

import { Logger } from '../../../core/logger.js';
import { printSuccess, printError, printInfo } from '../../core/output-formatter.js';
import { PipelineLoadingEngine } from '../../pipeline/loading/pipeline-loading-engine.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const logger = new Logger('LoadingSPARC');

export async function handlePipelineLoading(
  requirements: string,
  options: {
    validationPlan?: string;
    transformationPlan?: string;
    compliance?: boolean;
    generateCode?: boolean;
    outputPath?: string;
  } = {}
): Promise<void> {
  try {
    printInfo('🚀 Initiating Pipeline Loading & Storage (Phase 6)...');
    printInfo(`Requirements: ${requirements}`);

    const engine = new PipelineLoadingEngine();

    // Process options
    const processedOptions = {
      ...options,
      outputPath: options.outputPath || './pipeline-loading'
    };

    if (options.validationPlan && !existsSync(options.validationPlan)) {
      printError(`Validation plan file not found: ${options.validationPlan}`);
      return;
    }

    if (options.transformationPlan && !existsSync(options.transformationPlan)) {
      printError(`Transformation plan file not found: ${options.transformationPlan}`);
      return;
    }

    // Generate comprehensive loading plan
    printInfo('🔧 Analyzing destination requirements and optimizing loading strategy...');
    const plan = await engine.generateLoadingPlan(requirements, processedOptions);

    // Display plan summary
    printSuccess('✅ Pipeline Loading Plan Generated Successfully!');
    printInfo('');
    printInfo('📋 LOADING PLAN SUMMARY:');
    printInfo(`   Plan ID: ${plan.id}`);
    printInfo(`   Title: ${plan.metadata.title}`);
    printInfo(`   Destinations: ${plan.destinations.map(d => d.type).join(', ')}`);
    printInfo(`   Loading Strategy: ${plan.loadingStrategy.strategy}`);
    printInfo(`   Batch Size: ${plan.loadingStrategy.batchSize?.toLocaleString()}`);
    printInfo(`   Parallelism: ${plan.loadingStrategy.parallelism}`);
    printInfo(`   Compression: ${plan.loadingStrategy.compressionType}`);
    printInfo('');

    // Display destinations
    printInfo('🎯 DESTINATION CONFIGURATION:');
    plan.destinations.forEach((dest, index) => {
      printInfo(`   ${index + 1}. ${dest.type.toUpperCase()}`);
      if (dest.schema) printInfo(`      Schema: ${dest.schema}`);
      if (dest.table) printInfo(`      Table: ${dest.table}`);
      if (dest.partitioning) {
        printInfo(`      Partitioning: ${dest.partitioning.strategy} on [${dest.partitioning.columns.join(', ')}]`);
      }
      if (dest.clustering) {
        printInfo(`      Clustering: [${dest.clustering.columns.join(', ')}]`);
      }
    });
    printInfo('');

    // Display performance optimization
    printInfo('⚡ PERFORMANCE OPTIMIZATION:');
    printInfo(`   Memory: ${plan.performance.memoryAllocation}`);
    printInfo(`   Read Buffer: ${plan.performance.diskIO.readBuffer}`);
    printInfo(`   Write Buffer: ${plan.performance.diskIO.writeBuffer}`);
    printInfo(`   Connection Pool: ${plan.performance.networking.connectionPool}`);
    printInfo(`   Caching: ${plan.performance.caching.enabled ? plan.performance.caching.size : 'disabled'}`);
    printInfo(`   Compression: ${plan.performance.compression.enabled ? plan.performance.compression.algorithm : 'disabled'}`);
    printInfo('');

    // Display governance
    printInfo('🔒 DATA GOVERNANCE:');
    printInfo(`   Encryption at Rest: ${plan.governance.encryption.atRest ? '✅' : '❌'}`);
    printInfo(`   Encryption in Transit: ${plan.governance.encryption.inTransit ? '✅' : '❌'}`);
    printInfo(`   RBAC: ${plan.governance.access.rbac ? '✅' : '❌'}`);
    printInfo(`   Column-Level Security: ${plan.governance.access.columnLevel ? '✅' : '❌'}`);
    printInfo(`   GDPR Compliance: ${plan.governance.compliance.gdpr ? '✅' : '❌'}`);
    printInfo(`   HIPAA Compliance: ${plan.governance.compliance.hipaa ? '✅' : '❌'}`);
    printInfo(`   Audit Logging: ${plan.governance.auditing.enabled ? plan.governance.auditing.logLevel : 'disabled'}`);
    printInfo('');

    // Display orchestration
    printInfo('🎼 ORCHESTRATION:');
    printInfo(`   Framework: ${plan.orchestration.framework}`);
    printInfo(`   Schedule: ${plan.orchestration.schedule}`);
    printInfo(`   Dependencies: [${plan.orchestration.dependencies.join(', ')}]`);
    printInfo(`   Success Notifications: ${plan.orchestration.notifications.success.length} recipient(s)`);
    printInfo(`   Failure Notifications: ${plan.orchestration.notifications.failure.length} recipient(s)`);
    printInfo('');

    // Display monitoring
    printInfo('📊 MONITORING & ALERTS:');
    printInfo(`   Metrics: ${plan.monitoring.metrics.length} tracked`);
    printInfo(`   Alerts: ${plan.monitoring.alerts.length} configured`);
    printInfo(`   Dashboards: ${plan.monitoring.dashboards.length} available`);
    plan.monitoring.alerts.forEach((alert, index) => {
      printInfo(`   Alert ${index + 1}: ${alert.condition} → ${alert.action}`);
    });
    printInfo('');

    // Display implementation details
    printInfo('🛠️ IMPLEMENTATION:');
    printInfo(`   Plan saved to: ${processedOptions.outputPath}/pipeline-loading-plan-${new Date().toISOString().split('T')[0]}.json`);
    
    if (processedOptions.generateCode) {
      printInfo(`   Python code: ${processedOptions.outputPath}/code/pipeline_loader.py`);
      printInfo(`   Docker config: ${processedOptions.outputPath}/code/Dockerfile`);
      printInfo(`   Airflow DAG: ${processedOptions.outputPath}/code/loading_dag.py`);
      printInfo(`   Requirements: ${processedOptions.outputPath}/code/requirements.txt`);
    }
    printInfo('');

    // Show next steps
    printInfo('🎯 NEXT STEPS:');
    printInfo('   1. Review the generated loading plan');
    printInfo('   2. Configure destination connections');
    printInfo('   3. Test loading with sample data');
    printInfo('   4. Deploy to staging environment');
    printInfo('   5. Proceed to Phase 7: Monitoring & Maintenance');
    printInfo('');
    printInfo('💡 TIP: Use --generate-code flag to create implementation files');
    printInfo('💡 TIP: Use --compliance flag for enhanced security features');

    printSuccess('🎉 Phase 6: Loading & Storage completed successfully!');

  } catch (error) {
    logger.error('Pipeline loading command failed', { error, requirements });
    printError(`Failed to generate loading plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
} 
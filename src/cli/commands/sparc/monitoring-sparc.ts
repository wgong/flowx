/**
 * SPARC command for Pipeline Monitoring & Maintenance (Phase 7)
 */

import { Logger } from '../../../core/logger.js';
import { printSuccess, printError, printInfo } from '../../core/output-formatter.js';
import { PipelineMonitoringEngine } from '../../pipeline/monitoring/pipeline-monitoring-engine.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const logger = new Logger('MonitoringSPARC');

export async function handlePipelineMonitoring(
  requirements: string,
  options: {
    loadingPlan?: string;
    validationPlan?: string;
    compliance?: boolean;
    generateCode?: boolean;
    outputPath?: string;
  } = {}
): Promise<void> {
  try {
    printInfo('🚀 Initiating Pipeline Monitoring & Maintenance (Phase 7)...');
    printInfo(`Requirements: ${requirements}`);

    const engine = new PipelineMonitoringEngine();

    // Process options
    const processedOptions = {
      ...options,
      outputPath: options.outputPath || './pipeline-monitoring'
    };

    if (options.loadingPlan && !existsSync(options.loadingPlan)) {
      printError(`Loading plan file not found: ${options.loadingPlan}`);
      return;
    }

    if (options.validationPlan && !existsSync(options.validationPlan)) {
      printError(`Validation plan file not found: ${options.validationPlan}`);
      return;
    }

    // Generate comprehensive monitoring plan
    printInfo('🔧 Designing observability stack and configuring monitoring...');
    const plan = await engine.generateMonitoringPlan(requirements, processedOptions);

    // Display plan summary
    printSuccess('✅ Pipeline Monitoring Plan Generated Successfully!');
    printInfo('');
    printInfo('📋 MONITORING PLAN SUMMARY:');
    printInfo(`   Plan ID: ${plan.id}`);
    printInfo(`   Title: ${plan.metadata.title}`);
    printInfo(`   Metrics Tracked: ${plan.metrics.length}`);
    printInfo(`   Alert Rules: ${plan.alerts.length}`);
    printInfo(`   Dashboards: ${plan.dashboards.length}`);
    printInfo(`   Maintenance Tasks: ${plan.maintenance.length}`);
    printInfo('');

    // Display observability stack
    printInfo('🔍 OBSERVABILITY STACK:');
    printInfo(`   Metrics: ${plan.observabilityStack.metrics.collector} (${plan.observabilityStack.metrics.retention} retention)`);
    printInfo(`   Logging: ${plan.observabilityStack.logging.collector} (${plan.observabilityStack.logging.retention} retention)`);
    printInfo(`   Tracing: ${plan.observabilityStack.tracing.collector} (${plan.observabilityStack.tracing.retention} retention)`);
    printInfo(`   Visualization: ${plan.observabilityStack.visualization.platform}`);
    printInfo('');

    // Display key metrics
    printInfo('📊 KEY METRICS:');
    const keyMetrics = plan.metrics.slice(0, 8); // Show first 8 metrics
    keyMetrics.forEach((metric, index) => {
      printInfo(`   ${index + 1}. ${metric.name} (${metric.type})`);
      printInfo(`      ${metric.description}`);
      if (metric.labels && metric.labels.length > 0) {
        printInfo(`      Labels: [${metric.labels.join(', ')}]`);
      }
    });
    if (plan.metrics.length > 8) {
      printInfo(`   ... and ${plan.metrics.length - 8} more metrics`);
    }
    printInfo('');

    // Display critical alerts
    printInfo('🚨 CRITICAL ALERTS:');
    const criticalAlerts = plan.alerts.filter(a => a.severity === 'critical');
    criticalAlerts.forEach((alert, index) => {
      printInfo(`   ${index + 1}. ${alert.name}`);
      printInfo(`      Condition: ${alert.condition}`);
      printInfo(`      Severity: ${alert.severity.toUpperCase()}`);
      printInfo(`      Notifications: ${alert.notifications.channels.length} channel(s)`);
      if (alert.notifications.escalation) {
        printInfo(`      Escalation: ${alert.notifications.escalation.length} level(s)`);
      }
    });
    printInfo('');

    // Display SLA configuration
    printInfo('📈 SLA CONFIGURATION:');
    printInfo(`   Availability: ${plan.sla.availability}%`);
    printInfo(`   Max Latency: ${plan.sla.latency} seconds`);
    printInfo(`   Max Error Rate: ${(plan.sla.errorRate * 100).toFixed(2)}%`);
    printInfo(`   Recovery Time: ${plan.sla.recovery} minutes (RTO)`);
    printInfo('');

    // Display dashboards
    printInfo('📊 DASHBOARDS:');
    plan.dashboards.forEach((dashboard, index) => {
      printInfo(`   ${index + 1}. ${dashboard.name}`);
      printInfo(`      Description: ${dashboard.description}`);
      printInfo(`      Panels: ${dashboard.panels.length}`);
      if (dashboard.variables && dashboard.variables.length > 0) {
        printInfo(`      Variables: ${dashboard.variables.length}`);
      }
    });
    printInfo('');

    // Display maintenance tasks
    printInfo('🔧 AUTOMATED MAINTENANCE:');
    plan.maintenance.forEach((task, index) => {
      printInfo(`   ${index + 1}. ${task.name} (${task.type})`);
      printInfo(`      Schedule: ${task.schedule}`);
      printInfo(`      Description: ${task.description}`);
      if (task.conditions && task.conditions.length > 0) {
        printInfo(`      Conditions: ${task.conditions.length} trigger(s)`);
      }
      printInfo(`      Actions: ${task.actions.length}`);
    });
    printInfo('');

    // Display compliance features
    printInfo('🔒 COMPLIANCE & GOVERNANCE:');
    printInfo(`   Audit Logging: ${plan.compliance.auditLogging ? '✅' : '❌'}`);
    printInfo(`   Data Retention: ${plan.compliance.dataRetention} days`);
    printInfo(`   Access Controls: ${plan.compliance.accessControls ? '✅' : '❌'}`);
    printInfo(`   Encryption at Rest: ${plan.compliance.encryptionAtRest ? '✅' : '❌'}`);
    printInfo('');

    // Display implementation details
    printInfo('🛠️ IMPLEMENTATION:');
    printInfo(`   Plan saved to: ${processedOptions.outputPath}/pipeline-monitoring-plan-${new Date().toISOString().split('T')[0]}.json`);
    
    if (processedOptions.generateCode) {
      printInfo(`   Prometheus config: ${processedOptions.outputPath}/code/prometheus.yml`);
      printInfo(`   Grafana dashboard: ${processedOptions.outputPath}/code/dashboard.json`);
      printInfo(`   Alert rules: ${processedOptions.outputPath}/code/alert-rules.yml`);
      printInfo(`   Monitoring script: ${processedOptions.outputPath}/code/pipeline_monitor.py`);
      printInfo(`   Docker Compose: ${processedOptions.outputPath}/code/docker-compose.yml`);
    }
    printInfo('');

    // Show monitoring setup steps
    printInfo('🎯 SETUP STEPS:');
    printInfo('   1. Deploy monitoring infrastructure (Prometheus, Grafana)');
    printInfo('   2. Configure metric collection endpoints');
    printInfo('   3. Import dashboards and alert rules');
    printInfo('   4. Set up notification channels (Slack, PagerDuty, email)');
    printInfo('   5. Test alert workflows and escalation');
    printInfo('   6. Configure automated maintenance schedules');
    printInfo('   7. Validate SLA monitoring and reporting');
    printInfo('');

    // Show operational guidance
    printInfo('🎯 OPERATIONAL GUIDANCE:');
    printInfo('   • Monitor key metrics: execution status, throughput, error rates');
    printInfo('   • Set up alert fatigue prevention with intelligent routing');
    printInfo('   • Regularly review and tune alert thresholds');
    printInfo('   • Use automated maintenance to prevent issues');
    printInfo('   • Maintain monitoring stack health and capacity');
    printInfo('');

    printInfo('💡 TIP: Use --generate-code flag to create monitoring stack configuration');
    printInfo('💡 TIP: Use --compliance flag for enhanced audit and governance features');
    printInfo('💡 TIP: Integrate with existing monitoring infrastructure for consistency');

    printSuccess('🎉 Phase 7: Monitoring & Maintenance completed successfully!');
    printSuccess('🎊 ALL 7 PHASES OF ENTERPRISE DATA PIPELINE CREATION COMPLETE!');

  } catch (error) {
    logger.error('Pipeline monitoring command failed', { error, requirements });
    printError(`Failed to generate monitoring plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
} 
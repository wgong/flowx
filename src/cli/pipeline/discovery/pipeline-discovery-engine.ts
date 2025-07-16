/**
 * Pipeline Discovery Engine - Phase 1 of Enterprise Data Pipeline Creation
 * 
 * This module handles intelligent discovery and planning for enterprise data pipelines
 * using natural language processing and AWS resource analysis.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '../../../core/logger.js';

export interface PipelineDiscoveryConfig {
  namespace: string;
  outputDir: string;
  format: 'text' | 'json' | 'markdown';
  awsProfile?: string;
  interactive: boolean;
  verbose: boolean;
  dryRun: boolean;
}

export interface DataSource {
  name: string;
  type: 'database' | 'api' | 'file' | 'stream' | 'queue';
  technology: string;
  connectionInfo?: Record<string, any>;
  schema?: Record<string, any>;
  volume?: string;
  frequency?: string;
}

export interface DataTarget {
  name: string;
  type: 'warehouse' | 'database' | 'lake' | 'analytics' | 'api';
  technology: string;
  connectionInfo?: Record<string, any>;
  schema?: Record<string, any>;
  requirements?: string[];
}

export interface PipelineRequirements {
  businessObjective: string;
  dataVolume: string;
  frequency: string;
  latency: string;
  compliance: string[];
  performance: Record<string, any>;
  quality: Record<string, any>;
}

export interface PipelineDiscoveryResult {
  planFile: string;
  sourceAnalysis: DataSource[];
  targetAnalysis: DataTarget[];
  requirements: PipelineRequirements;
  recommendations: string[];
  nextSteps: string[];
}

export class PipelineDiscoveryEngine {
  private logger: Logger;
  private config: PipelineDiscoveryConfig;

  constructor(config: PipelineDiscoveryConfig) {
    this.config = config;
    this.logger = new Logger({ level: 'info' }, { component: config.namespace });
  }

  /**
   * Main pipeline discovery method
   */
  async discoverPipeline(taskDescription: string): Promise<PipelineDiscoveryResult> {
    this.logger.info('Starting pipeline discovery', { task: taskDescription });

    if (this.config.dryRun) {
      this.logger.info('DRY RUN: Pipeline discovery simulation');
    }

    // Create output directory
    await this.ensureOutputDirectory();

    // Parse natural language task description
    const parsedRequirements = await this.parseTaskDescription(taskDescription);

    // Discover data sources
    const sourceAnalysis = await this.discoverDataSources(parsedRequirements);

    // Discover data targets
    const targetAnalysis = await this.discoverDataTargets(parsedRequirements);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(sourceAnalysis, targetAnalysis, parsedRequirements);

    // Create next steps
    const nextSteps = this.generateNextSteps(sourceAnalysis, targetAnalysis);

    // Generate pipeline plan
    const planFile = await this.generatePipelinePlan({
      sourceAnalysis,
      targetAnalysis,
      requirements: parsedRequirements,
      recommendations,
      nextSteps
    });

    const result: PipelineDiscoveryResult = {
      planFile,
      sourceAnalysis,
      targetAnalysis,
      requirements: parsedRequirements,
      recommendations,
      nextSteps
    };

    this.logger.info('Pipeline discovery completed', { 
      sources: sourceAnalysis.length,
      targets: targetAnalysis.length,
      planFile 
    });

    return result;
  }

  /**
   * Parse natural language task description into structured requirements
   */
  private async parseTaskDescription(description: string): Promise<PipelineRequirements> {
    this.logger.debug('Parsing task description', { description });

    // Natural language processing for pipeline requirements
    const requirements: PipelineRequirements = {
      businessObjective: this.extractBusinessObjective(description),
      dataVolume: this.extractDataVolume(description),
      frequency: this.extractFrequency(description),
      latency: this.extractLatency(description),
      compliance: this.extractCompliance(description),
      performance: this.extractPerformanceRequirements(description),
      quality: this.extractQualityRequirements(description)
    };

    if (this.config.verbose) {
      console.log('\n📋 Parsed Requirements:');
      console.log(`  Business Objective: ${requirements.businessObjective}`);
      console.log(`  Data Volume: ${requirements.dataVolume}`);
      console.log(`  Frequency: ${requirements.frequency}`);
      console.log(`  Latency: ${requirements.latency}`);
      console.log(`  Compliance: ${requirements.compliance.join(', ')}`);
    }

    return requirements;
  }

  /**
   * Discover and analyze data sources
   */
  private async discoverDataSources(requirements: PipelineRequirements): Promise<DataSource[]> {
    this.logger.debug('Discovering data sources');

    const sources: DataSource[] = [];

    // Common source patterns based on requirements
    if (requirements.businessObjective.toLowerCase().includes('salesforce')) {
      sources.push({
        name: 'Salesforce CRM',
        type: 'api',
        technology: 'Salesforce REST API',
        connectionInfo: {
          endpoint: 'https://your-instance.salesforce.com',
          authType: 'OAuth2'
        },
        volume: 'Medium',
        frequency: 'Real-time'
      });
    }

    if (requirements.businessObjective.toLowerCase().includes('database') || 
        requirements.businessObjective.toLowerCase().includes('mysql') ||
        requirements.businessObjective.toLowerCase().includes('postgres')) {
      sources.push({
        name: 'Production Database',
        type: 'database',
        technology: 'PostgreSQL/MySQL',
        connectionInfo: {
          host: 'prod-db.company.com',
          port: 5432,
          database: 'production'
        },
        volume: 'Large',
        frequency: 'Batch'
      });
    }

    if (requirements.businessObjective.toLowerCase().includes('file') || 
        requirements.businessObjective.toLowerCase().includes('csv') ||
        requirements.businessObjective.toLowerCase().includes('s3')) {
      sources.push({
        name: 'S3 Data Files',
        type: 'file',
        technology: 'Amazon S3',
        connectionInfo: {
          bucket: 'data-lake-raw',
          prefix: 'source-data/'
        },
        volume: 'Variable',
        frequency: 'Hourly'
      });
    }

    if (this.config.verbose) {
      console.log(`\n🔍 Discovered ${sources.length} Data Sources:`);
      sources.forEach((source, i) => {
        console.log(`  ${i + 1}. ${source.name} (${source.technology})`);
      });
    }

    return sources;
  }

  /**
   * Discover and analyze data targets
   */
  private async discoverDataTargets(requirements: PipelineRequirements): Promise<DataTarget[]> {
    this.logger.debug('Discovering data targets');

    const targets: DataTarget[] = [];

    // Common target patterns
    if (requirements.businessObjective.toLowerCase().includes('analytics') ||
        requirements.businessObjective.toLowerCase().includes('warehouse') ||
        requirements.businessObjective.toLowerCase().includes('snowflake') ||
        requirements.businessObjective.toLowerCase().includes('redshift')) {
      
      if (requirements.businessObjective.toLowerCase().includes('snowflake')) {
        targets.push({
          name: 'Snowflake Data Warehouse',
          type: 'warehouse',
          technology: 'Snowflake',
          connectionInfo: {
            account: 'your-account.snowflakecomputing.com',
            warehouse: 'COMPUTE_WH',
            database: 'ANALYTICS'
          },
          requirements: ['High performance', 'Scalability', 'Cost optimization']
        });
      } else {
        targets.push({
          name: 'Amazon Redshift',
          type: 'warehouse',
          technology: 'Amazon Redshift',
          connectionInfo: {
            cluster: 'analytics-cluster',
            database: 'analytics'
          },
          requirements: ['High performance', 'Cost optimization']
        });
      }
    }

    if (requirements.businessObjective.toLowerCase().includes('lake') ||
        requirements.businessObjective.toLowerCase().includes('s3')) {
      targets.push({
        name: 'Data Lake',
        type: 'lake',
        technology: 'Amazon S3 + Glue',
        connectionInfo: {
          bucket: 'data-lake-processed',
          catalog: 'glue-catalog'
        },
        requirements: ['Schema evolution', 'Format flexibility']
      });
    }

    if (this.config.verbose) {
      console.log(`\n🎯 Discovered ${targets.length} Data Targets:`);
      targets.forEach((target, i) => {
        console.log(`  ${i + 1}. ${target.name} (${target.technology})`);
      });
    }

    return targets;
  }

  /**
   * Generate pipeline recommendations
   */
  private async generateRecommendations(
    sources: DataSource[],
    targets: DataTarget[],
    requirements: PipelineRequirements
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Volume-based recommendations
    if (requirements.dataVolume.includes('Large') || requirements.dataVolume.includes('High')) {
      recommendations.push('Use AWS Glue for ETL processing to handle large data volumes efficiently');
      recommendations.push('Implement data partitioning strategies for optimal performance');
    }

    // Frequency-based recommendations
    if (requirements.frequency.includes('Real-time') || requirements.frequency.includes('Streaming')) {
      recommendations.push('Consider Amazon Kinesis for real-time data streaming');
      recommendations.push('Use Lambda functions for event-driven processing');
    }

    // Technology-specific recommendations
    const hasAPI = sources.some(s => s.type === 'api');
    const hasDatabase = sources.some(s => s.type === 'database');
    
    if (hasAPI) {
      recommendations.push('Implement API rate limiting and retry logic for reliable data ingestion');
    }

    if (hasDatabase) {
      recommendations.push('Use CDC (Change Data Capture) for efficient database replication');
    }

    // Security and compliance
    if (requirements.compliance.length > 0) {
      recommendations.push('Implement data encryption at rest and in transit');
      recommendations.push('Set up data governance and lineage tracking');
    }

    if (this.config.verbose) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    return recommendations;
  }

  /**
   * Generate next steps for pipeline implementation
   */
  private generateNextSteps(sources: DataSource[], targets: DataTarget[]): string[] {
    return [
      'Phase 2: Design pipeline architecture and data flow diagrams',
      'Phase 3: Set up data extraction from identified sources',
      'Phase 4: Design and implement data transformation logic',
      'Phase 5: Implement data quality validation and testing',
      'Phase 6: Configure data loading to target systems',
      'Phase 7: Set up monitoring, alerting, and maintenance procedures'
    ];
  }

  /**
   * Generate comprehensive pipeline plan document
   */
  private async generatePipelinePlan(data: {
    sourceAnalysis: DataSource[];
    targetAnalysis: DataTarget[];
    requirements: PipelineRequirements;
    recommendations: string[];
    nextSteps: string[];
  }): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pipeline-discovery-plan-${timestamp}.md`;
    const filepath = join(this.config.outputDir, filename);

    const content = this.formatPipelinePlan(data);

    if (!this.config.dryRun) {
      await fs.writeFile(filepath, content, 'utf-8');
    }

    if (this.config.verbose) {
      console.log(`\n📄 Generated pipeline plan: ${filename}`);
    }

    return filename;
  }

  /**
   * Format pipeline plan as markdown
   */
  private formatPipelinePlan(data: {
    sourceAnalysis: DataSource[];
    targetAnalysis: DataTarget[];
    requirements: PipelineRequirements;
    recommendations: string[];
    nextSteps: string[];
  }): string {
    return `# Enterprise Data Pipeline Discovery Plan

Generated: ${new Date().toISOString()}
Namespace: ${this.config.namespace}

## Business Requirements

**Objective:** ${data.requirements.businessObjective}
**Data Volume:** ${data.requirements.dataVolume}
**Frequency:** ${data.requirements.frequency}
**Latency:** ${data.requirements.latency}
**Compliance:** ${data.requirements.compliance.join(', ')}

## Data Sources (${data.sourceAnalysis.length})

${data.sourceAnalysis.map((source, i) => `
### ${i + 1}. ${source.name}
- **Type:** ${source.type}
- **Technology:** ${source.technology}
- **Volume:** ${source.volume}
- **Frequency:** ${source.frequency}
`).join('')}

## Data Targets (${data.targetAnalysis.length})

${data.targetAnalysis.map((target, i) => `
### ${i + 1}. ${target.name}
- **Type:** ${target.type}
- **Technology:** ${target.technology}
- **Requirements:** ${target.requirements?.join(', ') || 'N/A'}
`).join('')}

## Recommendations

${data.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## Next Steps

${data.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Implementation Notes

This discovery plan provides the foundation for implementing a robust enterprise data pipeline.
Each phase should be executed in sequence, with proper testing and validation at each step.

---
*Generated by Claude Flow Pipeline Discovery Engine*
`;
  }

  /**
   * Utility methods for parsing natural language
   */
  private extractBusinessObjective(description: string): string {
    // Extract the main business goal from the description
    const cleaned = description.replace(/^(build|create|implement|setup|configure)\s+/i, '');
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  private extractDataVolume(description: string): string {
    if (description.toLowerCase().includes('large') || 
        description.toLowerCase().includes('big') ||
        description.toLowerCase().includes('massive')) {
      return 'Large (>1TB)';
    }
    if (description.toLowerCase().includes('small') || 
        description.toLowerCase().includes('tiny')) {
      return 'Small (<100GB)';
    }
    return 'Medium (100GB-1TB)';
  }

  private extractFrequency(description: string): string {
    if (description.toLowerCase().includes('real-time') || 
        description.toLowerCase().includes('streaming') ||
        description.toLowerCase().includes('live')) {
      return 'Real-time/Streaming';
    }
    if (description.toLowerCase().includes('daily') || 
        description.toLowerCase().includes('nightly')) {
      return 'Daily';
    }
    if (description.toLowerCase().includes('hourly')) {
      return 'Hourly';
    }
    return 'Batch (Configurable)';
  }

  private extractLatency(description: string): string {
    if (description.toLowerCase().includes('real-time') || 
        description.toLowerCase().includes('immediate')) {
      return 'Near real-time (<1 minute)';
    }
    if (description.toLowerCase().includes('fast') || 
        description.toLowerCase().includes('quick')) {
      return 'Low latency (<15 minutes)';
    }
    return 'Standard (1-4 hours)';
  }

  private extractCompliance(description: string): string[] {
    const compliance: string[] = [];
    if (description.toLowerCase().includes('gdpr')) {
      compliance.push('GDPR');
    }
    if (description.toLowerCase().includes('hipaa')) {
      compliance.push('HIPAA');
    }
    if (description.toLowerCase().includes('sox')) {
      compliance.push('SOX');
    }
    if (description.toLowerCase().includes('pci')) {
      compliance.push('PCI DSS');
    }
    return compliance;
  }

  private extractPerformanceRequirements(description: string): Record<string, any> {
    return {
      throughput: 'High',
      scalability: 'Auto-scaling',
      availability: '99.9%'
    };
  }

  private extractQualityRequirements(description: string): Record<string, any> {
    return {
      validation: 'Schema validation + business rules',
      monitoring: 'Real-time quality metrics',
      alerting: 'Automated quality alerts'
    };
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create output directory', { error, dir: this.config.outputDir });
      throw error;
    }
  }
} 
/**
 * Pipeline Design Engine - Phase 2 of Enterprise Data Pipeline Creation
 * 
 * This module handles architecture design, schema validation, and diagram generation
 * for enterprise data pipelines based on Phase 1 discovery results.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '../../../core/logger.js';

export interface PipelineDesignConfig {
  namespace: string;
  outputDir: string;
  format: 'text' | 'json' | 'markdown';
  discoveryPlanPath?: string;
  generateDiagrams: boolean;
  validateSchema: boolean;
  verbose: boolean;
  dryRun: boolean;
}

export interface DataSchema {
  name: string;
  type: 'source' | 'target' | 'intermediate';
  format: 'json' | 'csv' | 'parquet' | 'avro' | 'xml';
  fields: SchemaField[];
  constraints?: string[];
  validation?: ValidationRule[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  description?: string;
  constraints?: string[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
}

export interface PipelineComponent {
  id: string;
  name: string;
  type: 'extractor' | 'transformer' | 'loader' | 'validator' | 'monitor';
  technology: string;
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
}

export interface PipelineArchitecture {
  name: string;
  description: string;
  components: PipelineComponent[];
  dataFlow: DataFlowStep[];
  schemas: DataSchema[];
  infrastructure: InfrastructureSpec;
  monitoring: MonitoringSpec;
  security: SecuritySpec;
}

export interface DataFlowStep {
  from: string;
  to: string;
  schema: string;
  transformation?: string;
  validation?: string;
}

export interface InfrastructureSpec {
  platform: 'aws' | 'azure' | 'gcp' | 'hybrid';
  compute: ComputeSpec;
  storage: StorageSpec;
  networking: NetworkingSpec;
}

export interface ComputeSpec {
  orchestrator: string; // 'glue' | 'airflow' | 'prefect'
  processors: string[]; // 'lambda' | 'fargate' | 'emr'
  scaling: 'manual' | 'auto';
}

export interface StorageSpec {
  rawData: string; // 's3' | 'adls' | 'gcs'
  processedData: string;
  warehouse: string; // 'redshift' | 'snowflake' | 'bigquery'
}

export interface NetworkingSpec {
  vpc: boolean;
  encryption: 'in-transit' | 'at-rest' | 'both';
  access: 'private' | 'public' | 'hybrid';
}

export interface MonitoringSpec {
  logging: string; // 'cloudwatch' | 'datadog' | 'splunk'
  metrics: string[];
  alerts: AlertRule[];
}

export interface AlertRule {
  metric: string;
  threshold: number;
  condition: string;
  action: string;
}

export interface SecuritySpec {
  authentication: string; // 'iam' | 'oauth' | 'ldap'
  authorization: string; // 'rbac' | 'abac'
  encryption: EncryptionSpec;
  compliance: string[];
}

export interface EncryptionSpec {
  inTransit: boolean;
  atRest: boolean;
  keyManagement: string; // 'kms' | 'vault'
}

export interface PipelineDesignResult {
  architectureFile: string;
  diagrams: string[];
  schemaValidations: ValidationResult[];
  codeGeneration: GeneratedCode[];
  infrastructure: InfrastructureCode[];
}

export interface ValidationResult {
  schema: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GeneratedCode {
  type: 'terraform' | 'cloudformation' | 'python' | 'sql';
  filename: string;
  content: string;
}

export interface InfrastructureCode {
  type: 'terraform' | 'cloudformation' | 'kubernetes';
  filename: string;
  content: string;
}

export class PipelineDesignEngine {
  private logger: Logger;
  private config: PipelineDesignConfig;

  constructor(config: PipelineDesignConfig) {
    this.config = config;
    this.logger = new Logger(config.namespace);
  }

  /**
   * Main pipeline design method
   */
  async designPipeline(taskDescription: string): Promise<PipelineDesignResult> {
    this.logger.info('Starting pipeline design', { task: taskDescription });

    if (this.config.dryRun) {
      this.logger.info('DRY RUN: Pipeline design simulation');
    }

    // Create output directory
    await this.ensureOutputDirectory();

    // Load discovery plan if provided
    let discoveryData: any = null;
    if (this.config.discoveryPlanPath) {
      discoveryData = await this.loadDiscoveryPlan(this.config.discoveryPlanPath);
    }

    // Design pipeline architecture
    const architecture = await this.designArchitecture(taskDescription, discoveryData);

    // Generate diagrams
    const diagrams = this.config.generateDiagrams 
      ? await this.generateDiagrams(architecture)
      : [];

    // Validate schemas
    const schemaValidations = this.config.validateSchema
      ? await this.validateSchemas(architecture.schemas)
      : [];

    // Generate code and infrastructure
    const codeGeneration = await this.generateCode(architecture);
    const infrastructure = await this.generateInfrastructure(architecture);

    // Generate architecture document
    const architectureFile = await this.generateArchitectureDocument({
      architecture,
      diagrams,
      schemaValidations,
      codeGeneration,
      infrastructure
    });

    const result: PipelineDesignResult = {
      architectureFile,
      diagrams,
      schemaValidations,
      codeGeneration,
      infrastructure
    };

    this.logger.info('Pipeline design completed', { 
      architectureFile,
      diagramsCount: diagrams.length,
      validationsCount: schemaValidations.length 
    });

    return result;
  }

  /**
   * Load discovery plan from Phase 1
   */
  private async loadDiscoveryPlan(planPath: string): Promise<any> {
    try {
      const content = await fs.readFile(planPath, 'utf-8');
      
      // Parse markdown plan (simplified parser)
      const parsed = this.parseDiscoveryPlan(content);
      
      if (this.config.verbose) {
        console.log(`\n📋 Loaded discovery plan: ${planPath}`);
        console.log(`  Sources: ${parsed.sources?.length || 0}`);
        console.log(`  Targets: ${parsed.targets?.length || 0}`);
      }
      
      return parsed;
    } catch (error) {
      this.logger.warn('Failed to load discovery plan', { error, path: planPath });
      return null;
    }
  }

  /**
   * Parse discovery plan markdown content
   */
  private parseDiscoveryPlan(content: string): any {
    // Simplified parser for discovery plan
    const parsed = {
      sources: [],
      targets: [],
      requirements: {},
      recommendations: []
    };

    // Extract sections (this is a simplified implementation)
    const lines = content.split('\n');
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('## Data Sources')) {
        currentSection = 'sources';
      } else if (line.startsWith('## Data Targets')) {
        currentSection = 'targets';
      } else if (line.startsWith('## Business Requirements')) {
        currentSection = 'requirements';
      } else if (line.startsWith('## Recommendations')) {
        currentSection = 'recommendations';
      }
      // Extract data based on section...
    }

    return parsed;
  }

  /**
   * Design pipeline architecture based on requirements
   */
  private async designArchitecture(taskDescription: string, discoveryData: any): Promise<PipelineArchitecture> {
    this.logger.debug('Designing pipeline architecture');

    // Create base architecture structure
    const architecture: PipelineArchitecture = {
      name: this.extractPipelineName(taskDescription),
      description: taskDescription,
      components: [],
      dataFlow: [],
      schemas: [],
      infrastructure: this.designInfrastructure(taskDescription, discoveryData),
      monitoring: this.designMonitoring(taskDescription, discoveryData),
      security: this.designSecurity(taskDescription, discoveryData)
    };

    // Design components based on requirements
    architecture.components = await this.designComponents(taskDescription, discoveryData);
    
    // Design data flow
    architecture.dataFlow = await this.designDataFlow(architecture.components);
    
    // Design schemas
    architecture.schemas = await this.designSchemas(architecture.components, discoveryData);

    if (this.config.verbose) {
      console.log('\n🏗️ Pipeline Architecture:');
      console.log(`  Name: ${architecture.name}`);
      console.log(`  Components: ${architecture.components.length}`);
      console.log(`  Data Flow Steps: ${architecture.dataFlow.length}`);
      console.log(`  Schemas: ${architecture.schemas.length}`);
    }

    return architecture;
  }

  /**
   * Design pipeline components
   */
  private async designComponents(taskDescription: string, discoveryData: any): Promise<PipelineComponent[]> {
    const components: PipelineComponent[] = [];

    // Extract source components
    if (taskDescription.toLowerCase().includes('salesforce') || 
        discoveryData?.sources?.some((s: any) => s.type === 'api')) {
      components.push({
        id: 'salesforce-extractor',
        name: 'Salesforce Data Extractor',
        type: 'extractor',
        technology: 'AWS Lambda + Salesforce REST API',
        config: {
          apiEndpoint: '${SALESFORCE_INSTANCE_URL}',
          authType: 'OAuth2',
          objects: ['Account', 'Contact', 'Opportunity'],
          batchSize: 1000
        },
        inputs: [],
        outputs: ['raw-salesforce-data'],
        dependencies: []
      });
    }

    if (taskDescription.toLowerCase().includes('database') || 
        discoveryData?.sources?.some((s: any) => s.type === 'database')) {
      components.push({
        id: 'database-extractor',
        name: 'Database CDC Extractor',
        type: 'extractor',
        technology: 'AWS DMS + Lambda',
        config: {
          sourceEndpoint: '${DB_HOST}:${DB_PORT}',
          database: '${DB_NAME}',
          tables: ['users', 'orders', 'products'],
          cdcEnabled: true
        },
        inputs: [],
        outputs: ['raw-database-data'],
        dependencies: []
      });
    }

    // Data transformation component
    components.push({
      id: 'data-transformer',
      name: 'ETL Data Transformer',
      type: 'transformer',
      technology: 'AWS Glue ETL',
      config: {
        jobType: 'glueetl',
        glueVersion: '4.0',
        pythonVersion: '3',
        maxCapacity: 10,
        transformations: [
          'data_cleansing',
          'schema_normalization',
          'business_logic_application'
        ]
      },
      inputs: ['raw-salesforce-data', 'raw-database-data'],
      outputs: ['transformed-data'],
      dependencies: ['salesforce-extractor', 'database-extractor']
    });

    // Data quality validator
    components.push({
      id: 'data-validator',
      name: 'Data Quality Validator',
      type: 'validator',
      technology: 'AWS Glue DataBrew + Lambda',
      config: {
        validationRules: [
          'null_check',
          'data_type_validation',
          'business_rule_validation',
          'referential_integrity'
        ],
        qualityThreshold: 95
      },
      inputs: ['transformed-data'],
      outputs: ['validated-data', 'quality-metrics'],
      dependencies: ['data-transformer']
    });

    // Data loader component
    if (taskDescription.toLowerCase().includes('snowflake')) {
      components.push({
        id: 'snowflake-loader',
        name: 'Snowflake Data Loader',
        type: 'loader',
        technology: 'Snowflake + AWS Lambda',
        config: {
          warehouse: 'COMPUTE_WH',
          database: 'ANALYTICS',
          schema: 'PUBLIC',
          loadMethod: 'COPY',
          fileFormat: 'PARQUET'
        },
        inputs: ['validated-data'],
        outputs: ['loaded-confirmation'],
        dependencies: ['data-validator']
      });
    } else {
      components.push({
        id: 'redshift-loader',
        name: 'Redshift Data Loader',
        type: 'loader',
        technology: 'Amazon Redshift + Lambda',
        config: {
          cluster: 'analytics-cluster',
          database: 'analytics',
          loadMethod: 'COPY',
          compression: 'gzip'
        },
        inputs: ['validated-data'],
        outputs: ['loaded-confirmation'],
        dependencies: ['data-validator']
      });
    }

    // Monitoring component
    components.push({
      id: 'pipeline-monitor',
      name: 'Pipeline Monitor',
      type: 'monitor',
      technology: 'CloudWatch + SNS',
      config: {
        metrics: ['execution_time', 'data_volume', 'error_rate', 'quality_score'],
        alerts: [
          {
            metric: 'error_rate',
            threshold: 5,
            condition: 'greater_than',
            action: 'sns_notification'
          }
        ]
      },
      inputs: ['quality-metrics', 'loaded-confirmation'],
      outputs: ['monitoring-dashboard'],
      dependencies: ['data-validator']
    });

    return components;
  }

  /**
   * Design data flow between components
   */
  private async designDataFlow(components: PipelineComponent[]): Promise<DataFlowStep[]> {
    const dataFlow: DataFlowStep[] = [];

    // Create flow steps based on component dependencies
    for (const component of components) {
      for (const input of component.inputs) {
        const sourceComponent = components.find(c => c.outputs.includes(input));
        if (sourceComponent) {
          dataFlow.push({
            from: sourceComponent.id,
            to: component.id,
            schema: `${input}-schema`,
            transformation: component.type === 'transformer' ? component.id : undefined,
            validation: component.type === 'validator' ? component.id : undefined
          });
        }
      }
    }

    return dataFlow;
  }

  /**
   * Design data schemas for each component
   */
  private async designSchemas(components: PipelineComponent[], discoveryData: any): Promise<DataSchema[]> {
    const schemas: DataSchema[] = [];

    // Source schemas
    schemas.push({
      name: 'raw-salesforce-data-schema',
      type: 'source',
      format: 'json',
      fields: [
        { name: 'Id', type: 'string', required: true, description: 'Salesforce record ID' },
        { name: 'Name', type: 'string', required: true, description: 'Account or contact name' },
        { name: 'Email', type: 'string', required: false, description: 'Email address' },
        { name: 'CreatedDate', type: 'date', required: true, description: 'Record creation date' },
        { name: 'LastModifiedDate', type: 'date', required: true, description: 'Last modification date' }
      ],
      constraints: ['Id must be unique', 'Email must be valid format'],
      validation: [
        { field: 'Email', rule: 'email_format', message: 'Invalid email format' },
        { field: 'Id', rule: 'not_null', message: 'ID cannot be null' }
      ]
    });

    schemas.push({
      name: 'raw-database-data-schema',
      type: 'source',
      format: 'json',
      fields: [
        { name: 'user_id', type: 'number', required: true, description: 'User identifier' },
        { name: 'username', type: 'string', required: true, description: 'Username' },
        { name: 'email', type: 'string', required: true, description: 'User email' },
        { name: 'created_at', type: 'date', required: true, description: 'User creation timestamp' },
        { name: 'updated_at', type: 'date', required: true, description: 'Last update timestamp' }
      ],
      constraints: ['user_id must be positive', 'email must be unique'],
      validation: [
        { field: 'user_id', rule: 'positive_number', message: 'User ID must be positive' },
        { field: 'email', rule: 'unique', message: 'Email must be unique' }
      ]
    });

    // Intermediate schema
    schemas.push({
      name: 'transformed-data-schema',
      type: 'intermediate',
      format: 'parquet',
      fields: [
        { name: 'customer_id', type: 'string', required: true, description: 'Unified customer identifier' },
        { name: 'customer_name', type: 'string', required: true, description: 'Customer name' },
        { name: 'email', type: 'string', required: true, description: 'Customer email' },
        { name: 'source_system', type: 'string', required: true, description: 'Source system identifier' },
        { name: 'created_date', type: 'date', required: true, description: 'Record creation date' },
        { name: 'last_updated', type: 'date', required: true, description: 'Last update timestamp' }
      ],
      constraints: ['customer_id must be unique', 'email must be valid'],
      validation: [
        { field: 'customer_id', rule: 'unique', message: 'Customer ID must be unique' },
        { field: 'source_system', rule: 'not_null', message: 'Source system is required' }
      ]
    });

    // Target schema
    schemas.push({
      name: 'warehouse-schema',
      type: 'target',
      format: 'parquet',
      fields: [
        { name: 'customer_key', type: 'number', required: true, description: 'Surrogate key' },
        { name: 'customer_id', type: 'string', required: true, description: 'Business key' },
        { name: 'customer_name', type: 'string', required: true, description: 'Customer name' },
        { name: 'email', type: 'string', required: true, description: 'Customer email' },
        { name: 'source_system', type: 'string', required: true, description: 'Source system' },
        { name: 'effective_date', type: 'date', required: true, description: 'SCD effective date' },
        { name: 'expiry_date', type: 'date', required: false, description: 'SCD expiry date' },
        { name: 'is_current', type: 'boolean', required: true, description: 'Current record flag' }
      ],
      constraints: ['customer_key must be unique', 'SCD Type 2 structure'],
      validation: [
        { field: 'customer_key', rule: 'unique', message: 'Customer key must be unique' },
        { field: 'is_current', rule: 'boolean', message: 'is_current must be boolean' }
      ]
    });

    return schemas;
  }

  /**
   * Design infrastructure specification
   */
  private designInfrastructure(taskDescription: string, discoveryData: any): InfrastructureSpec {
    return {
      platform: 'aws',
      compute: {
        orchestrator: 'glue',
        processors: ['lambda', 'glue'],
        scaling: 'auto'
      },
      storage: {
        rawData: 's3',
        processedData: 's3',
        warehouse: taskDescription.toLowerCase().includes('snowflake') ? 'snowflake' : 'redshift'
      },
      networking: {
        vpc: true,
        encryption: 'both',
        access: 'private'
      }
    };
  }

  /**
   * Design monitoring specification
   */
  private designMonitoring(taskDescription: string, discoveryData: any): MonitoringSpec {
    return {
      logging: 'cloudwatch',
      metrics: [
        'pipeline_execution_time',
        'data_volume_processed',
        'error_rate',
        'data_quality_score',
        'cost_per_execution'
      ],
      alerts: [
        {
          metric: 'error_rate',
          threshold: 5,
          condition: 'greater_than_percent',
          action: 'sns_email_notification'
        },
        {
          metric: 'data_quality_score',
          threshold: 95,
          condition: 'less_than_percent',
          action: 'pipeline_pause_and_notify'
        }
      ]
    };
  }

  /**
   * Design security specification
   */
  private designSecurity(taskDescription: string, discoveryData: any): SecuritySpec {
    const compliance = [];
    
    if (taskDescription.toLowerCase().includes('gdpr') || 
        discoveryData?.requirements?.compliance?.includes('GDPR')) {
      compliance.push('GDPR');
    }
    
    if (taskDescription.toLowerCase().includes('hipaa') || 
        discoveryData?.requirements?.compliance?.includes('HIPAA')) {
      compliance.push('HIPAA');
    }

    return {
      authentication: 'iam',
      authorization: 'rbac',
      encryption: {
        inTransit: true,
        atRest: true,
        keyManagement: 'kms'
      },
      compliance
    };
  }

  /**
   * Generate Mermaid diagrams for the pipeline
   */
  private async generateDiagrams(architecture: PipelineArchitecture): Promise<string[]> {
    const diagrams: string[] = [];

    // Architecture overview diagram
    const archDiagram = await this.generateArchitectureDiagram(architecture);
    diagrams.push(archDiagram);

    // Data flow diagram
    const flowDiagram = await this.generateDataFlowDiagram(architecture);
    diagrams.push(flowDiagram);

    return diagrams;
  }

  /**
   * Generate architecture overview diagram
   */
  private async generateArchitectureDiagram(architecture: PipelineArchitecture): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `architecture-diagram-${timestamp}.md`;
    const filepath = join(this.config.outputDir, filename);

    const mermaidContent = `
# Pipeline Architecture Diagram

\`\`\`mermaid
graph TD
${architecture.components.map(component => {
  const nodeId = component.id.replace(/-/g, '_');
  return `    ${nodeId}["${component.name}<br/>${component.technology}"]`;
}).join('\n')}

${architecture.dataFlow.map(flow => {
  const fromId = flow.from.replace(/-/g, '_');
  const toId = flow.to.replace(/-/g, '_');
  return `    ${fromId} --> ${toId}`;
}).join('\n')}
\`\`\`
`;

    if (!this.config.dryRun) {
      await fs.writeFile(filepath, mermaidContent, 'utf-8');
    }

    if (this.config.verbose) {
      console.log(`📊 Generated architecture diagram: ${filename}`);
    }

    return filename;
  }

  /**
   * Generate data flow diagram
   */
  private async generateDataFlowDiagram(architecture: PipelineArchitecture): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `data-flow-diagram-${timestamp}.md`;
    const filepath = join(this.config.outputDir, filename);

    const mermaidContent = `
# Data Flow Diagram

\`\`\`mermaid
flowchart LR
${architecture.schemas.map(schema => {
  const nodeId = schema.name.replace(/-/g, '_');
  const color = schema.type === 'source' ? 'fill:#e1f5fe' : 
               schema.type === 'target' ? 'fill:#f3e5f5' : 'fill:#fff3e0';
  return `    ${nodeId}["${schema.name}<br/>${schema.format}"]:::${schema.type}`;
}).join('\n')}

${architecture.dataFlow.map(flow => {
  const fromSchema = flow.schema.replace(/-/g, '_');
  const toSchema = flow.schema.replace('schema', 'transformed_schema').replace(/-/g, '_');
  return `    ${fromSchema} --> ${toSchema}`;
}).join('\n')}

    classDef source fill:#e1f5fe
    classDef target fill:#f3e5f5
    classDef intermediate fill:#fff3e0
\`\`\`
`;

    if (!this.config.dryRun) {
      await fs.writeFile(filepath, mermaidContent, 'utf-8');
    }

    if (this.config.verbose) {
      console.log(`📊 Generated data flow diagram: ${filename}`);
    }

    return filename;
  }

  /**
   * Validate schemas
   */
  private async validateSchemas(schemas: DataSchema[]): Promise<ValidationResult[]> {
    const validations: ValidationResult[] = [];

    for (const schema of schemas) {
      const validation: ValidationResult = {
        schema: schema.name,
        isValid: true,
        errors: [],
        warnings: []
      };

      // Validate required fields
      const requiredFields = schema.fields.filter(f => f.required);
      if (requiredFields.length === 0) {
        validation.warnings.push('No required fields defined');
      }

      // Validate field types
      for (const field of schema.fields) {
        if (!['string', 'number', 'boolean', 'date', 'array', 'object'].includes(field.type)) {
          validation.errors.push(`Invalid field type: ${field.type} for field ${field.name}`);
          validation.isValid = false;
        }
      }

      // Validate constraints
      if (schema.constraints) {
        for (const constraint of schema.constraints) {
          // Basic constraint validation
          if (!constraint.includes('must') && !constraint.includes('should')) {
            validation.warnings.push(`Constraint may be unclear: ${constraint}`);
          }
        }
      }

      validations.push(validation);
    }

    if (this.config.verbose) {
      console.log(`\n✅ Schema Validation Results:`);
      validations.forEach(v => {
        const status = v.isValid ? '✅' : '❌';
        console.log(`  ${status} ${v.schema}: ${v.errors.length} errors, ${v.warnings.length} warnings`);
      });
    }

    return validations;
  }

  /**
   * Generate code artifacts
   */
  private async generateCode(architecture: PipelineArchitecture): Promise<GeneratedCode[]> {
    const code: GeneratedCode[] = [];

    // Generate Python ETL code
    const pythonCode = await this.generatePythonETL(architecture);
    code.push(pythonCode);

    // Generate SQL transformations
    const sqlCode = await this.generateSQLTransformations(architecture);
    code.push(sqlCode);

    return code;
  }

  /**
   * Generate Python ETL code
   */
  private async generatePythonETL(architecture: PipelineArchitecture): Promise<GeneratedCode> {
    const pythonContent = `# Generated ETL Pipeline Code
# Architecture: ${architecture.name}

import boto3
import pandas as pd
from datetime import datetime
import logging

class ETLPipeline:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.logger = logging.getLogger(__name__)
    
    def extract_salesforce_data(self):
        """Extract data from Salesforce API"""
        # Implementation for Salesforce data extraction
        pass
    
    def extract_database_data(self):
        """Extract data from database"""
        # Implementation for database data extraction
        pass
    
    def transform_data(self, raw_data):
        """Transform and clean data"""
        # Data transformation logic
        pass
    
    def validate_data(self, transformed_data):
        """Validate data quality"""
        # Data validation logic
        pass
    
    def load_to_warehouse(self, validated_data):
        """Load data to warehouse"""
        # Data loading logic
        pass
    
    def run_pipeline(self):
        """Execute the complete pipeline"""
        try:
            # Extract
            salesforce_data = self.extract_salesforce_data()
            database_data = self.extract_database_data()
            
            # Transform
            transformed_data = self.transform_data({
                'salesforce': salesforce_data,
                'database': database_data
            })
            
            # Validate
            validated_data = self.validate_data(transformed_data)
            
            # Load
            self.load_to_warehouse(validated_data)
            
            self.logger.info("Pipeline executed successfully")
            
        except Exception as e:
            self.logger.error(f"Pipeline failed: {str(e)}")
            raise

if __name__ == "__main__":
    pipeline = ETLPipeline()
    pipeline.run_pipeline()
`;

    const filename = `etl_pipeline_${new Date().toISOString().split('T')[0]}.py`;
    const filepath = join(this.config.outputDir, filename);

    if (!this.config.dryRun) {
      await fs.writeFile(filepath, pythonContent, 'utf-8');
    }

    return {
      type: 'python',
      filename,
      content: pythonContent
    };
  }

  /**
   * Generate SQL transformations
   */
  private async generateSQLTransformations(architecture: PipelineArchitecture): Promise<GeneratedCode> {
    const sqlContent = `-- Generated SQL Transformations
-- Architecture: ${architecture.name}

-- Customer data transformation
CREATE OR REPLACE VIEW unified_customer AS
SELECT 
    COALESCE(sf.Id, db.user_id::varchar) as customer_id,
    COALESCE(sf.Name, db.username) as customer_name,
    COALESCE(sf.Email, db.email) as email,
    CASE 
        WHEN sf.Id IS NOT NULL THEN 'salesforce'
        WHEN db.user_id IS NOT NULL THEN 'database'
        ELSE 'unknown'
    END as source_system,
    COALESCE(sf.CreatedDate, db.created_at) as created_date,
    COALESCE(sf.LastModifiedDate, db.updated_at) as last_updated
FROM salesforce_raw sf
FULL OUTER JOIN database_raw db 
    ON sf.Email = db.email;

-- Data quality checks
CREATE OR REPLACE VIEW data_quality_metrics AS
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN customer_id IS NULL THEN 1 END) as null_customer_ids,
    COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as missing_emails,
    COUNT(CASE WHEN email NOT LIKE '%@%' THEN 1 END) as invalid_emails,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(DISTINCT email) as unique_emails
FROM unified_customer;

-- Insert into warehouse with SCD Type 2
INSERT INTO customer_warehouse (
    customer_key,
    customer_id,
    customer_name,
    email,
    source_system,
    effective_date,
    expiry_date,
    is_current
)
SELECT 
    ROW_NUMBER() OVER (ORDER BY customer_id) + COALESCE(MAX(customer_key), 0) as customer_key,
    customer_id,
    customer_name,
    email,
    source_system,
    CURRENT_DATE as effective_date,
    NULL as expiry_date,
    TRUE as is_current
FROM unified_customer uc
LEFT JOIN customer_warehouse cw 
    ON uc.customer_id = cw.customer_id 
    AND cw.is_current = TRUE
WHERE cw.customer_id IS NULL 
   OR (cw.customer_name != uc.customer_name OR cw.email != uc.email);
`;

    const filename = `transformations_${new Date().toISOString().split('T')[0]}.sql`;
    const filepath = join(this.config.outputDir, filename);

    if (!this.config.dryRun) {
      await fs.writeFile(filepath, sqlContent, 'utf-8');
    }

    return {
      type: 'sql',
      filename,
      content: sqlContent
    };
  }

  /**
   * Generate infrastructure code
   */
  private async generateInfrastructure(architecture: PipelineArchitecture): Promise<InfrastructureCode[]> {
    const infrastructure: InfrastructureCode[] = [];

    // Generate Terraform code
    const terraformCode = await this.generateTerraform(architecture);
    infrastructure.push(terraformCode);

    return infrastructure;
  }

  /**
   * Generate Terraform infrastructure code
   */
  private async generateTerraform(architecture: PipelineArchitecture): Promise<InfrastructureCode> {
    const terraformContent = `# Generated Terraform Infrastructure
# Architecture: ${architecture.name}

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "${architecture.name.toLowerCase().replace(/\s+/g, '-')}"
}

# S3 Buckets
resource "aws_s3_bucket" "raw_data" {
  bucket = "\${var.project_name}-raw-data"
}

resource "aws_s3_bucket" "processed_data" {
  bucket = "\${var.project_name}-processed-data"
}

# IAM Role for Glue
resource "aws_iam_role" "glue_role" {
  name = "\${var.project_name}-glue-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
      }
    ]
  })
}

# Glue Job
resource "aws_glue_job" "etl_job" {
  name         = "\${var.project_name}-etl-job"
  role_arn     = aws_iam_role.glue_role.arn
  glue_version = "4.0"

  command {
    script_location = "s3://\${aws_s3_bucket.processed_data.bucket}/scripts/etl_job.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"        = "python"
    "--job-bookmark-option" = "job-bookmark-enable"
  }

  max_capacity = 10
}

# Lambda Functions
${architecture.components
  .filter(c => c.technology.includes('Lambda'))
  .map(component => `
resource "aws_lambda_function" "${component.id.replace(/-/g, '_')}" {
  filename         = "\${component.id}.zip"
  function_name    = "\${var.project_name}-\${component.id}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "python3.9"
  timeout         = 300
}
`).join('')}

# CloudWatch Alarms
${architecture.monitoring.alerts.map(alert => `
resource "aws_cloudwatch_metric_alarm" "${alert.metric.replace(/_/g, '-')}" {
  alarm_name          = "\${var.project_name}-\${alert.metric}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "\${alert.metric}"
  namespace           = "AWS/Glue"
  period              = "300"
  statistic           = "Average"
  threshold           = "\${alert.threshold}"
  alarm_description   = "This metric monitors \${alert.metric}"
}
`).join('')}

# Outputs
output "raw_data_bucket" {
  value = aws_s3_bucket.raw_data.bucket
}

output "processed_data_bucket" {
  value = aws_s3_bucket.processed_data.bucket
}
`;

    const filename = `infrastructure_${new Date().toISOString().split('T')[0]}.tf`;
    const filepath = join(this.config.outputDir, filename);

    if (!this.config.dryRun) {
      await fs.writeFile(filepath, terraformContent, 'utf-8');
    }

    return {
      type: 'terraform',
      filename,
      content: terraformContent
    };
  }

  /**
   * Generate comprehensive architecture document
   */
  private async generateArchitectureDocument(data: {
    architecture: PipelineArchitecture;
    diagrams: string[];
    schemaValidations: ValidationResult[];
    codeGeneration: GeneratedCode[];
    infrastructure: InfrastructureCode[];
  }): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `pipeline-architecture-${timestamp}.md`;
    const filepath = join(this.config.outputDir, filename);

    const content = this.formatArchitectureDocument(data);

    if (!this.config.dryRun) {
      await fs.writeFile(filepath, content, 'utf-8');
    }

    if (this.config.verbose) {
      console.log(`\n📄 Generated architecture document: ${filename}`);
    }

    return filename;
  }

  /**
   * Format architecture document as markdown
   */
  private formatArchitectureDocument(data: {
    architecture: PipelineArchitecture;
    diagrams: string[];
    schemaValidations: ValidationResult[];
    codeGeneration: GeneratedCode[];
    infrastructure: InfrastructureCode[];
  }): string {
    const { architecture } = data;

    return `# Enterprise Data Pipeline Architecture

**Pipeline:** ${architecture.name}
**Generated:** ${new Date().toISOString()}
**Namespace:** ${this.config.namespace}

## Overview

${architecture.description}

## Architecture Components (${architecture.components.length})

${architecture.components.map((component, i) => `
### ${i + 1}. ${component.name}
- **Type:** ${component.type}
- **Technology:** ${component.technology}
- **Inputs:** ${component.inputs.join(', ') || 'None'}
- **Outputs:** ${component.outputs.join(', ') || 'None'}
- **Dependencies:** ${component.dependencies.join(', ') || 'None'}

**Configuration:**
\`\`\`json
${JSON.stringify(component.config, null, 2)}
\`\`\`
`).join('')}

## Data Flow (${architecture.dataFlow.length} steps)

${architecture.dataFlow.map((flow, i) => `
${i + 1}. **${flow.from}** → **${flow.to}**
   - Schema: ${flow.schema}
   - Transformation: ${flow.transformation || 'None'}
   - Validation: ${flow.validation || 'None'}
`).join('')}

## Data Schemas (${architecture.schemas.length})

${architecture.schemas.map((schema, i) => `
### ${i + 1}. ${schema.name} (${schema.type})
- **Format:** ${schema.format}
- **Fields:** ${schema.fields.length}

**Schema Definition:**
${schema.fields.map(field => `
- **${field.name}** (${field.type}${field.required ? ', required' : ''}): ${field.description || 'No description'}
`).join('')}

**Constraints:**
${schema.constraints?.map(c => `- ${c}`).join('\n') || 'None'}

**Validation Rules:**
${schema.validation?.map(v => `- ${v.field}: ${v.rule} - ${v.message}`).join('\n') || 'None'}
`).join('')}

## Infrastructure Specification

### Platform
- **Cloud Provider:** ${architecture.infrastructure.platform.toUpperCase()}
- **Orchestrator:** ${architecture.infrastructure.compute.orchestrator}
- **Processors:** ${architecture.infrastructure.compute.processors.join(', ')}
- **Scaling:** ${architecture.infrastructure.compute.scaling}

### Storage
- **Raw Data:** ${architecture.infrastructure.storage.rawData}
- **Processed Data:** ${architecture.infrastructure.storage.processedData}
- **Warehouse:** ${architecture.infrastructure.storage.warehouse}

### Security & Compliance
- **Authentication:** ${architecture.security.authentication}
- **Authorization:** ${architecture.security.authorization}
- **Encryption:** ${architecture.security.encryption.inTransit ? 'In-transit' : ''} ${architecture.security.encryption.atRest ? 'At-rest' : ''}
- **Key Management:** ${architecture.security.encryption.keyManagement}
- **Compliance:** ${architecture.security.compliance.join(', ') || 'None specified'}

## Monitoring & Alerting

### Metrics
${architecture.monitoring.metrics.map(m => `- ${m}`).join('\n')}

### Alerts
${architecture.monitoring.alerts.map(alert => `
- **${alert.metric}**: ${alert.condition} ${alert.threshold}% → ${alert.action}
`).join('')}

## Generated Artifacts

### Diagrams (${data.diagrams.length})
${data.diagrams.map(d => `- ${d}`).join('\n')}

### Code Generation (${data.codeGeneration.length})
${data.codeGeneration.map(c => `- ${c.type.toUpperCase()}: ${c.filename}`).join('\n')}

### Infrastructure Code (${data.infrastructure.length})
${data.infrastructure.map(i => `- ${i.type.toUpperCase()}: ${i.filename}`).join('\n')}

## Schema Validation Results

${data.schemaValidations.map(v => `
### ${v.schema}
- **Status:** ${v.isValid ? '✅ Valid' : '❌ Invalid'}
- **Errors:** ${v.errors.length}
- **Warnings:** ${v.warnings.length}

${v.errors.length > 0 ? `**Errors:**\n${v.errors.map(e => `- ${e}`).join('\n')}` : ''}
${v.warnings.length > 0 ? `**Warnings:**\n${v.warnings.map(w => `- ${w}`).join('\n')}` : ''}
`).join('')}

## Implementation Next Steps

1. **Phase 3:** Set up data extraction from identified sources
2. **Phase 4:** Implement transformation logic using generated code
3. **Phase 5:** Deploy data quality validation and testing
4. **Phase 6:** Configure data loading to target systems
5. **Phase 7:** Implement monitoring, alerting, and maintenance

## Architecture Notes

This architecture provides a comprehensive foundation for implementing a robust enterprise data pipeline. 
The design emphasizes scalability, security, and maintainability while following AWS best practices.

All generated code and infrastructure definitions are ready for deployment with minimal configuration.

---
*Generated by Claude Flow Pipeline Design Engine*
`;
  }

  /**
   * Utility methods
   */
  private extractPipelineName(description: string): string {
    // Extract a meaningful name from the task description
    const cleaned = description.replace(/^(build|create|design|implement)\s+/i, '');
    const words = cleaned.split(' ').slice(0, 4); // Take first 4 words
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
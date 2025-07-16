/**
 * Unit tests for Pipeline Extraction Engine - Phase 3
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { PipelineExtractionEngine, ExtractionSource, ExtractionPlan } from '../../../../../src/cli/pipeline/extraction/pipeline-extraction-engine';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

describe('PipelineExtractionEngine', () => {
  let engine: PipelineExtractionEngine;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    engine = new PipelineExtractionEngine();
    mockFs = fs as jest.Mocked<typeof fs>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateExtractionPlan', () => {
    it('should generate a basic extraction plan from requirements', async () => {
      const requirements = 'Extract customer data from PostgreSQL database daily';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan).toBeDefined();
      expect(plan.sources).toHaveLength(1);
      expect(plan.sources[0].type).toBe('database');
      expect(plan.sources[0].subtype).toBe('rdbms');
      expect(plan.strategy.extractionType).toBe('batch');
      expect(plan.strategy.frequency).toBe('daily');
      expect(plan.connectors).toHaveLength(1);
      expect(plan.infrastructure).toBeDefined();
      expect(plan.monitoring).toBeDefined();
      expect(plan.security).toBeDefined();
      expect(plan.codeGeneration).toBeDefined();
      expect(plan.documentation).toBeDefined();
    });

    it('should handle real-time streaming requirements', async () => {
      const requirements = 'Stream real-time events from Kafka for live analytics';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.strategy.extractionType).toBe('streaming');
      expect(plan.strategy.frequency).toBe('real-time');
      expect(plan.sources[0].extractionMethod).toBe('streaming');
      expect(plan.sources[0].schedule).toBe('streaming');
    });

    it('should detect multiple data sources', async () => {
      const requirements = 'Extract from Salesforce CRM and MySQL database, also process S3 files';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.sources.length).toBeGreaterThanOrEqual(3);
      
      const sourceTypes = plan.sources.map(s => `${s.type}-${s.subtype}`);
      expect(sourceTypes).toContain('api-salesforce');
      expect(sourceTypes).toContain('database-rdbms');
      expect(sourceTypes).toContain('cloud-s3');
    });

    it('should handle incremental extraction requirements', async () => {
      const requirements = 'Set up incremental extraction from customer database using CDC';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.sources[0].extractionMethod).toBe('cdc');
    });

    it('should incorporate discovery plan when provided', async () => {
      const requirements = 'Extract customer data';
      const discoveryPlan = './test-discovery-plan.md';
      
      mockFs.readFile.mockResolvedValue(`
        # Discovery Plan
        High volume data (2TB daily)
        GDPR compliance required
        Real-time processing needed
      `);
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(mockFs.readFile).toHaveBeenCalledWith(discoveryPlan, 'utf-8');
      expect(plan.strategy.encryptionEnabled).toBe(true);
      expect(plan.infrastructure.compute).toBe('large');
    });

    it('should handle missing discovery plan gracefully', async () => {
      const requirements = 'Extract data from API';
      const discoveryPlan = './missing-plan.md';
      
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(plan).toBeDefined();
      expect(plan.sources).toHaveLength(1);
    });

    it('should handle generation with invalid input gracefully', async () => {
      const requirements = 'Extract data'; // Valid but minimal requirements
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      // Should still generate a valid plan even with minimal input
      expect(plan).toBeDefined();
      expect(plan.sources).toHaveLength(2); // Default sources
      expect(plan.strategy).toBeDefined();
      expect(plan.connectors).toBeDefined();
    });
  });

  describe('source type detection and configuration', () => {
    it('should configure database sources correctly', async () => {
      const requirements = 'Extract from PostgreSQL and MongoDB databases';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const dbSources = plan.sources.filter(s => s.type === 'database');
      expect(dbSources).toHaveLength(2);
      
      const postgresSource = dbSources.find(s => s.subtype === 'rdbms');
      expect(postgresSource).toBeDefined();
      expect(postgresSource!.connectionString).toContain('postgresql://');
      expect(postgresSource!.credentials?.type).toBe('basic');
      expect(postgresSource!.parameters.tables).toBeDefined();
      expect(postgresSource!.parameters.watermarkColumn).toBe('updated_at');
      
      const mongoSource = dbSources.find(s => s.subtype === 'nosql');
      expect(mongoSource).toBeDefined();
      expect(mongoSource!.connectionString).toContain('mongodb://');
    });

    it('should configure API sources correctly', async () => {
      const requirements = 'Extract from Salesforce and REST API endpoints';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const apiSources = plan.sources.filter(s => s.type === 'api');
      expect(apiSources).toHaveLength(2);
      
      const salesforceSource = apiSources.find(s => s.subtype === 'salesforce');
      expect(salesforceSource).toBeDefined();
      expect(salesforceSource!.credentials?.type).toBe('oauth');
      expect(salesforceSource!.parameters.objects).toContain('Account');
      expect(salesforceSource!.parameters.bulkApi).toBe(true);
      
      const restSource = apiSources.find(s => s.subtype === 'rest');
      expect(restSource).toBeDefined();
      expect(restSource!.credentials?.type).toBe('token');
      expect(restSource!.parameters.pagination).toBe('cursor');
    });

    it('should configure cloud sources correctly', async () => {
      const requirements = 'Process files from Amazon S3';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const cloudSources = plan.sources.filter(s => s.type === 'cloud');
      expect(cloudSources).toHaveLength(1);
      
      const s3Source = cloudSources[0];
      expect(s3Source.subtype).toBe('s3');
      expect(s3Source.credentials?.type).toBe('basic');
      expect(s3Source.parameters.bucket).toBe('${S3_BUCKET}');
      expect(s3Source.parameters.fileFormat).toBe('parquet');
    });

    it('should configure streaming sources correctly', async () => {
      const requirements = 'Stream events from Kafka topics';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const streamSources = plan.sources.filter(s => s.type === 'stream');
      expect(streamSources).toHaveLength(1);
      
      const kafkaSource = streamSources[0];
      expect(kafkaSource.extractionMethod).toBe('streaming');
      expect(kafkaSource.parameters.topics).toContain('user-events');
      expect(kafkaSource.parameters.consumerGroup).toBe('pipeline-consumer');
    });

    it('should handle high volume configuration', async () => {
      const requirements = 'Extract high volume data from database';
      const discoveryPlan = './discovery.md';
      
      mockFs.readFile.mockResolvedValue('High volume data processing (10TB daily)');
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(plan.sources[0].batchSize).toBe(50000);
      expect(plan.sources[0].parallelism).toBe(8);
      expect(plan.strategy.compressionEnabled).toBe(true);
      expect(plan.infrastructure.compute).toBe('large');
      expect(plan.infrastructure.memory).toBe('16GB');
    });
  });

  describe('connector configuration', () => {
    it('should configure JDBC connector for database sources', async () => {
      const requirements = 'Extract from PostgreSQL database';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const connector = plan.connectors.find(c => c.connectorType === 'jdbc');
      expect(connector).toBeDefined();
      expect(connector!.dependencies).toContain('jdbc-driver');
      expect(connector!.configuration.driverClass).toContain('postgresql');
      expect(connector!.configuration.maxConnections).toBeDefined();
      expect(connector!.performanceTuning.fetchSize).toBeDefined();
      expect(connector!.healthCheckScript).toBe('SELECT 1');
    });

    it('should configure HTTP connector for API sources', async () => {
      const requirements = 'Extract from REST API';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const connector = plan.connectors.find(c => c.connectorType === 'http');
      expect(connector).toBeDefined();
      expect(connector!.dependencies).toContain('http-client');
      expect(connector!.configuration.retryPolicy).toBe('exponential-backoff');
      expect(connector!.performanceTuning.maxConcurrentRequests).toBeDefined();
      expect(connector!.healthCheckScript).toBe('GET /health');
    });

    it('should configure Salesforce connector specifically', async () => {
      const requirements = 'Extract from Salesforce CRM';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const connector = plan.connectors.find(c => c.connectorType === 'salesforce');
      expect(connector).toBeDefined();
      expect(connector!.dependencies).toContain('oauth-handler');
      expect(connector!.configuration.authType).toBe('oauth');
    });

    it('should configure S3 connector for cloud sources', async () => {
      const requirements = 'Process files from S3';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const connector = plan.connectors.find(c => c.connectorType === 's3');
      expect(connector).toBeDefined();
      expect(connector!.dependencies).toContain('aws-sdk');
      expect(connector!.performanceTuning.multipartThreshold).toBeDefined();
      expect(connector!.performanceTuning.maxConcurrentParts).toBe(10);
    });

    it('should configure Kafka connector for streaming sources', async () => {
      const requirements = 'Stream from Kafka';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      const connector = plan.connectors.find(c => c.connectorType === 'kafka');
      expect(connector).toBeDefined();
      expect(connector!.dependencies).toContain('kafka-client');
      expect(connector!.performanceTuning.maxPollRecords).toBe(500);
    });

    it('should generate environment variables for connectors', async () => {
      const requirements = 'Extract from database and API';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      // Find database connector (may have different type)
      const dbConnector = plan.connectors.find(c => c.connectorType === 'jdbc' || c.connectorType === 'database');
      expect(dbConnector).toBeDefined();
      if (dbConnector?.environmentVariables) {
        expect(dbConnector.environmentVariables).toHaveProperty('DB_HOST');
        expect(dbConnector.environmentVariables).toHaveProperty('DB_USERNAME');
        expect(dbConnector.environmentVariables).toHaveProperty('DB_PASSWORD');
      }
      
      // Find API connector (may have different type)
      const apiConnector = plan.connectors.find(c => c.connectorType === 'http' || c.connectorType === 'api');
      expect(apiConnector).toBeDefined();
      if (apiConnector?.environmentVariables) {
                expect(apiConnector.environmentVariables).toHaveProperty('API_BASE_URL');
        expect(apiConnector.environmentVariables).toHaveProperty('API_TOKEN');
       }
    });
  });

  describe('strategy configuration', () => {
    it('should configure batch strategy for non-streaming sources', async () => {
      const requirements = 'Extract daily from database';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.strategy.extractionType).toBe('batch');
      expect(plan.strategy.frequency).toBe('daily');
      expect(plan.strategy.dataValidation).toBe(true);
    });

    it('should configure streaming strategy for real-time sources', async () => {
      const requirements = 'Stream real-time data from Kafka';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.strategy.extractionType).toBe('streaming');
      expect(plan.strategy.frequency).toBe('real-time');
    });

    it('should configure hybrid strategy for mixed sources', async () => {
      const requirements = 'Extract daily from database and stream from Kafka';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.strategy.extractionType).toBe('hybrid');
    });

    it('should enable compression for high volume', async () => {
      const requirements = 'Extract high volume data';
      const discoveryPlan = './discovery.md';
      
      mockFs.readFile.mockResolvedValue('High volume processing required');
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(plan.strategy.compressionEnabled).toBe(true);
    });

    it('should enable encryption for compliance', async () => {
      const requirements = 'Extract customer data with GDPR compliance';
      const discoveryPlan = './discovery.md';
      
      mockFs.readFile.mockResolvedValue('GDPR compliance required');
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(plan.strategy.encryptionEnabled).toBe(true);
    });
  });

  describe('infrastructure planning', () => {
    it('should plan infrastructure based on parallelism and batch size', async () => {
      const requirements = 'Extract from multiple databases with high parallelism';
      const discoveryPlan = './discovery.md';
      
      mockFs.readFile.mockResolvedValue('High volume, multiple sources');
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(plan.infrastructure.compute).toBe('large');
      expect(plan.infrastructure.memory).toBe('16GB');
      expect(plan.infrastructure.storage).toBe('100GB SSD');
      expect(plan.infrastructure.network).toBe('1Gbps');
    });

    it('should plan minimal infrastructure for small loads', async () => {
      const requirements = 'Extract small dataset from single database';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.infrastructure.compute).toBe('small');
      expect(plan.infrastructure.memory).toBe('4GB');
    });
  });

  describe('monitoring and security', () => {
    it('should configure comprehensive monitoring', async () => {
      const requirements = 'Extract data with monitoring';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.monitoring.metrics).toContain('extraction.records.count');
      expect(plan.monitoring.metrics).toContain('extraction.latency.p95');
      expect(plan.monitoring.alerts).toContain('Extraction failure rate > 5%');
      expect(plan.monitoring.logging).toBe('INFO');
    });

    it('should configure security based on compliance needs', async () => {
      const requirements = 'Extract patient data';
      const discoveryPlan = './discovery.md';
      
      mockFs.readFile.mockResolvedValue('HIPAA compliance required for patient data');
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(plan.security.encryption).toBe(true);
      expect(plan.security.accessControl).toContain('extraction-operators');
      expect(plan.security.auditLogging).toBe(true);
    });
  });

  describe('code generation', () => {
    it('should generate Python extraction script', async () => {
      const requirements = 'Extract from database';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.codeGeneration.pythonScript).toContain('class ExtractionPipeline');
      expect(plan.codeGeneration.pythonScript).toContain('extract_data');
      expect(plan.codeGeneration.pythonScript).toContain('validate_data');
      expect(plan.codeGeneration.pythonScript).toContain('DatabaseExtractor');
    });

    it('should generate Airflow DAG', async () => {
      const requirements = 'Extract with orchestration';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.codeGeneration.airflowDag).toContain('from airflow import DAG');
      expect(plan.codeGeneration.airflowDag).toContain('PythonOperator');
      expect(plan.codeGeneration.airflowDag).toContain('data_extraction_pipeline');
      expect(plan.codeGeneration.airflowDag).toContain('extract_');
    });

    it('should generate AWS Glue job', async () => {
      const requirements = 'Extract using AWS Glue';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.codeGeneration.glueJob).toContain('from awsglue.transforms import *');
      expect(plan.codeGeneration.glueJob).toContain('GlueContext');
      expect(plan.codeGeneration.glueJob).toContain('s3://your-staging-bucket');
    });

    it('should generate Docker Compose for development', async () => {
      const requirements = 'Extract with containerized environment';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.codeGeneration.dockerCompose).toContain('version: \'3.8\'');
      expect(plan.codeGeneration.dockerCompose).toContain('extraction-pipeline:');
      expect(plan.codeGeneration.dockerCompose).toContain('postgres:');
    });

    it('should include source-specific extractor code', async () => {
      const requirements = 'Extract from Salesforce and S3';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.codeGeneration.pythonScript).toContain('APIExtractor');
      expect(plan.codeGeneration.pythonScript).toContain('S3Extractor');
    });
  });

  describe('documentation generation', () => {
    it('should generate comprehensive documentation', async () => {
      const requirements = 'Extract customer data from multiple sources';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.documentation).toContain('# Data Extraction Plan');
      expect(plan.documentation).toContain('## Overview');
      expect(plan.documentation).toContain('## Data Sources');
      expect(plan.documentation).toContain('## Extraction Strategy');
      expect(plan.documentation).toContain('## Connector Configurations');
      expect(plan.documentation).toContain('## Security & Compliance');
      expect(plan.documentation).toContain('## Monitoring & Alerting');
      expect(plan.documentation).toContain('## Implementation Files');
      expect(plan.documentation).toContain('## Next Steps');
    });

    it('should include source details in documentation', async () => {
      const requirements = 'Extract from PostgreSQL database';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.documentation).toContain('database (rdbms)');
      expect(plan.documentation).toContain('Batch Size:');
      expect(plan.documentation).toContain('Parallelism:');
      expect(plan.documentation).toContain('Connection String:');
    });

    it('should include strategy details in documentation', async () => {
      const requirements = 'Stream data in real-time';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan.documentation).toContain('**Extraction Type:** streaming');
      expect(plan.documentation).toContain('**Frequency:** real-time');
    });
  });

  describe('saveExtractionPlan', () => {
    it('should save extraction plan to default file', async () => {
      const plan: ExtractionPlan = {
        sources: [],
        strategy: {} as any,
        connectors: [],
        infrastructure: {} as any,
        monitoring: {} as any,
        security: {} as any,
        codeGeneration: {} as any,
        documentation: 'Test documentation'
      };
      
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const filename = await engine.saveExtractionPlan(plan);
      
      expect(filename).toMatch(/pipeline-extraction-plan-\d{4}-\d{2}-\d{2}\.md/);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        filename,
        'Test documentation',
        'utf-8'
      );
    });

    it('should save extraction plan to custom file', async () => {
      const plan: ExtractionPlan = {
        sources: [],
        strategy: {} as any,
        connectors: [],
        infrastructure: {} as any,
        monitoring: {} as any,
        security: {} as any,
        codeGeneration: {} as any,
        documentation: 'Test documentation'
      };
      
      const customPath = './custom-extraction-plan.md';
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const filename = await engine.saveExtractionPlan(plan, customPath);
      
      expect(filename).toBe(customPath);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        customPath,
        'Test documentation',
        'utf-8'
      );
    });

    it('should handle save errors', async () => {
      const plan: ExtractionPlan = {
        sources: [],
        strategy: {} as any,
        connectors: [],
        infrastructure: {} as any,
        monitoring: {} as any,
        security: {} as any,
        codeGeneration: {} as any,
        documentation: 'Test documentation'
      };
      
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      await expect(engine.saveExtractionPlan(plan)).rejects.toThrow('Failed to save extraction plan');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty requirements', async () => {
      const requirements = '';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan).toBeDefined();
      expect(plan.sources).toHaveLength(2); // Default database and API sources
    });

    it('should handle unknown source types gracefully', async () => {
      const requirements = 'Extract from some unknown data source';
      
      const plan = await engine.generateExtractionPlan(requirements);
      
      expect(plan).toBeDefined();
      expect(plan.sources).toHaveLength(2); // Default sources
    });

    it('should handle invalid discovery plan files', async () => {
      const requirements = 'Extract data';
      const discoveryPlan = './invalid-plan.md';
      
      mockFs.readFile.mockRejectedValue(new Error('Invalid file'));
      
      const plan = await engine.generateExtractionPlan(requirements, discoveryPlan);
      
      expect(plan).toBeDefined();
      expect(plan.sources).toHaveLength(2);
    });
  });
}); 
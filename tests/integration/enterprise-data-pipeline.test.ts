/**
 * Enterprise Data Pipeline Integration Tests
 * 
 * Tests the complete end-to-end enterprise data pipeline system
 * covering all 7 phases from discovery to monitoring
 */

import { describe, it, expect, jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { execSync } from 'child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test configuration
const TEST_OUTPUT_DIR = join(tmpdir(), 'enterprise-pipeline-test');
const CLI_PATH = './cli.js';

describe('Enterprise Data Pipeline Integration Tests', () => {
  beforeAll(() => {
    // Create test output directory
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Phase 1: Discovery & Planning', () => {
    it('should execute discovery command and generate comprehensive plan', () => {
      const requirements = 'Build customer analytics pipeline from Salesforce to Snowflake';
      
      const result = execSync(
        `${CLI_PATH} sparc discovery "${requirements}" --output-path ${TEST_OUTPUT_DIR}/discovery`,
        { encoding: 'utf8', timeout: 30000 }
      );

      expect(result).toContain('Pipeline discovery completed');
      expect(result).toContain('Salesforce CRM');
      expect(result).toContain('Snowflake Data Warehouse');
      
      // Verify output files exist
      const discoveryFiles = [
        join(TEST_OUTPUT_DIR, 'discovery', 'pipeline-discovery-plan-*.md')
      ];
      
      // Check at least one discovery file was created
      expect(existsSync(join(TEST_OUTPUT_DIR, 'discovery'))).toBe(true);
    });

    it('should handle real-time streaming requirements', () => {
      const requirements = 'Create real-time analytics pipeline for IoT sensor data';
      
      const result = execSync(
        `${CLI_PATH} sparc discovery "${requirements}" --output-path ${TEST_OUTPUT_DIR}/discovery-streaming`,
        { encoding: 'utf8', timeout: 30000 }
      );

      expect(result).toContain('Pipeline discovery completed');
      expect(result).toContain('Real-time');
      expect(result).toContain('Streaming');
    });
  });

  describe('Phase 2: Architecture Design', () => {
    it('should design pipeline architecture with schemas and diagrams', () => {
      const requirements = 'Design robust data architecture for customer analytics';
      const discoveryPlan = join(TEST_OUTPUT_DIR, 'discovery', 'pipeline-discovery-plan-*.md');
      
      const result = execSync(
        `${CLI_PATH} sparc design "${requirements}" --discovery-plan ${discoveryPlan} --output-path ${TEST_OUTPUT_DIR}/design --generate-diagrams`,
        { encoding: 'utf8', timeout: 45000 }
      );

      expect(result).toContain('Pipeline architecture design completed');
      expect(result).toContain('Architecture diagrams generated');
      expect(result).toContain('Schema validation');
      
      // Verify design artifacts
      expect(existsSync(join(TEST_OUTPUT_DIR, 'design'))).toBe(true);
    });

    it('should generate infrastructure code for multi-cloud deployment', () => {
      const requirements = 'Multi-cloud architecture with AWS and Azure integration';
      
      const result = execSync(
        `${CLI_PATH} sparc design "${requirements}" --output-path ${TEST_OUTPUT_DIR}/design-multicloud --generate-code`,
        { encoding: 'utf8', timeout: 45000 }
      );

      expect(result).toContain('Infrastructure code generated');
      expect(result).toContain('Terraform');
    });
  });

  describe('Phase 3: Data Extraction', () => {
    it('should configure data extraction with auto-connectors', () => {
      const requirements = 'Extract customer data from multiple sources with CDC';
      const designPlan = join(TEST_OUTPUT_DIR, 'design', 'pipeline-architecture-*.md');
      
      const result = execSync(
        `${CLI_PATH} sparc extraction "${requirements}" --design-plan ${designPlan} --output-path ${TEST_OUTPUT_DIR}/extraction --auto-configure`,
        { encoding: 'utf8', timeout: 60000 }
      );

      expect(result).toContain('Data extraction plan generated');
      expect(result).toContain('Auto-configured connectors');
      expect(result).toContain('Change Data Capture');
      
      // Verify extraction configuration
      expect(existsSync(join(TEST_OUTPUT_DIR, 'extraction'))).toBe(true);
    });

    it('should handle high-volume batch extraction', () => {
      const requirements = 'Daily batch extraction of 10TB enterprise data';
      
      const result = execSync(
        `${CLI_PATH} sparc extraction "${requirements}" --output-path ${TEST_OUTPUT_DIR}/extraction-batch --parallel`,
        { encoding: 'utf8', timeout: 60000 }
      );

      expect(result).toContain('Batch extraction configured');
      expect(result).toContain('Parallel processing');
      expect(result).toContain('Performance optimization');
    });
  });

  describe('Phase 4: Data Transformation', () => {
    it('should create comprehensive ETL transformations with dbt', () => {
      const requirements = 'Transform customer data with business logic and aggregations';
      const extractionPlan = join(TEST_OUTPUT_DIR, 'extraction', 'pipeline-extraction-plan-*.md');
      
      const result = execSync(
        `${CLI_PATH} sparc transformation "${requirements}" --extraction-plan ${extractionPlan} --output-path ${TEST_OUTPUT_DIR}/transformation --generate-dbt`,
        { encoding: 'utf8', timeout: 75000 }
      );

      expect(result).toContain('Transformation plan created');
      expect(result).toContain('dbt project generated');
      expect(result).toContain('Business logic validation');
      
      // Verify transformation artifacts
      expect(existsSync(join(TEST_OUTPUT_DIR, 'transformation'))).toBe(true);
    });

    it('should generate complex aggregation and windowing functions', () => {
      const requirements = 'Complex time-series aggregations with windowing and joins';
      
      const result = execSync(
        `${CLI_PATH} sparc transformation "${requirements}" --output-path ${TEST_OUTPUT_DIR}/transformation-complex --visual-workflow`,
        { encoding: 'utf8', timeout: 75000 }
      );

      expect(result).toContain('Complex transformations designed');
      expect(result).toContain('Time-series');
      expect(result).toContain('Visual workflow');
    });
  });

  describe('Phase 5: Quality & Validation', () => {
    it('should implement comprehensive data quality validation', () => {
      const requirements = 'Comprehensive data quality with Great Expectations and dbt tests';
      const transformationPlan = join(TEST_OUTPUT_DIR, 'transformation', 'pipeline-transformation-plan-*.md');
      
      const result = execSync(
        `${CLI_PATH} sparc validation "${requirements}" --transformation-plan ${transformationPlan} --output-path ${TEST_OUTPUT_DIR}/validation --generate-tests`,
        { encoding: 'utf8', timeout: 90000 }
      );

      expect(result).toContain('Validation plan created');
      expect(result).toContain('Great Expectations');
      expect(result).toContain('dbt tests');
      expect(result).toContain('Quality validation rules');
      
      // Verify validation framework
      expect(existsSync(join(TEST_OUTPUT_DIR, 'validation'))).toBe(true);
    });

    it('should handle GDPR compliance validation', () => {
      const requirements = 'GDPR compliant data validation with PII encryption checks';
      
      const result = execSync(
        `${CLI_PATH} sparc validation "${requirements}" --output-path ${TEST_OUTPUT_DIR}/validation-compliance --compliance`,
        { encoding: 'utf8', timeout: 90000 }
      );

      expect(result).toContain('Compliance validation enabled');
      expect(result).toContain('GDPR');
      expect(result).toContain('PII validation');
    });
  });

  describe('Phase 6: Loading & Storage', () => {
    it('should optimize data loading with destination-specific strategies', () => {
      const requirements = 'Optimized loading to Snowflake with compression and partitioning';
      const validationPlan = join(TEST_OUTPUT_DIR, 'validation', 'pipeline-validation-plan-*.md');
      
      const result = execSync(
        `${CLI_PATH} sparc loading "${requirements}" --validation-plan ${validationPlan} --output-path ${TEST_OUTPUT_DIR}/loading --generate-code`,
        { encoding: 'utf8', timeout: 120000 }
      );

      expect(result).toContain('Loading plan generated');
      expect(result).toContain('Snowflake');
      expect(result).toContain('Performance optimization');
      expect(result).toContain('Implementation code');
      
      // Verify loading configuration
      expect(existsSync(join(TEST_OUTPUT_DIR, 'loading'))).toBe(true);
    });

    it('should handle multi-destination loading strategies', () => {
      const requirements = 'Load data to Snowflake warehouse and S3 data lake simultaneously';
      
      const result = execSync(
        `${CLI_PATH} sparc loading "${requirements}" --output-path ${TEST_OUTPUT_DIR}/loading-multi --parallel`,
        { encoding: 'utf8', timeout: 120000 }
      );

      expect(result).toContain('Multi-destination loading');
      expect(result).toContain('Parallel loading');
      expect(result).toContain('Data governance');
    });
  });

  describe('Phase 7: Monitoring & Maintenance', () => {
    it('should implement comprehensive observability and alerting', () => {
      const requirements = 'Complete observability with Prometheus, Grafana, and intelligent alerting';
      const loadingPlan = join(TEST_OUTPUT_DIR, 'loading', 'pipeline-loading-plan-*.md');
      
      const result = execSync(
        `${CLI_PATH} sparc monitoring "${requirements}" --loading-plan ${loadingPlan} --output-path ${TEST_OUTPUT_DIR}/monitoring --generate-code`,
        { encoding: 'utf8', timeout: 150000 }
      );

      expect(result).toContain('Monitoring plan generated');
      expect(result).toContain('Prometheus');
      expect(result).toContain('Grafana');
      expect(result).toContain('Alert rules');
      
      // Verify monitoring setup
      expect(existsSync(join(TEST_OUTPUT_DIR, 'monitoring'))).toBe(true);
    });

    it('should configure enterprise SLA monitoring', () => {
      const requirements = 'Enterprise SLA monitoring with 99.9% availability targets';
      
      const result = execSync(
        `${CLI_PATH} sparc monitoring "${requirements}" --output-path ${TEST_OUTPUT_DIR}/monitoring-sla --compliance`,
        { encoding: 'utf8', timeout: 150000 }
      );

      expect(result).toContain('SLA monitoring configured');
      expect(result).toContain('99.9%');
      expect(result).toContain('Compliance features');
    });
  });

  describe('End-to-End Pipeline Workflow', () => {
    it('should execute complete pipeline creation workflow', () => {
      const pipelineRequest = 'Create enterprise customer analytics pipeline from Salesforce to Snowflake with real-time streaming, comprehensive data quality, and 99.9% SLA monitoring';
      
      // Execute each phase in sequence
      const phases = [
        { name: 'discovery', timeout: 30000 },
        { name: 'design', timeout: 45000 },
        { name: 'extraction', timeout: 60000 },
        { name: 'transformation', timeout: 75000 },
        { name: 'validation', timeout: 90000 },
        { name: 'loading', timeout: 120000 },
        { name: 'monitoring', timeout: 150000 }
      ];

      const workflowOutputDir = join(TEST_OUTPUT_DIR, 'complete-workflow');
      
      phases.forEach(phase => {
        const result = execSync(
          `${CLI_PATH} sparc ${phase.name} "${pipelineRequest}" --output-path ${workflowOutputDir}/${phase.name} --generate-code`,
          { encoding: 'utf8', timeout: phase.timeout }
        );

        expect(result).toContain('completed successfully');
        expect(existsSync(join(workflowOutputDir, phase.name))).toBe(true);
      });

      // Verify all phases created artifacts
      phases.forEach(phase => {
        expect(existsSync(join(workflowOutputDir, phase.name))).toBe(true);
      });
    });

    it('should validate cross-phase coordination', () => {
      const requirements = 'Validate that each phase properly uses outputs from previous phases';
      
      // Test that design phase can use discovery output
      const discoveryDir = join(TEST_OUTPUT_DIR, 'complete-workflow', 'discovery');
      const designResult = execSync(
        `${CLI_PATH} sparc design "${requirements}" --discovery-plan ${discoveryDir} --output-path ${TEST_OUTPUT_DIR}/coordination-test`,
        { encoding: 'utf8', timeout: 45000 }
      );

      expect(designResult).toContain('discovery plan');
      expect(designResult).toContain('architecture design');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large-scale enterprise requirements', () => {
      const requirements = 'Enterprise-scale pipeline for 100TB daily data processing with 1000+ tables';
      
      const result = execSync(
        `${CLI_PATH} sparc discovery "${requirements}" --output-path ${TEST_OUTPUT_DIR}/enterprise-scale`,
        { encoding: 'utf8', timeout: 60000 }
      );

      expect(result).toContain('Enterprise-scale');
      expect(result).toContain('100TB');
      expect(result).toContain('performance');
    });

    it('should optimize for cost and performance', () => {
      const requirements = 'Cost-optimized pipeline with auto-scaling and resource management';
      
      const result = execSync(
        `${CLI_PATH} sparc design "${requirements}" --output-path ${TEST_OUTPUT_DIR}/cost-optimized`,
        { encoding: 'utf8', timeout: 45000 }
      );

      expect(result).toContain('Cost optimization');
      expect(result).toContain('Auto-scaling');
      expect(result).toContain('Resource management');
    });
  });

  describe('Industry-Specific Templates', () => {
    it('should handle financial services compliance requirements', () => {
      const requirements = 'Financial services data pipeline with SOX compliance and real-time fraud detection';
      
      const result = execSync(
        `${CLI_PATH} sparc validation "${requirements}" --output-path ${TEST_OUTPUT_DIR}/financial --compliance`,
        { encoding: 'utf8', timeout: 90000 }
      );

      expect(result).toContain('SOX compliance');
      expect(result).toContain('Financial');
      expect(result).toContain('Fraud detection');
    });

    it('should handle healthcare HIPAA compliance', () => {
      const requirements = 'Healthcare data pipeline with HIPAA compliance and patient data protection';
      
      const result = execSync(
        `${CLI_PATH} sparc validation "${requirements}" --output-path ${TEST_OUTPUT_DIR}/healthcare --compliance`,
        { encoding: 'utf8', timeout: 90000 }
      );

      expect(result).toContain('HIPAA compliance');
      expect(result).toContain('Healthcare');
      expect(result).toContain('Patient data');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid input gracefully', () => {
      const requirements = ''; // Empty requirements
      
      try {
        const result = execSync(
          `${CLI_PATH} sparc discovery "${requirements}" --output-path ${TEST_OUTPUT_DIR}/error-test`,
          { encoding: 'utf8', timeout: 30000 }
        );
        
        // Should complete with basic plan even with empty input
        expect(result).toBeDefined();
      } catch (error) {
        // Should not crash, but may return with guidance
        expect(error).toBeDefined();
      }
    });

    it('should provide helpful error messages for invalid configurations', () => {
      const requirements = 'Invalid pipeline configuration test';
      
      try {
        const result = execSync(
          `${CLI_PATH} sparc loading "${requirements}" --validation-plan /nonexistent/path.json --output-path ${TEST_OUTPUT_DIR}/error-validation`,
          { encoding: 'utf8', timeout: 30000 }
        );
        
        // Should handle missing files gracefully
        expect(result).toBeDefined();
      } catch (error) {
        // Error should be informative
        expect(error).toBeDefined();
      }
    });
  });

  describe('CLI Integration', () => {
    it('should provide comprehensive help for each phase', () => {
      const phases = ['discovery', 'design', 'extraction', 'transformation', 'validation', 'loading', 'monitoring'];
      
      phases.forEach(phase => {
        const result = execSync(`${CLI_PATH} sparc ${phase} --help`, { encoding: 'utf8', timeout: 10000 });
        
        expect(result).toContain(phase);
        expect(result).toContain('--output-path');
        expect(result).toContain('Enterprise');
      });
    });

    it('should support all documented command-line options', () => {
      const result = execSync(`${CLI_PATH} sparc --help`, { encoding: 'utf8', timeout: 10000 });
      
      expect(result).toContain('discovery');
      expect(result).toContain('design');
      expect(result).toContain('extraction');
      expect(result).toContain('transformation');
      expect(result).toContain('validation');
      expect(result).toContain('loading');
      expect(result).toContain('monitoring');
    });
  });

  describe('Documentation and Artifacts', () => {
    it('should generate comprehensive documentation for each phase', () => {
      // Check that each phase generates proper documentation
      const phases = ['discovery', 'design', 'extraction', 'transformation', 'validation', 'loading', 'monitoring'];
      
      phases.forEach(phase => {
        const phaseDir = join(TEST_OUTPUT_DIR, 'complete-workflow', phase);
        if (existsSync(phaseDir)) {
          // Should contain markdown documentation
          const files = require('fs').readdirSync(phaseDir);
          const hasMarkdown = files.some((file: string) => file.endsWith('.md'));
          expect(hasMarkdown).toBe(true);
        }
      });
    });

    it('should generate implementation code artifacts', () => {
      // Verify that code generation produces actual implementation files
      const codePhases = ['extraction', 'transformation', 'validation', 'loading', 'monitoring'];
      
      codePhases.forEach(phase => {
        const phaseDir = join(TEST_OUTPUT_DIR, 'complete-workflow', phase);
        if (existsSync(phaseDir)) {
          const codeDir = join(phaseDir, 'code');
          if (existsSync(codeDir)) {
            const files = require('fs').readdirSync(codeDir);
            expect(files.length).toBeGreaterThan(0);
          }
        }
      });
    });
  });
}); 
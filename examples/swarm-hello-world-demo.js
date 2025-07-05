#!/usr/bin/env node

/**
 * Claude Flow Swarm Demonstration
 * 
 * This script demonstrates the full end-to-end functionality of the Claude Flow swarm system
 * with 10+ intelligent agents working together to build a comprehensive Hello World application.
 * 
 * Features demonstrated:
 * - Multi-agent coordination and task distribution
 * - Real-time monitoring and progress tracking
 * - Quality assurance and validation
 * - Code generation, testing, and documentation
 * - Performance metrics and reporting
 * 
 * Run: node examples/swarm-hello-world-demo.js
 */

import { SwarmCoordinator } from '../dist/coordination/swarm-coordinator.js';
import { Logger } from '../dist/core/logger.js';
import fs from 'fs/promises';
import path from 'path';

// Demo configuration
const DEMO_CONFIG = {
  swarmName: 'HelloWorldSwarm',
  agentCount: 12,
  outputDir: './examples/swarm-output',
  objective: {
    name: 'Comprehensive Hello World Application',
    description: `Create a comprehensive Hello World application with the following requirements:
    
    1. A main Node.js application with Express server
    2. Web interface with HTML, CSS, and JavaScript
    3. REST API endpoints for greeting functionality
    4. Unit tests and integration tests
    5. Documentation (README, API docs, deployment guide)
    6. Docker containerization
    7. CI/CD pipeline configuration
    8. Performance monitoring
    9. Security implementation
    10. Internationalization support
    
    Target directory: examples/swarm-output/hello-world-app
    
    Each agent should contribute their expertise to create a production-ready application.`
  },
  validation: {
    expectedFiles: [
      'package.json',
      'server.js',
      'public/index.html',
      'public/style.css',
      'public/script.js',
      'routes/api.js',
      'tests/unit.test.js',
      'tests/integration.test.js',
      'README.md',
      'docs/API.md',
      'docs/DEPLOYMENT.md',
      'Dockerfile',
      '.github/workflows/ci.yml',
      'config/monitoring.js',
      'middleware/security.js',
      'locales/en.json',
      'locales/es.json'
    ],
    qualityChecks: [
      'Server starts successfully',
      'API endpoints respond correctly',
      'Tests pass',
      'Documentation is complete',
      'Security measures implemented'
    ]
  }
};

class SwarmDemonstration {
  constructor() {
    this.logger = new Logger({ level: 'info', component: 'SwarmDemo' });
    this.coordinator = null;
    this.startTime = null;
    this.metrics = {
      agentsCreated: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      filesGenerated: 0,
      totalExecutionTime: 0,
      qualityScore: 0
    };
  }

  async run() {
    console.log('🚀 Starting Claude Flow Swarm Demonstration\n');
    console.log('=' .repeat(80));
    console.log(`Swarm Name: ${DEMO_CONFIG.swarmName}`);
    console.log(`Agent Count: ${DEMO_CONFIG.agentCount}`);
    console.log(`Output Directory: ${DEMO_CONFIG.outputDir}`);
    console.log('=' .repeat(80));
    console.log();

    this.startTime = Date.now();

    try {
      // Phase 1: Initialize Swarm
      await this.initializeSwarm();
      
      // Phase 2: Create and Register Agents
      await this.createAgents();
      
      // Phase 3: Execute Objective
      await this.executeObjective();
      
      // Phase 4: Monitor Progress
      await this.monitorProgress();
      
      // Phase 5: Validate Results
      await this.validateResults();
      
      // Phase 6: Generate Report
      await this.generateReport();
      
      console.log('\n🎉 Swarm demonstration completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Swarm demonstration failed:', error.message);
      throw error;
    } finally {
      if (this.coordinator) {
        await this.coordinator.shutdown();
      }
    }
  }

  async initializeSwarm() {
    console.log('📋 Phase 1: Initializing Swarm Coordinator...');
    
    this.coordinator = new SwarmCoordinator({
      name: DEMO_CONFIG.swarmName,
      description: 'Demonstration swarm for Hello World application development',
      maxAgents: DEMO_CONFIG.agentCount + 2, // Allow for scaling
      maxConcurrentTasks: DEMO_CONFIG.agentCount,
      maxDuration: 30 * 60 * 1000, // 30 minutes
      strategy: 'auto',
      mode: 'centralized',
      qualityThreshold: 0.8,
      reviewRequired: true,
      testingRequired: true,
      monitoring: {
        enabled: true,
        interval: 5000,
        metrics: ['performance', 'quality', 'progress']
      }
    });

    await this.coordinator.initialize();
    
    console.log('✅ Swarm coordinator initialized');
    console.log(`   Swarm ID: ${this.coordinator.getSwarmId().id}`);
    console.log(`   Mode: ${this.coordinator.getSwarmId().mode}`);
    console.log(`   Strategy: ${this.coordinator.getSwarmId().strategy}`);
    console.log();
  }

  async createAgents() {
    console.log('🤖 Phase 2: Creating and Registering Agents...');
    
    const agentTypes = [
      // Core development agents
      { type: 'architect', name: 'System Architect', capabilities: ['systemDesign', 'architecture', 'planning'] },
      { type: 'developer', name: 'Backend Developer', capabilities: ['nodeJs', 'express', 'apiDevelopment'] },
      { type: 'developer', name: 'Frontend Developer', capabilities: ['html', 'css', 'javascript', 'ui'] },
      { type: 'developer', name: 'Full-Stack Developer', capabilities: ['nodeJs', 'frontend', 'integration'] },
      
      // Quality and testing agents
      { type: 'tester', name: 'Unit Test Specialist', capabilities: ['jest', 'unitTesting', 'tdd'] },
      { type: 'tester', name: 'Integration Test Engineer', capabilities: ['integration', 'e2e', 'automation'] },
      { type: 'reviewer', name: 'Code Reviewer', capabilities: ['codeReview', 'qualityAssurance', 'bestPractices'] },
      
      // DevOps and infrastructure agents
      { type: 'devops', name: 'DevOps Engineer', capabilities: ['docker', 'ci/cd', 'deployment'] },
      { type: 'devops', name: 'Infrastructure Specialist', capabilities: ['monitoring', 'performance', 'scaling'] },
      
      // Documentation and security agents
      { type: 'documenter', name: 'Technical Writer', capabilities: ['documentation', 'api-docs', 'guides'] },
      { type: 'security', name: 'Security Specialist', capabilities: ['security', 'authentication', 'encryption'] },
      
      // Specialized agents
      { type: 'i18n', name: 'Internationalization Expert', capabilities: ['i18n', 'localization', 'accessibility'] }
    ];

    for (const agentConfig of agentTypes) {
      const agentId = await this.coordinator.registerAgent(
        agentConfig.name,
        agentConfig.type,
        {
          codeGeneration: true,
          codeReview: agentConfig.type === 'reviewer',
          testing: agentConfig.type === 'tester',
          documentation: agentConfig.type === 'documenter',
          analysis: true,
          fileSystem: true,
          terminalAccess: true,
          languages: ['javascript', 'html', 'css', 'json'],
          frameworks: ['express', 'jest', 'docker'],
          domains: agentConfig.capabilities,
          tools: ['create', 'edit', 'test', 'analyze'],
          maxConcurrentTasks: 2,
          reliability: 0.9,
          speed: 1.0,
          quality: 0.85
        }
      );

      this.metrics.agentsCreated++;
      console.log(`   ✅ ${agentConfig.name} (${agentConfig.type}) - ID: ${agentId}`);
    }

    console.log(`\n📊 Created ${this.metrics.agentsCreated} specialized agents`);
    console.log();
  }

  async executeObjective() {
    console.log('🎯 Phase 3: Executing Swarm Objective...');
    
    // Ensure output directory exists
    await fs.mkdir(DEMO_CONFIG.outputDir, { recursive: true });
    
    // Create the objective
    const objectiveId = await this.coordinator.createObjective(
      DEMO_CONFIG.objective.name,
      DEMO_CONFIG.objective.description,
      'auto',
      {
        minAgents: 8,
        maxAgents: DEMO_CONFIG.agentCount,
        agentTypes: ['architect', 'developer', 'tester', 'reviewer', 'devops', 'documenter', 'security'],
        estimatedDuration: 20 * 60 * 1000, // 20 minutes
        maxDuration: 30 * 60 * 1000, // 30 minutes
        qualityThreshold: 0.8,
        reviewCoverage: 0.9,
        testCoverage: 0.8
      }
    );

    console.log(`   📋 Objective created: ${objectiveId}`);
    
    // Start execution
    await this.coordinator.executeObjective(objectiveId);
    
    console.log('   🚀 Objective execution started');
    console.log('   📈 Agents are now working collaboratively...');
    console.log();
  }

  async monitorProgress() {
    console.log('📊 Phase 4: Monitoring Swarm Progress...');
    console.log('   (Real-time updates every 5 seconds)\n');
    
    const monitoringInterval = 5000; // 5 seconds
    const maxMonitoringTime = 25 * 60 * 1000; // 25 minutes
    let monitoringTime = 0;
    
    const progressInterval = setInterval(async () => {
      try {
        const status = this.coordinator.getSwarmStatus();
        const agents = this.coordinator.getAgents();
        const tasks = this.coordinator.getTasks();
        const objectives = this.coordinator.getObjectives();
        
        // Clear previous output and show current status
        process.stdout.write('\x1Bc'); // Clear screen
        
        console.log('🐝 Claude Flow Swarm - Real-time Status');
        console.log('=' .repeat(60));
        console.log(`Time Elapsed: ${Math.round(monitoringTime / 1000)}s`);
        console.log(`Swarm Status: ${this.getStatusEmoji(status.status)} ${status.status.toUpperCase()}`);
        console.log();
        
        // Agent status
        console.log('🤖 Agent Status:');
        const agentsByStatus = this.groupBy(agents, 'status');
        Object.entries(agentsByStatus).forEach(([status, agentList]) => {
          console.log(`   ${this.getStatusEmoji(status)} ${status}: ${agentList.length} agents`);
        });
        console.log();
        
        // Task progress
        console.log('📋 Task Progress:');
        const tasksByStatus = this.groupBy(tasks, 'status');
        Object.entries(tasksByStatus).forEach(([status, taskList]) => {
          console.log(`   ${this.getStatusEmoji(status)} ${status}: ${taskList.length} tasks`);
        });
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const failedTasks = tasks.filter(t => t.status === 'failed').length;
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        console.log(`   📊 Progress: ${progressPercent}% (${completedTasks}/${totalTasks})`);
        console.log();
        
        // Recent activity
        console.log('📈 Recent Activity:');
        const recentTasks = tasks
          .filter(t => t.completedAt && (Date.now() - t.completedAt.getTime()) < 30000)
          .slice(0, 3);
        
        if (recentTasks.length > 0) {
          recentTasks.forEach(task => {
            console.log(`   ✅ ${task.name} (${task.type})`);
          });
        } else {
          console.log('   🔄 Agents working...');
        }
        console.log();
        
        // Check if objective is complete
        const objective = objectives[0];
        if (objective && (objective.status === 'completed' || objective.status === 'failed')) {
          clearInterval(progressInterval);
          console.log(`🎯 Objective ${objective.status.toUpperCase()}!`);
          return;
        }
        
        // Update metrics
        this.metrics.tasksCompleted = completedTasks;
        this.metrics.tasksFailed = failedTasks;
        
        monitoringTime += monitoringInterval;
        
        // Stop monitoring after max time
        if (monitoringTime >= maxMonitoringTime) {
          clearInterval(progressInterval);
          console.log('⏰ Monitoring timeout reached');
        }
        
      } catch (error) {
        console.error('Monitoring error:', error.message);
      }
    }, monitoringInterval);
    
    // Wait for completion or timeout
    return new Promise((resolve) => {
      const checkCompletion = setInterval(() => {
        const objectives = this.coordinator.getObjectives();
        const objective = objectives[0];
        
        if (objective && (objective.status === 'completed' || objective.status === 'failed')) {
          clearInterval(checkCompletion);
          clearInterval(progressInterval);
          resolve();
        }
        
        if (monitoringTime >= maxMonitoringTime) {
          clearInterval(checkCompletion);
          clearInterval(progressInterval);
          resolve();
        }
      }, 1000);
    });
  }

  async validateResults() {
    console.log('\n🔍 Phase 5: Validating Results...');
    
    const outputPath = path.join(DEMO_CONFIG.outputDir, 'hello-world-app');
    const validationResults = {
      filesCreated: [],
      missingFiles: [],
      qualityChecks: [],
      overallScore: 0
    };
    
    // Check if output directory exists
    try {
      await fs.access(outputPath);
      console.log(`   ✅ Output directory exists: ${outputPath}`);
    } catch {
      console.log(`   ❌ Output directory missing: ${outputPath}`);
      return validationResults;
    }
    
    // Validate expected files
    console.log('\n   📁 File Validation:');
    for (const expectedFile of DEMO_CONFIG.validation.expectedFiles) {
      const filePath = path.join(outputPath, expectedFile);
      try {
        await fs.access(filePath);
        validationResults.filesCreated.push(expectedFile);
        console.log(`   ✅ ${expectedFile}`);
      } catch {
        validationResults.missingFiles.push(expectedFile);
        console.log(`   ❌ ${expectedFile} (missing)`);
      }
    }
    
    this.metrics.filesGenerated = validationResults.filesCreated.length;
    
    // Quality checks
    console.log('\n   🏆 Quality Validation:');
    
    // Check package.json
    try {
      const packagePath = path.join(outputPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.name && packageJson.scripts && packageJson.dependencies) {
        validationResults.qualityChecks.push('Package.json is well-formed');
        console.log('   ✅ Package.json is well-formed');
      }
    } catch {
      console.log('   ❌ Package.json validation failed');
    }
    
    // Check README
    try {
      const readmePath = path.join(outputPath, 'README.md');
      const readmeContent = await fs.readFile(readmePath, 'utf8');
      
      if (readmeContent.length > 500 && readmeContent.includes('Hello World')) {
        validationResults.qualityChecks.push('README is comprehensive');
        console.log('   ✅ README is comprehensive');
      }
    } catch {
      console.log('   ❌ README validation failed');
    }
    
    // Check server file
    try {
      const serverPath = path.join(outputPath, 'server.js');
      const serverContent = await fs.readFile(serverPath, 'utf8');
      
      if (serverContent.includes('express') && serverContent.includes('listen')) {
        validationResults.qualityChecks.push('Server implementation found');
        console.log('   ✅ Server implementation found');
      }
    } catch {
      console.log('   ❌ Server validation failed');
    }
    
    // Check tests
    try {
      const testsDir = path.join(outputPath, 'tests');
      const testFiles = await fs.readdir(testsDir);
      
      if (testFiles.length > 0) {
        validationResults.qualityChecks.push('Test files created');
        console.log('   ✅ Test files created');
      }
    } catch {
      console.log('   ❌ Test validation failed');
    }
    
    // Calculate overall score
    const fileScore = (validationResults.filesCreated.length / DEMO_CONFIG.validation.expectedFiles.length) * 100;
    const qualityScore = (validationResults.qualityChecks.length / DEMO_CONFIG.validation.qualityChecks.length) * 100;
    validationResults.overallScore = Math.round((fileScore + qualityScore) / 2);
    
    this.metrics.qualityScore = validationResults.overallScore;
    
    console.log(`\n   📊 Validation Summary:`);
    console.log(`   Files Created: ${validationResults.filesCreated.length}/${DEMO_CONFIG.validation.expectedFiles.length}`);
    console.log(`   Quality Checks: ${validationResults.qualityChecks.length}/${DEMO_CONFIG.validation.qualityChecks.length}`);
    console.log(`   Overall Score: ${validationResults.overallScore}%`);
    
    return validationResults;
  }

  async generateReport() {
    console.log('\n📄 Phase 6: Generating Final Report...');
    
    this.metrics.totalExecutionTime = Date.now() - this.startTime;
    
    const report = {
      demonstration: {
        name: DEMO_CONFIG.swarmName,
        timestamp: new Date().toISOString(),
        duration: this.metrics.totalExecutionTime,
        status: 'completed'
      },
      swarm: {
        id: this.coordinator.getSwarmId().id,
        agentsCreated: this.metrics.agentsCreated,
        agentsActive: this.coordinator.getAgents().filter(a => a.status === 'idle' || a.status === 'busy').length
      },
      execution: {
        tasksCompleted: this.metrics.tasksCompleted,
        tasksFailed: this.metrics.tasksFailed,
        filesGenerated: this.metrics.filesGenerated,
        qualityScore: this.metrics.qualityScore
      },
      performance: {
        executionTimeMinutes: Math.round(this.metrics.totalExecutionTime / 60000),
        tasksPerMinute: Math.round(this.metrics.tasksCompleted / (this.metrics.totalExecutionTime / 60000)),
        successRate: Math.round((this.metrics.tasksCompleted / (this.metrics.tasksCompleted + this.metrics.tasksFailed)) * 100)
      },
      agents: this.coordinator.getAgents().map(agent => ({
        id: agent.id.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        tasksCompleted: agent.metrics.tasksCompleted,
        tasksFailed: agent.metrics.tasksFailed,
        successRate: agent.metrics.successRate
      })),
      tasks: this.coordinator.getTasks().map(task => ({
        id: task.id.id,
        name: task.name,
        type: task.type,
        status: task.status,
        assignedTo: task.assignedTo?.id,
        duration: task.completedAt && task.startedAt ? 
          task.completedAt.getTime() - task.startedAt.getTime() : null
      }))
    };
    
    // Save report
    const reportPath = path.join(DEMO_CONFIG.outputDir, 'swarm-demonstration-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('🎉 SWARM DEMONSTRATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`📊 Execution Time: ${Math.round(this.metrics.totalExecutionTime / 60000)} minutes`);
    console.log(`🤖 Agents Created: ${this.metrics.agentsCreated}`);
    console.log(`✅ Tasks Completed: ${this.metrics.tasksCompleted}`);
    console.log(`❌ Tasks Failed: ${this.metrics.tasksFailed}`);
    console.log(`📁 Files Generated: ${this.metrics.filesGenerated}`);
    console.log(`🏆 Quality Score: ${this.metrics.qualityScore}%`);
    console.log(`📈 Success Rate: ${report.performance.successRate}%`);
    console.log('='.repeat(80));
    console.log(`📄 Full Report: ${reportPath}`);
    console.log(`📁 Output Directory: ${DEMO_CONFIG.outputDir}`);
    console.log('='.repeat(80));
    
    return report;
  }

  // Utility methods
  getStatusEmoji(status) {
    const emojis = {
      'idle': '💤',
      'busy': '🔄',
      'working': '⚡',
      'completed': '✅',
      'failed': '❌',
      'error': '🚨',
      'queued': '⏳',
      'running': '🏃',
      'assigned': '📋',
      'planning': '📝',
      'executing': '🚀'
    };
    return emojis[status] || '❓';
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }
}

// Run demonstration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new SwarmDemonstration();
  demo.run().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { SwarmDemonstration, DEMO_CONFIG };
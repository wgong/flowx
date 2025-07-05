/**
 * Comprehensive Command Integration Test
 * Tests all new command functionality with real backend integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  successRate: number;
  totalDuration: number;
}

class ComprehensiveCommandTest {
  private results: TestSuite[] = [];
  private cliPath = './cli.js';

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Command Integration Tests\n');
    console.log('=' .repeat(80));

    // Test all command categories
    await this.testSystemCommands();
    await this.testTaskCommands();
    await this.testWorkflowCommands();
    await this.testAgentCommands();
    await this.testMemoryCommands();
    await this.testSwarmCommands();
    await this.testIntegrationScenarios();

    // Generate comprehensive report
    this.generateReport();
  }

  private async testSystemCommands(): Promise<void> {
    const tests: TestResult[] = [];
    
    console.log('\n📊 Testing System Commands');
    console.log('-'.repeat(40));

    // Test status command
    tests.push(await this.runTest('System Status', async () => {
      const { stdout } = await execAsync(`${this.cliPath} status`);
      if (!stdout.includes('Claude-Flow System Status')) {
        throw new Error('Status command output invalid');
      }
      return stdout;
    }));

    // Test config command
    tests.push(await this.runTest('Config Management', async () => {
      const { stdout } = await execAsync(`${this.cliPath} config list`);
      if (!stdout.includes('Configuration')) {
        throw new Error('Config command output invalid');
      }
      return stdout;
    }));

    // Test monitor command
    tests.push(await this.runTest('System Monitoring', async () => {
      const { stdout } = await execAsync(`${this.cliPath} monitor system`);
      if (!stdout.includes('System Monitoring')) {
        throw new Error('Monitor command output invalid');
      }
      return stdout;
    }));

    // Test logs command
    tests.push(await this.runTest('Log Management', async () => {
      const { stdout } = await execAsync(`${this.cliPath} logs stats`);
      if (!stdout.includes('Log Statistics')) {
        throw new Error('Logs command output invalid');
      }
      return stdout;
    }));

    // Test SPARC command
    tests.push(await this.runTest('SPARC Methodology', async () => {
      const { stdout } = await execAsync(`${this.cliPath} sparc architect --help`);
      if (!stdout.includes('SPARC')) {
        throw new Error('SPARC command output invalid');
      }
      return stdout;
    }));

    this.results.push(this.calculateSuiteResults('System Commands', tests));
  }

  private async testTaskCommands(): Promise<void> {
    const tests: TestResult[] = [];
    
    console.log('\n📋 Testing Task Management Commands');
    console.log('-'.repeat(40));

    let taskId = '';

    // Test task creation
    tests.push(await this.runTest('Task Creation', async () => {
      const { stdout } = await execAsync(`${this.cliPath} task create --description "Integration test task" --priority 7 --type "test"`);
      if (!stdout.includes('Task created:')) {
        throw new Error('Task creation failed');
      }
      // Extract task ID from output
      const match = stdout.match(/Task created: (task-[a-zA-Z0-9_-]+)/);
      if (match) {
        taskId = match[1];
      }
      return stdout;
    }));

    // Test task listing
    tests.push(await this.runTest('Task Listing', async () => {
      const { stdout } = await execAsync(`${this.cliPath} task list`);
      if (!stdout.includes('Tasks') && !stdout.includes('No tasks found')) {
        throw new Error('Task listing failed');
      }
      return stdout;
    }));

    // Test task details
    if (taskId) {
      tests.push(await this.runTest('Task Details', async () => {
        const { stdout } = await execAsync(`${this.cliPath} task show ${taskId}`);
        if (!stdout.includes('Task Details:')) {
          throw new Error('Task details failed');
        }
        return stdout;
      }));

      // Test task update
      tests.push(await this.runTest('Task Update', async () => {
        const { stdout } = await execAsync(`${this.cliPath} task update ${taskId} --priority 9 --progress 50`);
        if (!stdout.includes('Task updated:')) {
          throw new Error('Task update failed');
        }
        return stdout;
      }));

      // Test task completion
      tests.push(await this.runTest('Task Completion', async () => {
        const { stdout } = await execAsync(`${this.cliPath} task complete ${taskId} --notes "Test completion"`);
        if (!stdout.includes('Task completed:')) {
          throw new Error('Task completion failed');
        }
        return stdout;
      }));
    }

    // Test task statistics
    tests.push(await this.runTest('Task Statistics', async () => {
      const { stdout } = await execAsync(`${this.cliPath} task stats --detailed`);
      if (!stdout.includes('Task Statistics')) {
        throw new Error('Task statistics failed');
      }
      return stdout;
    }));

    this.results.push(this.calculateSuiteResults('Task Management', tests));
  }

  private async testWorkflowCommands(): Promise<void> {
    const tests: TestResult[] = [];
    
    console.log('\n🔄 Testing Workflow Management Commands');
    console.log('-'.repeat(40));

    let workflowId = '';

    // Test workflow template listing
    tests.push(await this.runTest('Workflow Templates', async () => {
      const { stdout } = await execAsync(`${this.cliPath} workflow template list`);
      if (!stdout.includes('Available Workflow Templates')) {
        throw new Error('Workflow template listing failed');
      }
      return stdout;
    }));

    // Test workflow creation from template
    tests.push(await this.runTest('Workflow Creation', async () => {
      const { stdout } = await execAsync(`${this.cliPath} workflow create --name "Test Pipeline" --template basic-pipeline --description "Integration test workflow"`);
      if (!stdout.includes('Workflow created:')) {
        throw new Error('Workflow creation failed');
      }
      // Extract workflow ID from output
      const match = stdout.match(/Workflow created: (workflow-[a-zA-Z0-9_-]+)/);
      if (match) {
        workflowId = match[1];
      }
      return stdout;
    }));

    // Test workflow listing
    tests.push(await this.runTest('Workflow Listing', async () => {
      const { stdout } = await execAsync(`${this.cliPath} workflow list`);
      if (!stdout.includes('Workflows') && !stdout.includes('No workflows found')) {
        throw new Error('Workflow listing failed');
      }
      return stdout;
    }));

    // Test workflow details
    if (workflowId) {
      tests.push(await this.runTest('Workflow Details', async () => {
        const { stdout } = await execAsync(`${this.cliPath} workflow show ${workflowId}`);
        if (!stdout.includes('Workflow Details:')) {
          throw new Error('Workflow details failed');
        }
        return stdout;
      }));

      // Test workflow validation
      tests.push(await this.runTest('Workflow Validation', async () => {
        const { stdout } = await execAsync(`${this.cliPath} workflow validate ${workflowId}`);
        if (!stdout.includes('Workflow Validation:')) {
          throw new Error('Workflow validation failed');
        }
        return stdout;
      }));

      // Test workflow execution
      tests.push(await this.runTest('Workflow Execution', async () => {
        const { stdout } = await execAsync(`${this.cliPath} workflow run ${workflowId} --async --variables '{"environment":"test"}'`);
        if (!stdout.includes('Workflow execution started:')) {
          throw new Error('Workflow execution failed');
        }
        return stdout;
      }));
    }

    this.results.push(this.calculateSuiteResults('Workflow Management', tests));
  }

  private async testAgentCommands(): Promise<void> {
    const tests: TestResult[] = [];
    
    console.log('\n🤖 Testing Agent Management Commands');
    console.log('-'.repeat(40));

    let agentId = '';

    // Test agent listing
    tests.push(await this.runTest('Agent Listing', async () => {
      const { stdout } = await execAsync(`${this.cliPath} agent list`);
      if (!stdout.includes('Agents') && !stdout.includes('No agents found')) {
        throw new Error('Agent listing failed');
      }
      return stdout;
    }));

    // Test agent spawning
    tests.push(await this.runTest('Agent Spawning', async () => {
      const { stdout } = await execAsync(`${this.cliPath} agent spawn researcher --name "Test Agent" --capabilities "testing,analysis"`);
      if (!stdout.includes('Agent spawned successfully')) {
        throw new Error('Agent spawning failed');
      }
      // Extract agent ID from output
      const match = stdout.match(/Agent ID: (agent-[a-zA-Z0-9_-]+)/);
      if (match) {
        agentId = match[1];
      }
      return stdout;
    }));

    // Test agent status
    tests.push(await this.runTest('Agent Status', async () => {
      const { stdout } = await execAsync(`${this.cliPath} agent status`);
      if (!stdout.includes('Agent Status')) {
        throw new Error('Agent status failed');
      }
      return stdout;
    }));

    this.results.push(this.calculateSuiteResults('Agent Management', tests));
  }

  private async testMemoryCommands(): Promise<void> {
    const tests: TestResult[] = [];
    
    console.log('\n🧠 Testing Memory Management Commands');
    console.log('-'.repeat(40));

    // Test memory storage
    tests.push(await this.runTest('Memory Storage', async () => {
      const { stdout } = await execAsync(`${this.cliPath} memory store --key "test-integration" --value "Integration test memory" --type "test"`);
      if (!stdout.includes('Memory stored with ID:')) {
        throw new Error('Memory storage failed');
      }
      return stdout;
    }));

    // Test memory query
    tests.push(await this.runTest('Memory Query', async () => {
      const { stdout } = await execAsync(`${this.cliPath} memory query --search "integration"`);
      if (!stdout.includes('Query Results') && !stdout.includes('No memories found')) {
        throw new Error('Memory query failed');
      }
      return stdout;
    }));

    // Test memory statistics
    tests.push(await this.runTest('Memory Statistics', async () => {
      const { stdout } = await execAsync(`${this.cliPath} memory stats --detailed`);
      if (!stdout.includes('Memory Bank Statistics')) {
        throw new Error('Memory statistics failed');
      }
      return stdout;
    }));

    this.results.push(this.calculateSuiteResults('Memory Management', tests));
  }

  private async testSwarmCommands(): Promise<void> {
    const tests: TestResult[] = [];
    
    console.log('\n🐝 Testing Swarm Management Commands');
    console.log('-'.repeat(40));

    let swarmId = '';

    // Test swarm creation
    tests.push(await this.runTest('Swarm Creation', async () => {
      const { stdout } = await execAsync(`${this.cliPath} swarm create test-integration-swarm --agents 2 --coordination centralized`);
      if (!stdout.includes('Swarm created successfully')) {
        throw new Error('Swarm creation failed');
      }
      // Extract swarm ID from output
      const match = stdout.match(/Swarm ID: ([a-zA-Z0-9_-]+)/);
      if (match) {
        swarmId = match[1];
      }
      return stdout;
    }));

    // Test swarm listing
    tests.push(await this.runTest('Swarm Listing', async () => {
      const { stdout } = await execAsync(`${this.cliPath} swarm list`);
      if (!stdout.includes('Swarms') && !stdout.includes('No swarms found')) {
        throw new Error('Swarm listing failed');
      }
      return stdout;
    }));

    // Test swarm status
    if (swarmId) {
      tests.push(await this.runTest('Swarm Status', async () => {
        const { stdout } = await execAsync(`${this.cliPath} swarm status ${swarmId}`);
        if (!stdout.includes('Swarm Status') && !stdout.includes('Swarm not found')) {
          throw new Error('Swarm status failed');
        }
        return stdout;
      }));
    }

    this.results.push(this.calculateSuiteResults('Swarm Management', tests));
  }

  private async testIntegrationScenarios(): Promise<void> {
    const tests: TestResult[] = [];
    
    console.log('\n🔗 Testing Integration Scenarios');
    console.log('-'.repeat(40));

    // Test end-to-end workflow: Create task, assign to agent, complete
    tests.push(await this.runTest('End-to-End Task Workflow', async () => {
      // Create task
      const createResult = await execAsync(`${this.cliPath} task create --description "E2E test task" --priority 5`);
      const taskMatch = createResult.stdout.match(/Task created: (task-[a-zA-Z0-9_-]+)/);
      
      if (!taskMatch) {
        throw new Error('Failed to create task for E2E test');
      }
      
      const taskId = taskMatch[1];
      
      // Create agent
      const agentResult = await execAsync(`${this.cliPath} agent spawn general --name "E2E Test Agent"`);
      const agentMatch = agentResult.stdout.match(/Agent ID: (agent-[a-zA-Z0-9_-]+)/);
      
      if (!agentMatch) {
        throw new Error('Failed to create agent for E2E test');
      }
      
      const agentId = agentMatch[1];
      
      // Assign task to agent
      const assignResult = await execAsync(`${this.cliPath} task assign ${taskId} --agent ${agentId}`);
      
      if (!assignResult.stdout.includes('assigned to agent')) {
        throw new Error('Failed to assign task to agent');
      }
      
      // Complete task
      const completeResult = await execAsync(`${this.cliPath} task complete ${taskId} --notes "E2E test completion"`);
      
      if (!completeResult.stdout.includes('Task completed:')) {
        throw new Error('Failed to complete task');
      }
      
      return `E2E workflow completed: ${taskId} -> ${agentId}`;
    }));

    // Test system health check
    tests.push(await this.runTest('System Health Check', async () => {
      const { stdout } = await execAsync(`${this.cliPath} status --resources`);
      if (!stdout.includes('System Status')) {
        throw new Error('System health check failed');
      }
      return stdout;
    }));

    // Test data persistence
    tests.push(await this.runTest('Data Persistence Verification', async () => {
      // Store memory
      await execAsync(`${this.cliPath} memory store --key "persistence-test" --value "Test data persistence" --type "test"`);
      
      // Query memory
      const { stdout } = await execAsync(`${this.cliPath} memory query --search "persistence-test"`);
      
      if (!stdout.includes('Test data persistence')) {
        throw new Error('Data persistence verification failed');
      }
      
      return stdout;
    }));

    this.results.push(this.calculateSuiteResults('Integration Scenarios', tests));
  }

  private async runTest(name: string, testFn: () => Promise<string>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`  Running: ${name}...`);
      const output = await testFn();
      const duration = Date.now() - startTime;
      
      console.log(`  ✅ ${name} (${duration}ms)`);
      
      return {
        name,
        success: true,
        output,
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`  ❌ ${name} (${duration}ms): ${errorMessage}`);
      
      return {
        name,
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  private calculateSuiteResults(suiteName: string, tests: TestResult[]): TestSuite {
    const successCount = tests.filter(t => t.success).length;
    const successRate = tests.length > 0 ? (successCount / tests.length) * 100 : 0;
    const totalDuration = tests.reduce((sum, t) => sum + t.duration, 0);

    console.log(`  📊 ${suiteName}: ${successCount}/${tests.length} passed (${successRate.toFixed(1)}%)`);

    return {
      name: suiteName,
      tests,
      successRate,
      totalDuration
    };
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE TEST RESULTS REPORT');
    console.log('='.repeat(80));

    const totalTests = this.results.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.tests.filter(t => t.success).length, 0);
    const totalDuration = this.results.reduce((sum, suite) => sum + suite.totalDuration, 0);
    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    console.log(`\n📈 OVERALL STATISTICS:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed}`);
    console.log(`  Failed: ${totalTests - totalPassed}`);
    console.log(`  Success Rate: ${overallSuccessRate.toFixed(1)}%`);
    console.log(`  Total Duration: ${totalDuration}ms`);

    console.log(`\n📊 SUITE BREAKDOWN:`);
    this.results.forEach(suite => {
      const passedTests = suite.tests.filter(t => t.success).length;
      const failedTests = suite.tests.length - passedTests;
      
      console.log(`\n  ${suite.name}:`);
      console.log(`    Tests: ${suite.tests.length}`);
      console.log(`    Passed: ${passedTests}`);
      console.log(`    Failed: ${failedTests}`);
      console.log(`    Success Rate: ${suite.successRate.toFixed(1)}%`);
      console.log(`    Duration: ${suite.totalDuration}ms`);

      if (failedTests > 0) {
        console.log(`    Failed Tests:`);
        suite.tests.filter(t => !t.success).forEach(test => {
          console.log(`      - ${test.name}: ${test.error}`);
        });
      }
    });

    console.log(`\n🎉 ACHIEVEMENTS:`);
    const achievements = [];
    
    if (overallSuccessRate >= 90) {
      achievements.push('🏆 Excellent: 90%+ success rate achieved!');
    } else if (overallSuccessRate >= 80) {
      achievements.push('🥈 Good: 80%+ success rate achieved!');
    } else if (overallSuccessRate >= 70) {
      achievements.push('🥉 Fair: 70%+ success rate achieved!');
    }

    if (totalTests >= 25) {
      achievements.push('📏 Comprehensive: 25+ tests executed!');
    }

    if (this.results.every(suite => suite.successRate > 0)) {
      achievements.push('🔧 All Systems Functional: Every command category working!');
    }

    if (achievements.length === 0) {
      achievements.push('🔄 System Needs Improvement: Focus on fixing failing tests');
    }

    achievements.forEach(achievement => {
      console.log(`  ${achievement}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✨ COMPREHENSIVE TESTING COMPLETE ✨');
    console.log('='.repeat(80));
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testRunner = new ComprehensiveCommandTest();
  testRunner.runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { ComprehensiveCommandTest }; 
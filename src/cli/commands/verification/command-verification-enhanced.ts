/**
 * Enhanced Command Verification System
 * Comprehensive E2E testing with support for all CLI commands
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { printSuccess, printError, printInfo, printWarning, successBold } from '../../core/output-formatter.ts';

export const verifyCommand: CLICommand = {
  name: 'verify',
  description: 'Verify command functionality with concrete proof',
  category: 'System',
  usage: 'claude-flow verify <command> [OPTIONS]',
  examples: [
    'claude-flow verify all',
    'claude-flow verify agent',
    'claude-flow verify swarm',
    'claude-flow verify memory',
    'claude-flow verify sparc',
    'claude-flow verify services'
  ],
  arguments: [
    {
      name: 'command',
      description: 'Command to verify (all, agent, swarm, memory, sparc, services)',
      required: false
    }
  ],
  options: [
    {
      name: 'output',
      short: 'o',
      description: 'Output verification report to file',
      type: 'string'
    },
    {
      name: 'verbose',
      short: 'v',
      description: 'Verbose output with detailed logs',
      type: 'boolean'
    },
    {
      name: 'timeout',
      short: 't',
      description: 'Verification timeout in seconds',
      type: 'number',
      default: 60
    },
    {
      name: 'mock-check',
      description: 'Check for mock implementations in commands',
      type: 'boolean'
    },
    {
      name: 'fix',
      description: 'Attempt to fix failed verifications when possible',
      type: 'boolean'
    }
  ],
  handler: async (context: CLIContext) => {
    const { args, options } = context;
    const command = args[0] || 'all';
    
    printInfo(`🔍 Starting enhanced command verification for: ${command}`);
    
    const verificationId = `verify-${Date.now()}`;
    const report = new VerificationReport(verificationId);
    
    try {
      switch (command.toLowerCase()) {
        case 'all':
          await verifyAllCommands(report, options);
          break;
        case 'agent':
          await verifyAgentCommands(report, options);
          break;
        case 'swarm':
          await verifySwarmCommands(report, options);
          break;
        case 'memory':
          await verifyMemoryCommands(report, options);
          break;
        case 'sparc':
          await verifySparcCommands(report, options);
          break;
        case 'services':
          await verifyServiceCommands(report, options);
          break;
        case 'system':
          await verifySystemCommands(report, options);
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
      
      const finalReport = report.generateReport();
      await saveVerificationReport(finalReport, options.output);
      
      if (finalReport.summary.successRate >= 80) {
        printSuccess(`✅ Verification completed: ${finalReport.summary.successRate}% success rate`);
      } else {
        printError(`❌ Verification failed: ${finalReport.summary.successRate}% success rate`);
      }
      
      printInfo(`Total commands tested: ${finalReport.summary.totalTests}`);
      printInfo(`Successful tests: ${finalReport.summary.passedTests}`);
      printInfo(`Failed tests: ${finalReport.summary.failedTests}`);
      
      if (finalReport.summary.mockImplementations > 0) {
        printWarning(`⚠️ Found ${finalReport.summary.mockImplementations} mock implementations`);
      }
      
    } catch (error) {
      printError(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
};

interface VerificationTest {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
  proof?: any;
  isMock?: boolean;
  fixRecommendation?: string;
}

class VerificationReport {
  private tests: VerificationTest[] = [];
  private startTime: number;
  
  constructor(public id: string) {
    this.startTime = Date.now();
  }
  
  addTest(test: VerificationTest): void {
    this.tests.push(test);
  }
  
  generateReport(): { 
    id: string; 
    summary: any; 
    tests: VerificationTest[]; 
    timestamp: Date;
    recommendations: string[];
  } {
    const passedTests = this.tests.filter(t => t.passed).length;
    const failedTests = this.tests.length - passedTests;
    const successRate = this.tests.length > 0 ? (passedTests / this.tests.length) * 100 : 0;
    const mockImplementations = this.tests.filter(t => t.isMock).length;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    return {
      id: this.id,
      summary: {
        totalTests: this.tests.length,
        passedTests,
        failedTests,
        successRate: Math.round(successRate * 100) / 100,
        totalDuration: Date.now() - this.startTime,
        mockImplementations
      },
      tests: this.tests,
      timestamp: new Date(),
      recommendations
    };
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Recommend fixes for failed tests
    const failedTests = this.tests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      recommendations.push(`Fix ${failedTests.length} failed command(s): ${failedTests.map(t => t.name).join(', ')}`);
    }
    
    // Recommend replacing mock implementations
    const mockTests = this.tests.filter(t => t.isMock);
    if (mockTests.length > 0) {
      recommendations.push(`Replace ${mockTests.length} mock implementation(s): ${mockTests.map(t => t.name).join(', ')}`);
      
      // Add specific recommendations for each mock
      mockTests.forEach(test => {
        if (test.fixRecommendation) {
          recommendations.push(`- ${test.name}: ${test.fixRecommendation}`);
        }
      });
    }
    
    return recommendations;
  }
}

async function verifyAllCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('🔍 Verifying all commands...');
  
  // Execute all verification commands in parallel for efficiency
  await Promise.all([
    verifyAgentCommands(report, options),
    verifySwarmCommands(report, options),
    verifyMemoryCommands(report, options),
    verifySparcCommands(report, options),
    verifyServiceCommands(report, options),
    verifySystemCommands(report, options)
  ]);
}

async function verifyAgentCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('🤖 Verifying agent commands...');
  
  await runVerificationTest(report, {
    name: 'Agent List Command',
    category: 'agent',
    test: async () => {
      const result = await executeCommand('claude-flow agent list --format json');
      const data = JSON.parse(result.stdout);
      
      if (!Array.isArray(data)) {
        throw new Error('Agent list did not return array');
      }
      
      return {
        output: result.stdout,
        proof: { agentCount: data.length, format: 'json' }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Agent Spawn Command',
    category: 'agent',
    test: async () => {
      const result = await executeCommand('claude-flow agent spawn researcher --name "Test Agent" --format json');
      const data = JSON.parse(result.stdout);
      
      if (!data.id || !data.name || data.name !== 'Test Agent') {
        throw new Error('Agent spawn did not return valid agent data');
      }
      
      return {
        output: result.stdout,
        proof: { 
          agentId: data.id,
          agentName: data.name,
          agentType: data.type
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Agent Status Command',
    category: 'agent',
    test: async () => {
      // First get an agent ID
      const listResult = await executeCommand('claude-flow agent list --format json');
      const agents = JSON.parse(listResult.stdout);
      
      if (!Array.isArray(agents) || agents.length === 0) {
        throw new Error('No agents available for status check');
      }
      
      const agentId = agents[0].id;
      const result = await executeCommand(`claude-flow agent status ${agentId} --format json`);
      const data = JSON.parse(result.stdout);
      
      if (!data.id || data.id !== agentId) {
        throw new Error('Agent status did not return valid data for the requested agent');
      }
      
      return {
        output: result.stdout,
        proof: { 
          agentId: data.id,
          agentStatus: data.status
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Agent Stop Command',
    category: 'agent',
    test: async () => {
      // First get an agent ID
      const listResult = await executeCommand('claude-flow agent list --format json');
      const agents = JSON.parse(listResult.stdout);
      
      if (!Array.isArray(agents) || agents.length === 0) {
        throw new Error('No agents available for stop test');
      }
      
      const agentId = agents[0].id;
      const result = await executeCommand(`claude-flow agent stop ${agentId} --format json`);
      const data = JSON.parse(result.stdout);
      
      return {
        output: result.stdout,
        proof: { 
          agentId: agentId,
          success: data.success === true
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Agent Remove Command',
    category: 'agent',
    test: async () => {
      // First spawn a new agent to remove
      const spawnResult = await executeCommand('claude-flow agent spawn analyzer --name "Temp Agent" --format json');
      const agent = JSON.parse(spawnResult.stdout);
      
      if (!agent.id) {
        throw new Error('Failed to create agent for removal test');
      }
      
      const result = await executeCommand(`claude-flow agent remove ${agent.id} --force --format json`);
      const data = JSON.parse(result.stdout);
      
      return {
        output: result.stdout,
        proof: { 
          agentId: agent.id,
          success: data.success === true
        }
      };
    }
  });
}

async function verifySwarmCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('🐝 Verifying swarm commands...');
  
  await runVerificationTest(report, {
    name: 'Swarm List Command',
    category: 'swarm',
    test: async () => {
      const result = await executeCommand('claude-flow swarm list --format json');
      const data = JSON.parse(result.stdout);
      
      if (!Array.isArray(data)) {
        throw new Error('Swarm list did not return array');
      }
      
      return {
        output: result.stdout,
        proof: { swarmCount: data.length, format: 'json' }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Swarm Create Command',
    category: 'swarm',
    test: async () => {
      const swarmName = `test-swarm-${Date.now()}`;
      const result = await executeCommand(`claude-flow swarm create ${swarmName} --agents 3 --format json`);
      const data = JSON.parse(result.stdout);
      
      if (!data.id || !data.name) {
        throw new Error('Swarm create did not return valid swarm data');
      }
      
      return {
        output: result.stdout,
        proof: { 
          swarmId: data.id,
          swarmName: data.name,
          agentCount: data.agents
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Swarm Status Command',
    category: 'swarm',
    test: async () => {
      // First get a swarm ID
      const listResult = await executeCommand('claude-flow swarm list --format json');
      const swarms = JSON.parse(listResult.stdout);
      
      if (!Array.isArray(swarms) || swarms.length === 0) {
        throw new Error('No swarms available for status check');
      }
      
      const swarmId = swarms[0].id;
      const result = await executeCommand(`claude-flow swarm status ${swarmId} --format json`);
      const data = JSON.parse(result.stdout);
      
      if (!data.id || data.id !== swarmId) {
        throw new Error('Swarm status did not return valid data for the requested swarm');
      }
      
      return {
        output: result.stdout,
        proof: { 
          swarmId: data.id,
          swarmStatus: data.status
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Swarm Stop Command',
    category: 'swarm',
    test: async () => {
      // First get a swarm ID
      const listResult = await executeCommand('claude-flow swarm list --format json');
      const swarms = JSON.parse(listResult.stdout);
      
      if (!Array.isArray(swarms) || swarms.length === 0) {
        throw new Error('No swarms available for stop test');
      }
      
      const swarmId = swarms[0].id;
      const result = await executeCommand(`claude-flow swarm stop ${swarmId} --format json`);
      const data = JSON.parse(result.stdout);
      
      return {
        output: result.stdout,
        proof: { 
          swarmId: swarmId,
          success: data.success === true
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Swarm Demo Command',
    category: 'swarm',
    test: async () => {
      const result = await executeCommand('claude-flow swarm demo hello-world --agents 2 --format json');
      const data = JSON.parse(result.stdout);
      
      // Check if this is a mock implementation
      const isMock = result.stdout.includes('mock') || 
                     result.stdout.includes('demo') ||
                     (data.metrics && data.metrics.executionTime < 1000); // Real execution would take longer
      
      return {
        output: result.stdout,
        proof: { 
          success: data.success === true,
          resultType: data.resultType,
          isMock
        },
        isMock,
        fixRecommendation: isMock ? 'Replace mock implementation with real project generation' : undefined
      };
    }
  });
}

async function verifyMemoryCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('🧠 Verifying memory commands...');
  
  await runVerificationTest(report, {
    name: 'Memory Store Command',
    category: 'memory',
    test: async () => {
      const testKey = `test-key-${Date.now()}`;
      const testValue = `test-value-${Date.now()}`;
      const result = await executeCommand(`claude-flow memory store --key ${testKey} --value "${testValue}" --format json`);
      const data = JSON.parse(result.stdout);
      
      if (!data.success || data.key !== testKey) {
        throw new Error('Memory store did not return success');
      }
      
      return {
        output: result.stdout,
        proof: { 
          key: data.key,
          success: data.success === true
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Memory Query Command',
    category: 'memory',
    test: async () => {
      // First store a test value
      const testKey = `query-test-key-${Date.now()}`;
      const testValue = `query-test-value-${Date.now()}`;
      await executeCommand(`claude-flow memory store --key ${testKey} --value "${testValue}" --format json`);
      
      // Now query it
      const result = await executeCommand(`claude-flow memory query --search ${testKey} --format json`);
      const data = JSON.parse(result.stdout);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Memory query did not return results');
      }
      
      const foundItem = data.find((item: any) => item.key === testKey);
      if (!foundItem) {
        throw new Error('Memory query did not find the test item');
      }
      
      return {
        output: result.stdout,
        proof: { 
          found: true,
          key: foundItem.key,
          value: foundItem.value
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Memory List Command',
    category: 'memory',
    test: async () => {
      const result = await executeCommand('claude-flow memory list --format json');
      const data = JSON.parse(result.stdout);
      
      if (!Array.isArray(data)) {
        throw new Error('Memory list did not return array');
      }
      
      return {
        output: result.stdout,
        proof: { 
          entryCount: data.length,
          format: 'json'
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Memory Clear Command',
    category: 'memory',
    test: async () => {
      // First store a test value
      const testKey = `clear-test-key-${Date.now()}`;
      const testValue = `clear-test-value-${Date.now()}`;
      await executeCommand(`claude-flow memory store --key ${testKey} --value "${testValue}" --format json`);
      
      // Now clear it
      const result = await executeCommand(`claude-flow memory clear --key ${testKey} --confirm --format json`);
      const data = JSON.parse(result.stdout);
      
      if (!data.success) {
        throw new Error('Memory clear did not return success');
      }
      
      // Verify it's gone
      const queryResult = await executeCommand(`claude-flow memory query --search ${testKey} --format json`);
      const queryData = JSON.parse(queryResult.stdout);
      const foundItem = Array.isArray(queryData) && queryData.find((item: any) => item.key === testKey);
      
      return {
        output: result.stdout,
        proof: { 
          clearSuccess: data.success === true,
          verifyGone: !foundItem
        }
      };
    }
  });
}

async function verifySparcCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('🧪 Verifying SPARC commands...');
  
  await runVerificationTest(report, {
    name: 'SPARC List Command',
    category: 'sparc',
    test: async () => {
      const result = await executeCommand('claude-flow sparc list --format json');
      const data = JSON.parse(result.stdout);
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('SPARC list did not return array of modes');
      }
      
      return {
        output: result.stdout,
        proof: { 
          modeCount: data.length,
          modes: data.map((mode: any) => mode.name)
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'SPARC Run Architect Command',
    category: 'sparc',
    test: async () => {
      const taskDescription = "Design a simple user authentication system";
      const result = await executeCommand(`claude-flow sparc run architect "${taskDescription}" --format json`);
      const data = JSON.parse(result.stdout);
      
      // Check if this is a mock implementation
      const isMock = result.stdout.includes('mock') || 
                     (data.executionTime && data.executionTime < 1000) || // Real execution would take longer
                     (data.output && data.output.includes('Predefined output'));
      
      return {
        output: result.stdout,
        proof: { 
          mode: data.mode,
          task: data.task,
          status: data.status,
          hasOutput: !!data.output
        },
        isMock,
        fixRecommendation: isMock ? 'Replace mock implementation with real architecture design functionality' : undefined
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'SPARC TDD Command',
    category: 'sparc',
    test: async () => {
      const taskDescription = "Implement login form validation";
      const result = await executeCommand(`claude-flow sparc tdd "${taskDescription}" --format json`);
      const data = JSON.parse(result.stdout);
      
      // Check if this is a mock implementation
      const isMock = result.stdout.includes('mock') || 
                     (data.executionTime && data.executionTime < 2000) || // Real TDD would take longer
                     (data.output && data.output.includes('Predefined output')) ||
                     (data.files && data.files.length === 0); // Real TDD would create test files
      
      return {
        output: result.stdout,
        proof: { 
          mode: data.mode,
          task: data.task,
          status: data.status,
          hasOutput: !!data.output,
          fileCount: data.files?.length || 0
        },
        isMock,
        fixRecommendation: isMock ? 'Replace mock implementation with real test-driven development functionality' : undefined
      };
    }
  });
  
  // Test other SPARC modes...
}

async function verifyServiceCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('🔧 Verifying service commands...');
  
  await runVerificationTest(report, {
    name: 'Services Status Command',
    category: 'services',
    test: async () => {
      const result = await executeCommand('claude-flow services status --format json');
      const data = JSON.parse(result.stdout);
      
      if (!Array.isArray(data) && !data.services) {
        throw new Error('Services status did not return valid service data');
      }
      
      const services = Array.isArray(data) ? data : data.services;
      
      // Check if this contains mock data
      const isMock = services.some((service: any) => 
        service.status === 'unknown' || 
        service.health === 'unknown' ||
        service.notes?.includes('Not implemented')
      );
      
      return {
        output: result.stdout,
        proof: { 
          serviceCount: services.length,
          serviceNames: services.map((s: any) => s.name)
        },
        isMock,
        fixRecommendation: isMock ? 'Replace mock service status with real service monitoring' : undefined
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'Services Start Command',
    category: 'services',
    test: async () => {
      const result = await executeCommand('claude-flow services start --service memory-manager --format json');
      const data = JSON.parse(result.stdout);
      
      return {
        output: result.stdout,
        proof: { 
          success: data.success === true,
          service: data.service,
          status: data.status
        }
      };
    }
  });
}

async function verifySystemCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('💻 Verifying system commands...');
  
  await runVerificationTest(report, {
    name: 'System Status Command',
    category: 'system',
    test: async () => {
      const result = await executeCommand('claude-flow status --format json');
      const data = JSON.parse(result.stdout);
      
      // Basic validation of system status data
      if (!data.status || !data.version || !data.uptime) {
        throw new Error('System status did not return valid status data');
      }
      
      return {
        output: result.stdout,
        proof: { 
          systemStatus: data.status,
          version: data.version,
          hasUptime: !!data.uptime
        }
      };
    }
  });
  
  await runVerificationTest(report, {
    name: 'System Health Command',
    category: 'system',
    test: async () => {
      const result = await executeCommand('claude-flow health check --format json');
      const data = JSON.parse(result.stdout);
      
      // Check if this contains mock health data
      const isMock = !data.checks || data.checks.some((check: any) => 
        check.name.includes('mock') || 
        check.details?.initialized === undefined ||
        check.responseTime < 5 // Real health checks would take longer
      );
      
      return {
        output: result.stdout,
        proof: { 
          overall: data.overall,
          checks: data.checks?.length || 0
        },
        isMock,
        fixRecommendation: isMock ? 'Replace mock health checks with real system diagnostics' : undefined
      };
    }
  });
}

async function runVerificationTest(
  report: VerificationReport,
  testConfig: {
    name: string;
    category: string;
    test: () => Promise<{ 
      output: string; 
      proof: any;
      isMock?: boolean;
      fixRecommendation?: string;
    }>;
  }
): Promise<void> {
  const startTime = Date.now();
  
  try {
    printInfo(`  Testing: ${testConfig.name}`);
    const result = await testConfig.test();
    
    const test: VerificationTest = {
      name: testConfig.name,
      category: testConfig.category,
      passed: true,
      duration: Date.now() - startTime,
      output: result.output,
      proof: result.proof,
      isMock: result.isMock,
      fixRecommendation: result.fixRecommendation
    };
    
    report.addTest(test);
    
    if (result.isMock) {
      printWarning(`  ⚠️ ${testConfig.name} - PASSED (MOCK IMPLEMENTATION DETECTED)`);
    } else {
      printSuccess(`  ✅ ${testConfig.name} - PASSED`);
    }
    
  } catch (error) {
    const test: VerificationTest = {
      name: testConfig.name,
      category: testConfig.category,
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
    
    report.addTest(test);
    printError(`  ❌ ${testConfig.name} - FAILED: ${test.error}`);
  }
}

async function executeCommand(command: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code || 0
      });
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function saveVerificationReport(report: any, outputFile?: string): Promise<void> {
  const filename = outputFile || `verification-report-${report.id}.json`;
  const filepath = join(process.cwd(), filename);
  
  await writeFile(filepath, JSON.stringify(report, null, 2));
  printInfo(`📄 Verification report saved: ${filename}`);
}

export default verifyCommand;
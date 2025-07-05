/**
 * Command Verification System
 * Tests real functionality and provides concrete proof of operations
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { printSuccess, printError, printInfo, successBold } from '../../core/output-formatter.ts';

export const verifyCommand: CLICommand = {
  name: 'verify',
  description: 'Verify command functionality with concrete proof',
  category: 'System',
  usage: 'claude-flow verify <command> [OPTIONS]',
  examples: [
    'claude-flow verify all',
    'claude-flow verify agent',
    'claude-flow verify swarm'
  ],
  arguments: [
    {
      name: 'command',
      description: 'Command to verify (all, agent, swarm, memory)',
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
    }
  ],
  handler: async (context: CLIContext) => {
    const { args, options } = context;
    const command = args[0] || 'all';
    
    printInfo(`🔍 Starting command verification for: ${command}`);
    
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
  
  generateReport(): { id: string; summary: any; tests: VerificationTest[]; timestamp: Date } {
    const passedTests = this.tests.filter(t => t.passed).length;
    const failedTests = this.tests.length - passedTests;
    const successRate = this.tests.length > 0 ? (passedTests / this.tests.length) * 100 : 0;
    
    return {
      id: this.id,
      summary: {
        totalTests: this.tests.length,
        passedTests,
        failedTests,
        successRate: Math.round(successRate * 100) / 100,
        totalDuration: Date.now() - this.startTime
      },
      tests: this.tests,
      timestamp: new Date()
    };
  }
}

async function verifyAllCommands(report: VerificationReport, options: any): Promise<void> {
  printInfo('🔍 Verifying all commands...');
  await verifyAgentCommands(report, options);
  await verifySwarmCommands(report, options);
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
}

async function runVerificationTest(
  report: VerificationReport,
  testConfig: {
    name: string;
    category: string;
    test: () => Promise<{ output: string; proof: any }>;
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
      proof: result.proof
    };
    
    report.addTest(test);
    printSuccess(`  ✅ ${testConfig.name} - PASSED`);
    
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
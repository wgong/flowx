#!/usr/bin/env tsx

/**
 * End-to-End Test for Built and Installed FlowX Application
 * 
 * This script tests the globally installed flowx command to ensure:
 * - The build process works correctly
 * - The CLI is properly installed and accessible
 * - All major functionality works in the built version
 * - The distribution process is complete and functional
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function header(text: string): void {
  console.log('\n' + colorize('━'.repeat(80), 'cyan'));
  console.log(colorize(`🚀 ${text}`, 'cyan'));
  console.log(colorize('━'.repeat(80), 'cyan'));
}

function success(text: string): void {
  console.log(colorize(`✅ ${text}`, 'green'));
}

function error(text: string): void {
  console.log(colorize(`❌ ${text}`, 'red'));
}

function warning(text: string): void {
  console.log(colorize(`⚠️  ${text}`, 'yellow'));
}

function info(text: string): void {
  console.log(colorize(`ℹ️  ${text}`, 'blue'));
}

interface E2ETestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: string;
}

class BuiltAppE2ETester {
  private results: E2ETestResult[] = [];
  private cliCommand = 'flowx';

  async runCommand(command: string, timeout: number = 10000): Promise<{ stdout: string; stderr: string; duration: number }> {
    const startTime = Date.now();
    try {
      const { stdout, stderr } = await execAsync(command, { timeout, encoding: 'utf8' });
      const duration = Date.now() - startTime;
      return { stdout, stderr, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      throw { ...error, duration };
    }
  }

  async runTest(testName: string, command: string, timeout: number = 10000): Promise<E2ETestResult> {
    info(`Running: ${testName}`);
    
    try {
      const { stdout, stderr, duration } = await this.runCommand(command, timeout);
      const output = stdout + stderr;
      
      const result: E2ETestResult = {
        testName,
        passed: true,
        duration,
        output: output.substring(0, 500) // Truncate for readability
      };
      
      this.results.push(result);
      success(`${testName} (${duration}ms)`);
      return result;
      
    } catch (err: any) {
      const result: E2ETestResult = {
        testName,
        passed: false,
        duration: err.duration || 0,
        error: err.message || String(err)
      };
      
      this.results.push(result);
      error(`${testName} (${result.duration}ms): ${result.error}`);
      return result;
    }
  }

  async testInstallation(): Promise<void> {
    header('TESTING INSTALLATION');
    
    // Test 1: Command exists
    await this.runTest('Command exists', 'which flowx');
    
    // Test 2: Command is executable
    await this.runTest('Command is executable', 'flowx --version');
    
    // Test 3: Help system works
    await this.runTest('Help system works', 'flowx --help');
  }

  async testCoreCommands(): Promise<void> {
    header('TESTING CORE COMMANDS');
    
    // Test help commands (fast)
    await this.runTest('Agent help', 'flowx agent --help');
    await this.runTest('Status help', 'flowx status --help');
    await this.runTest('Config help', 'flowx config --help');
    await this.runTest('Task help', 'flowx task --help');
    await this.runTest('Workflow help', 'flowx workflow --help');
    await this.runTest('Swarm help', 'flowx swarm --help');
    await this.runTest('Monitor help', 'flowx monitor --help');
    await this.runTest('Scale help', 'flowx scale --help');
    await this.runTest('Terminal help', 'flowx terminal --help');
  }

  async testFunctionalCommands(): Promise<void> {
    header('TESTING FUNCTIONAL COMMANDS');
    
    // Test functional commands (slower, need longer timeouts)
    await this.runTest('Agent list', 'flowx agent list', 25000);
    await this.runTest('Task list', 'flowx task list', 25000);
    await this.runTest('Config list', 'flowx config list', 25000);
  }

  async testSystemIntegration(): Promise<void> {
    header('TESTING SYSTEM INTEGRATION');
    
    // Test system status (longest timeout)
    await this.runTest('System status', 'flowx status', 50000);
  }

  async testBuildIntegrity(): Promise<void> {
    header('TESTING BUILD INTEGRITY');
    
    // Test that the built version uses the same code as dev version
    info('Comparing built vs dev version outputs...');
    
    try {
      const builtHelp = await this.runCommand('flowx --help');
      const devHelp = await this.runCommand('npx tsx src/cli/main.ts --help');
      
      // Compare key sections
      const builtVersion = builtHelp.stdout.match(/claude-flow v[\d.]+/)?.[0];
      const devVersion = devHelp.stdout.match(/claude-flow v[\d.]+/)?.[0];
      
      if (builtVersion === devVersion) {
        success(`Version consistency: ${builtVersion}`);
        this.results.push({
          testName: 'Version consistency',
          passed: true,
          duration: builtHelp.duration + devHelp.duration
        });
      } else {
        error(`Version mismatch: built=${builtVersion}, dev=${devVersion}`);
        this.results.push({
          testName: 'Version consistency',
          passed: false,
          duration: builtHelp.duration + devHelp.duration,
          error: 'Version mismatch between built and dev versions'
        });
      }
      
    } catch (err) {
      error(`Build integrity check failed: ${err}`);
      this.results.push({
        testName: 'Build integrity',
        passed: false,
        duration: 0,
        error: String(err)
      });
    }
  }

  async testPerformance(): Promise<void> {
    header('TESTING PERFORMANCE');
    
    // Test startup performance
    const startupTests = [
      'flowx --help',
      'flowx agent --help',
      'flowx status --help',
      'flowx config --help'
    ];
    
    const startupTimes: number[] = [];
    
    for (const cmd of startupTests) {
      try {
        const { duration } = await this.runCommand(cmd);
        startupTimes.push(duration);
      } catch (err) {
        warning(`Performance test failed for: ${cmd}`);
      }
    }
    
    if (startupTimes.length > 0) {
      const avgStartup = Math.round(startupTimes.reduce((a, b) => a + b, 0) / startupTimes.length);
      const maxStartup = Math.max(...startupTimes);
      
      info(`Average startup time: ${avgStartup}ms`);
      info(`Maximum startup time: ${maxStartup}ms`);
      
      // Performance thresholds
      const passed = avgStartup < 1000 && maxStartup < 2000;
      
      this.results.push({
        testName: 'Performance benchmarks',
        passed,
        duration: avgStartup,
        error: passed ? undefined : `Performance below threshold: avg=${avgStartup}ms, max=${maxStartup}ms`
      });
      
      if (passed) {
        success(`Performance benchmarks passed (avg: ${avgStartup}ms, max: ${maxStartup}ms)`);
      } else {
        warning(`Performance benchmarks: avg=${avgStartup}ms, max=${maxStartup}ms`);
      }
    }
  }

  async runFullE2ETest(): Promise<void> {
    header('BUILT APPLICATION E2E TESTING');
    
    console.log('\nThis test validates the built and globally installed flowx application.');
    console.log('Testing: Installation, Core Commands, Functional Commands, System Integration, Build Integrity, Performance\n');
    
    await this.testInstallation();
    await this.testCoreCommands();
    await this.testFunctionalCommands();
    await this.testSystemIntegration();
    await this.testBuildIntegrity();
    await this.testPerformance();
    
    this.generateReport();
  }

  generateReport(): void {
    header('E2E TEST RESULTS');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const successRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total Tests: ${total}`);
    console.log(`  ${colorize('✅ Passed:', 'green')} ${passed}`);
    console.log(`  ${colorize('❌ Failed:', 'red')} ${failed}`);
    console.log(`  ${colorize('📈 Success Rate:', 'blue')} ${successRate}%`);
    
    if (passed > 0) {
      console.log(`\n${colorize('✅ PASSED TESTS:', 'green')}`);
      this.results
        .filter(r => r.passed)
        .forEach(r => console.log(`  • ${r.testName} (${r.duration}ms)`));
    }
    
    if (failed > 0) {
      console.log(`\n${colorize('❌ FAILED TESTS:', 'red')}`);
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  • ${r.testName}: ${r.error}`));
    }
    
    // Overall assessment
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\n⏱️  Total Duration: ${totalDuration}ms`);
    
    if (failed === 0) {
      console.log(`\n${colorize('🎉 EXCELLENT!', 'green')} Built application is fully functional!`);
    } else if (failed <= 2) {
      console.log(`\n${colorize('👍 GOOD!', 'yellow')} Built application is mostly functional with ${failed} minor issues.`);
    } else {
      console.log(`\n${colorize('⚠️  NEEDS WORK!', 'red')} Built application has ${failed} issues that need attention.`);
    }
    
    console.log('\n🔍 E2E Test Coverage:');
    console.log('  • Installation: Global npm install and CLI availability');
    console.log('  • Core Commands: All help commands and basic functionality');
    console.log('  • Functional Commands: Agent, task, and config management');
    console.log('  • System Integration: Full system status and initialization');
    console.log('  • Build Integrity: Consistency between built and dev versions');
    console.log('  • Performance: Startup time and responsiveness benchmarks');
    
    // Save results
    this.saveResults();
  }

  async saveResults(): Promise<void> {
    const reportData = {
      timestamp: new Date().toISOString(),
      testType: 'e2e-built-app',
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length
      },
      results: this.results
    };
    
    try {
      await fs.mkdir('reports', { recursive: true });
      await fs.writeFile(
        'reports/built-app-e2e-test.json',
        JSON.stringify(reportData, null, 2)
      );
      info('E2E test results saved to reports/built-app-e2e-test.json');
    } catch (err) {
      warning(`Failed to save results: ${err}`);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const tester = new BuiltAppE2ETester();
  await tester.runFullE2ETest();
}

// Run the E2E test
main().catch(console.error); 
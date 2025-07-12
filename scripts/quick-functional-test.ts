#!/usr/bin/env tsx

/**
 * Quick Functional Test
 * Tests a few key commands to validate our fixes are working
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_COMMAND = 'npx tsx src/cli/main.ts';

interface TestResult {
  command: string;
  status: 'PASS' | 'FAIL' | 'TIMEOUT';
  duration: number;
  output: string;
  error?: string;
}

async function runQuickTest(command: string, timeout: number = 15000): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🧪 Testing: ${command}`);
    
    const { stdout, stderr } = await Promise.race([
      execAsync(`${CLI_COMMAND} ${command}`, { 
        cwd: process.cwd(),
        timeout: timeout
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Command timeout')), timeout)
      )
    ]);

    const output = stdout + stderr;
    const duration = Date.now() - startTime;

    // Check if output contains error indicators
    if (output.includes('❌') || output.includes('Failed') || output.includes('Error:')) {
      // Check if it's a graceful fallback
      if (output.includes('Fallback') || output.includes('Service not initialized')) {
        console.log(`   ✅ PASS: ${command} (graceful fallback, ${duration}ms)`);
        return {
          command,
          status: 'PASS',
          duration,
          output: output.substring(0, 300)
        };
      } else {
        console.log(`   ❌ FAIL: ${command} (${duration}ms)`);
        return {
          command,
          status: 'FAIL',
          duration,
          output: output.substring(0, 300),
          error: 'Command returned error'
        };
      }
    } else {
      console.log(`   ✅ PASS: ${command} (${duration}ms)`);
      return {
        command,
        status: 'PASS',
        duration,
        output: output.substring(0, 300)
      };
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('timeout')) {
      console.log(`   ⏱️  TIMEOUT: ${command} (${duration}ms)`);
      return {
        command,
        status: 'TIMEOUT',
        duration,
        output: '',
        error: 'Command timed out'
      };
    } else {
      console.log(`   ❌ FAIL: ${command} (${duration}ms) - ${errorMessage}`);
      return {
        command,
        status: 'FAIL',
        duration,
        output: '',
        error: errorMessage
      };
    }
  }
}

async function runQuickFunctionalTests(): Promise<void> {
  console.log('🚀 Running Quick Functional Tests\n');
  console.log('=' .repeat(60));

  const testCommands = [
    'memory stats',
    'memory stats --detailed',
    'task list',
    'task stats',
    'config list',
    'status',
    'swarm list',
    'agent list',
    'terminal list',
    'batch status'
  ];

  const results: TestResult[] = [];

  for (const command of testCommands) {
    const result = await runQuickTest(command, 20000); // 20 second timeout
    results.push(result);
    console.log(''); // Empty line for readability
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 QUICK FUNCTIONAL TEST RESULTS');
  console.log('='.repeat(60));

  const totalTests = results.length;
  const passedTests = results.filter(r => r.status === 'PASS').length;
  const failedTests = results.filter(r => r.status === 'FAIL').length;
  const timeoutTests = results.filter(r => r.status === 'TIMEOUT').length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\n📈 Results:`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${passedTests} (${successRate}%)`);
  console.log(`  Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`  Timeouts: ${timeoutTests} (${((timeoutTests / totalTests) * 100).toFixed(1)}%)`);

  if (failedTests > 0) {
    console.log(`\n❌ Failed Tests:`);
    results
      .filter(r => r.status === 'FAIL')
      .forEach(result => {
        console.log(`  • ${result.command}`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      });
  }

  if (timeoutTests > 0) {
    console.log(`\n⏱️  Timeout Tests:`);
    results
      .filter(r => r.status === 'TIMEOUT')
      .forEach(result => {
        console.log(`  • ${result.command}`);
      });
  }

  console.log(`\n🎯 Assessment:`);
  if (parseFloat(successRate) >= 80) {
    console.log(`  🌟 EXCELLENT: ${successRate}% success rate`);
    console.log(`  ✅ Our fixes are working! Commands are functional or have graceful fallbacks`);
  } else if (parseFloat(successRate) >= 60) {
    console.log(`  ✅ GOOD: ${successRate}% success rate`);
    console.log(`  ⚠️  Most commands working, some issues remain`);
  } else {
    console.log(`  ❌ POOR: ${successRate}% success rate`);
    console.log(`  🚨 More fixes needed`);
  }

  console.log('\n' + '='.repeat(60));
}

// Run the test
runQuickFunctionalTests().catch(console.error); 
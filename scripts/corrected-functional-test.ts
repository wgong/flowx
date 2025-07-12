#!/usr/bin/env tsx

/**
 * Corrected Functional Operations Test
 * Tests actual command functionality using the correct CLI structure
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const CLI_COMMAND = 'npx tsx src/cli/main.ts';

interface FunctionalTest {
  name: string;
  command: string;
  category: string;
  expectedBehavior: string;
  validationMethod: 'output' | 'file' | 'status' | 'json' | 'partial';
  expectedResults: string[];
  timeout?: number;
}

class CorrectedFunctionalValidator {
  private results: Array<{
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    duration: number;
    details: string;
  }> = [];

  // Corrected functional tests using actual CLI structure
  private readonly FUNCTIONAL_TESTS: FunctionalTest[] = [
    // SYSTEM OPERATIONS (using actual subcommands)
    {
      name: 'System Status',
      command: 'status',
      category: 'System',
      expectedBehavior: 'Show system status',
      validationMethod: 'output',
      expectedResults: ['Claude Flow System Status', 'System Health'],
      timeout: 15000
    },
    {
      name: 'Configuration List',
      command: 'config list',
      category: 'System',
      expectedBehavior: 'List configuration values',
      validationMethod: 'output',
      expectedResults: ['Configuration', 'Value'],
      timeout: 10000
    },
    {
      name: 'Memory Manager Status',
      command: 'memory status',
      category: 'System',
      expectedBehavior: 'Show memory manager status',
      validationMethod: 'output',
      expectedResults: ['Memory Manager', 'Status'],
      timeout: 10000
    },

    // TASK OPERATIONS (using actual subcommands)
    {
      name: 'Task List',
      command: 'task list',
      category: 'Tasks',
      expectedBehavior: 'List tasks',
      validationMethod: 'output',
      expectedResults: ['tasks', 'found'],
      timeout: 10000
    },
    {
      name: 'Task Statistics',
      command: 'task stats',
      category: 'Tasks',
      expectedBehavior: 'Show task statistics',
      validationMethod: 'output',
      expectedResults: ['Task Statistics', 'Total Tasks'],
      timeout: 10000
    },
    {
      name: 'Task Creation',
      command: 'task create --description "Test task for validation"',
      category: 'Tasks',
      expectedBehavior: 'Create a new task',
      validationMethod: 'output',
      expectedResults: ['Task created', 'Test task for validation'],
      timeout: 15000
    },

    // WORKFLOW OPERATIONS (using actual subcommands)
    {
      name: 'Workflow List',
      command: 'workflow list',
      category: 'Workflow',
      expectedBehavior: 'List workflows',
      validationMethod: 'output',
      expectedResults: ['workflows', 'found'],
      timeout: 10000
    },
    {
      name: 'Workflow Create',
      command: 'workflow create --name "Test Workflow" --description "Test workflow for validation"',
      category: 'Workflow',
      expectedBehavior: 'Create a new workflow',
      validationMethod: 'output',
      expectedResults: ['Workflow created', 'Test Workflow'],
      timeout: 15000
    },

    // AGENT OPERATIONS (using actual subcommands)
    {
      name: 'Agent List',
      command: 'agent list',
      category: 'Agents',
      expectedBehavior: 'List agents',
      validationMethod: 'output',
      expectedResults: ['agents', 'found'],
      timeout: 10000
    },
    {
      name: 'Agent Stats',
      command: 'agent stats',
      category: 'Agents',
      expectedBehavior: 'Show agent statistics',
      validationMethod: 'output',
      expectedResults: ['Agent Statistics', 'Total Agents'],
      timeout: 10000
    },

    // SWARM OPERATIONS (using actual subcommands)
    {
      name: 'Swarm List',
      command: 'swarm list',
      category: 'Swarm',
      expectedBehavior: 'List swarms',
      validationMethod: 'output',
      expectedResults: ['swarms', 'found'],
      timeout: 10000
    },
    {
      name: 'Swarm Status',
      command: 'swarm status',
      category: 'Swarm',
      expectedBehavior: 'Show swarm status',
      validationMethod: 'output',
      expectedResults: ['Swarm Status', 'Active Swarms'],
      timeout: 10000
    },

    // TERMINAL OPERATIONS (using actual subcommands)
    {
      name: 'Terminal List',
      command: 'terminal list',
      category: 'Terminal',
      expectedBehavior: 'List terminal sessions',
      validationMethod: 'output',
      expectedResults: ['terminal', 'sessions'],
      timeout: 10000
    },
    {
      name: 'Terminal Health',
      command: 'terminal health',
      category: 'Terminal',
      expectedBehavior: 'Check terminal health',
      validationMethod: 'output',
      expectedResults: ['Terminal', 'Health'],
      timeout: 10000
    },

    // MONITORING OPERATIONS (using actual subcommands)
    {
      name: 'System Monitor',
      command: 'monitor system',
      category: 'Monitoring',
      expectedBehavior: 'Monitor system resources',
      validationMethod: 'output',
      expectedResults: ['System Monitor', 'CPU', 'Memory'],
      timeout: 15000
    },
    {
      name: 'Monitor Logs',
      command: 'monitor logs',
      category: 'Monitoring',
      expectedBehavior: 'Monitor system logs',
      validationMethod: 'output',
      expectedResults: ['Log Monitor', 'Monitoring'],
      timeout: 15000
    },

    // BENCHMARK OPERATIONS (using actual subcommands)
    {
      name: 'Benchmark List',
      command: 'benchmark list',
      category: 'Benchmark',
      expectedBehavior: 'List available benchmarks',
      validationMethod: 'output',
      expectedResults: ['benchmarks', 'available'],
      timeout: 10000
    },
    {
      name: 'Benchmark Run',
      command: 'benchmark run --suite basic --duration 5',
      category: 'Benchmark',
      expectedBehavior: 'Run benchmark suite',
      validationMethod: 'output',
      expectedResults: ['Benchmark', 'Running'],
      timeout: 20000
    },

    // SPARC OPERATIONS (using actual subcommands)
    {
      name: 'SPARC List',
      command: 'sparc list',
      category: 'SPARC',
      expectedBehavior: 'List SPARC modes',
      validationMethod: 'output',
      expectedResults: ['SPARC', 'modes', 'available'],
      timeout: 10000
    },
    {
      name: 'SPARC Architect',
      command: 'sparc architect "Test architecture task"',
      category: 'SPARC',
      expectedBehavior: 'Run SPARC architect mode',
      validationMethod: 'output',
      expectedResults: ['SPARC', 'architect', 'mode'],
      timeout: 15000
    },

    // MIGRATION OPERATIONS (using actual subcommands)
    {
      name: 'Migration Status',
      command: 'migration status',
      category: 'Migration',
      expectedBehavior: 'Show migration status',
      validationMethod: 'partial',
      expectedResults: ['Migration', 'Status'],
      timeout: 10000
    },
    {
      name: 'Migration List',
      command: 'migration list',
      category: 'Migration',
      expectedBehavior: 'List migrations',
      validationMethod: 'output',
      expectedResults: ['migrations', 'found'],
      timeout: 10000
    },

    // UI OPERATIONS (using actual subcommands)
    {
      name: 'UI Status',
      command: 'ui status',
      category: 'UI',
      expectedBehavior: 'Show UI server status',
      validationMethod: 'output',
      expectedResults: ['UI Server', 'Status'],
      timeout: 10000
    },

    // BATCH OPERATIONS (using actual subcommands)
    {
      name: 'Batch Status',
      command: 'batch status',
      category: 'Batch',
      expectedBehavior: 'Show batch operation status',
      validationMethod: 'output',
      expectedResults: ['Batch', 'Status'],
      timeout: 10000
    },
    {
      name: 'Batch Templates',
      command: 'batch templates',
      category: 'Batch',
      expectedBehavior: 'List batch templates',
      validationMethod: 'output',
      expectedResults: ['templates', 'available'],
      timeout: 10000
    }
  ];

  async runFunctionalTests(): Promise<void> {
    console.log('🔧 Starting Corrected Functional Operations Validation\n');
    console.log('=' .repeat(80));
    console.log(`Testing ${this.FUNCTIONAL_TESTS.length} functional operations with correct CLI syntax\n`);

    for (const test of this.FUNCTIONAL_TESTS) {
      await this.runSingleFunctionalTest(test);
    }

    this.generateFunctionalReport();
  }

  private async runSingleFunctionalTest(test: FunctionalTest): Promise<void> {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`   Command: ${test.command}`);
    console.log(`   Expected: ${test.expectedBehavior}`);

    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(`${CLI_COMMAND} ${test.command}`, {
        cwd: path.resolve(process.cwd()),
        timeout: test.timeout || 10000
      });

      const output = stdout + stderr;
      const duration = Date.now() - startTime;

      // Validate based on test method
      const isValid = await this.validateResult(test, output);

      if (isValid) {
        console.log(`   ✅ PASS: ${test.name} (${duration}ms)`);
        this.results.push({
          name: test.name,
          status: 'PASS',
          duration,
          details: `Successfully executed: ${test.expectedBehavior}`
        });
      } else {
        console.log(`   ❌ FAIL: ${test.name} - Expected results not found`);
        console.log(`   Output preview: ${output.substring(0, 200)}...`);
        this.results.push({
          name: test.name,
          status: 'FAIL',
          duration,
          details: `Missing expected results: ${test.expectedResults.join(', ')}`
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`   ❌ FAIL: ${test.name} - ${errorMessage}`);
      this.results.push({
        name: test.name,
        status: 'FAIL',
        duration,
        details: `Command failed: ${errorMessage}`
      });
    }

    console.log(''); // Empty line for readability
  }

  private async validateResult(test: FunctionalTest, output: string): Promise<boolean> {
    const lowerOutput = output.toLowerCase();
    
    switch (test.validationMethod) {
      case 'output':
        return test.expectedResults.every(expected => 
          lowerOutput.includes(expected.toLowerCase())
        );

      case 'partial':
        // For partial validation, at least one expected result should be present
        return test.expectedResults.some(expected => 
          lowerOutput.includes(expected.toLowerCase())
        );

      case 'json':
        try {
          const parsed = JSON.parse(output);
          return test.expectedResults.every(key => 
            this.hasProperty(parsed, key)
          );
        } catch {
          return false;
        }

      case 'status':
        return output.includes('✅') || output.includes('SUCCESS') || output.includes('PASS');

      case 'file':
        // Check if expected files exist
        for (const expectedFile of test.expectedResults) {
          try {
            await fs.access(expectedFile);
          } catch {
            return false;
          }
        }
        return true;

      default:
        return false;
    }
  }

  private hasProperty(obj: any, key: string): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    
    if (key in obj) return true;
    
    // Check nested properties
    for (const prop in obj) {
      if (typeof obj[prop] === 'object' && this.hasProperty(obj[prop], key)) {
        return true;
      }
    }
    
    return false;
  }

  private generateFunctionalReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 CORRECTED FUNCTIONAL OPERATIONS VALIDATION REPORT');
    console.log('='.repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = this.results.filter(r => r.status === 'FAIL').length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Total Functional Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests} (${successRate}%)`);
    console.log(`  Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);

    // Category breakdown
    const categoryStats = this.calculateCategoryStats();
    console.log(`\n📊 Results by Category:`);
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const catSuccessRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${catSuccessRate}%)`);
    });

    // Failed tests detail
    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.name}`);
          console.log(`    Details: ${result.details}`);
        });
    }

    // Success assessment
    console.log(`\n🎯 Functional Assessment:`);
    if (parseFloat(successRate) >= 90) {
      console.log(`  🌟 EXCELLENT: ${successRate}% of commands are fully functional`);
      console.log(`  ✅ Commands perform their intended operations correctly`);
    } else if (parseFloat(successRate) >= 75) {
      console.log(`  ✅ GOOD: ${successRate}% of commands are functional`);
      console.log(`  ⚠️  Some commands may need initialization or specific setup`);
    } else if (parseFloat(successRate) >= 50) {
      console.log(`  ⚠️  FAIR: ${successRate}% of commands are functional`);
      console.log(`  🔧 Several commands need attention or proper initialization`);
    } else {
      console.log(`  ❌ POOR: ${successRate}% of commands are functional`);
      console.log(`  🚨 Major functionality issues need immediate attention`);
    }

    console.log('\n' + '='.repeat(80));
  }

  private calculateCategoryStats(): Record<string, { passed: number; total: number }> {
    const stats: Record<string, { passed: number; total: number }> = {};

    this.FUNCTIONAL_TESTS.forEach(test => {
      if (!stats[test.category]) {
        stats[test.category] = { passed: 0, total: 0 };
      }
      stats[test.category].total++;

      const result = this.results.find(r => r.name === test.name);
      if (result?.status === 'PASS') {
        stats[test.category].passed++;
      }
    });

    return stats;
  }
}

// Run the corrected functional validation
const validator = new CorrectedFunctionalValidator();
validator.runFunctionalTests().catch(console.error); 
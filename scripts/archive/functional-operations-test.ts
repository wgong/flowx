#!/usr/bin/env tsx

/**
 * Functional Operations Test
 * Tests actual command functionality beyond help - proves commands work as intended
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
  validationMethod: 'output' | 'file' | 'status' | 'json';
  expectedResults: string[];
  timeout?: number;
}

class FunctionalOperationsValidator {
  private results: Array<{
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    duration: number;
    details: string;
  }> = [];

  // Key functional tests - actual operations, not just help
  private readonly FUNCTIONAL_TESTS: FunctionalTest[] = [
    // SYSTEM OPERATIONS
    {
      name: 'System Status Check',
      command: 'status --format json',
      category: 'System',
      expectedBehavior: 'Show system status in JSON format',
      validationMethod: 'json',
      expectedResults: ['status', 'timestamp', 'components'],
      timeout: 15000
    },
    {
      name: 'Configuration List',
      command: 'config list --format table',
      category: 'System',
      expectedBehavior: 'List configuration in table format',
      validationMethod: 'output',
      expectedResults: ['Configuration', 'Value', 'Default'],
      timeout: 10000
    },
    {
      name: 'Memory Statistics',
      command: 'memory stats',
      category: 'System',
      expectedBehavior: 'Show memory usage statistics',
      validationMethod: 'output',
      expectedResults: ['Memory Statistics', 'Total', 'Used'],
      timeout: 10000
    },

    // TASK OPERATIONS
    {
      name: 'Task List',
      command: 'task list --format table',
      category: 'Tasks',
      expectedBehavior: 'List tasks in table format',
      validationMethod: 'output',
      expectedResults: ['ID', 'Type', 'Description', 'Status'],
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
      command: 'task create --description "Test task for validation" --type validation --priority 5',
      category: 'Tasks',
      expectedBehavior: 'Create a new task and return task ID',
      validationMethod: 'output',
      expectedResults: ['Task created', 'Description: Test task for validation', 'Type: validation'],
      timeout: 15000
    },

    // WORKFLOW OPERATIONS
    {
      name: 'Workflow List',
      command: 'workflow list --format table',
      category: 'Workflow',
      expectedBehavior: 'List workflows in table format',
      validationMethod: 'output',
      expectedResults: ['ID', 'Name', 'Status'],
      timeout: 10000
    },
    {
      name: 'Workflow Templates',
      command: 'workflow templates',
      category: 'Workflow',
      expectedBehavior: 'List available workflow templates',
      validationMethod: 'output',
      expectedResults: ['Available Templates', 'Name', 'Description'],
      timeout: 10000
    },

    // AGENT OPERATIONS
    {
      name: 'Agent List',
      command: 'agent list --format table',
      category: 'Agents',
      expectedBehavior: 'List agents in table format',
      validationMethod: 'output',
      expectedResults: ['ID', 'Type', 'Status'],
      timeout: 10000
    },
    {
      name: 'Agent Stats',
      command: 'agents stats',
      category: 'Agents',
      expectedBehavior: 'Show agent performance statistics',
      validationMethod: 'output',
      expectedResults: ['Agent Statistics', 'Total Agents'],
      timeout: 10000
    },

    // SWARM OPERATIONS
    {
      name: 'Swarm List',
      command: 'swarm list --format table',
      category: 'Swarm',
      expectedBehavior: 'List swarms in table format',
      validationMethod: 'output',
      expectedResults: ['ID', 'Name', 'Status', 'Agents'],
      timeout: 10000
    },
    {
      name: 'Swarm Stats',
      command: 'swarms stats',
      category: 'Swarm',
      expectedBehavior: 'Show swarm activity statistics',
      validationMethod: 'output',
      expectedResults: ['Swarm Statistics', 'Active Swarms'],
      timeout: 10000
    },

    // TERMINAL OPERATIONS
    {
      name: 'Terminal List',
      command: 'terminal list --format table',
      category: 'Terminal',
      expectedBehavior: 'List terminal sessions',
      validationMethod: 'output',
      expectedResults: ['ID', 'Status', 'Created'],
      timeout: 10000
    },
    {
      name: 'Terminal Health',
      command: 'health',
      category: 'Terminal',
      expectedBehavior: 'Check terminal manager health',
      validationMethod: 'output',
      expectedResults: ['Terminal Manager Health', 'Status'],
      timeout: 10000
    },

    // MONITORING OPERATIONS
    {
      name: 'System Monitor',
      command: 'monitor system --duration 1',
      category: 'Monitoring',
      expectedBehavior: 'Monitor system for 1 second',
      validationMethod: 'output',
      expectedResults: ['System Monitor', 'CPU', 'Memory'],
      timeout: 15000
    },
    {
      name: 'Performance Analysis',
      command: 'performance analyze',
      category: 'Monitoring',
      expectedBehavior: 'Analyze system performance',
      validationMethod: 'output',
      expectedResults: ['Performance Analysis', 'Metrics'],
      timeout: 15000
    },

    // BENCHMARK OPERATIONS
    {
      name: 'Benchmark List',
      command: 'benchmark list --format table',
      category: 'Benchmark',
      expectedBehavior: 'List available benchmarks',
      validationMethod: 'output',
      expectedResults: ['Name', 'Type', 'Status'],
      timeout: 10000
    },
    {
      name: 'Benchmark Report',
      command: 'report generate --type summary',
      category: 'Benchmark',
      expectedBehavior: 'Generate benchmark report',
      validationMethod: 'output',
      expectedResults: ['Report Generated', 'Summary'],
      timeout: 15000
    },

    // SPARC OPERATIONS
    {
      name: 'SPARC Validate',
      command: 'sparc validate --dry-run',
      category: 'SPARC',
      expectedBehavior: 'Validate SPARC workflow in dry-run mode',
      validationMethod: 'output',
      expectedResults: ['SPARC Validation', 'Dry Run'],
      timeout: 15000
    },

    // MIGRATION OPERATIONS
    {
      name: 'Migration Status',
      command: 'migration status',
      category: 'Migration',
      expectedBehavior: 'Show migration status',
      validationMethod: 'output',
      expectedResults: ['Migration Status', 'Current Version'],
      timeout: 10000
    },
    {
      name: 'Migration History',
      command: 'history',
      category: 'Migration',
      expectedBehavior: 'Show migration history',
      validationMethod: 'output',
      expectedResults: ['Migration History', 'Applied'],
      timeout: 10000
    }
  ];

  async runFunctionalTests(): Promise<void> {
    console.log('🔧 Starting Functional Operations Validation\n');
    console.log('=' .repeat(80));
    console.log(`Testing ${this.FUNCTIONAL_TESTS.length} functional operations to prove commands work correctly\n`);

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
    switch (test.validationMethod) {
      case 'output':
        return test.expectedResults.every(expected => 
          output.toLowerCase().includes(expected.toLowerCase())
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
    console.log('📊 FUNCTIONAL OPERATIONS VALIDATION REPORT');
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
      console.log(`  ✅ Commands not only show help but actually perform their intended operations`);
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

// Run the functional validation
const validator = new FunctionalOperationsValidator();
validator.runFunctionalTests().catch(console.error); 
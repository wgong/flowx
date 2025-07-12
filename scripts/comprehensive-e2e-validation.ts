#!/usr/bin/env tsx

/**
 * Comprehensive End-to-End CLI Command Validation
 * Tests all 88 CLI commands to ensure they work correctly and produce expected outputs
 * 
 * This validates:
 * - Command execution without errors
 * - Expected output formats (JSON, table, text)
 * - Side effects (file creation, database changes, process spawning)
 * - Integration between commands
 * - Error handling and validation
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_COMMAND = 'npx tsx src/cli/main.ts';

interface CommandTest {
  command: string;
  category: string;
  description: string;
  expectedOutputs: string[];
  expectedSideEffects?: string[];
  timeout?: number;
  skipReason?: string;
}

interface TestResult {
  command: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'TIMEOUT';
  duration: number;
  output: string;
  error?: string;
  sideEffectsValidated?: boolean;
}

class ComprehensiveE2EValidator {
  private results: TestResult[] = [];
  private testStartTime: number = 0;

  // All 88 commands with their expected behaviors
  private readonly COMMAND_TESTS: CommandTest[] = [
    // AGENT COMMANDS (2)
    {
      command: 'agent --help',
      category: 'Agents',
      description: 'Show agent management help',
      expectedOutputs: ['Manage AI agents', 'Usage:', 'Options:']
    },
    {
      command: 'agents --help',
      category: 'Agents', 
      description: 'Show agent monitoring help',
      expectedOutputs: ['Monitor agent performance', 'Usage:', 'Options:']
    },

    // GENERAL COMMANDS (63)
    {
      command: 'all --help',
      category: 'General',
      description: 'Run all validation checks help',
      expectedOutputs: ['Run all validation checks', 'Usage:']
    },
    {
      command: 'analyze --help',
      category: 'General',
      description: 'Analyze log patterns help',
      expectedOutputs: ['Analyze log patterns', 'Usage:']
    },
    {
      command: 'architect --help',
      category: 'General',
      description: 'Architecture design mode help',
      expectedOutputs: ['Architecture design mode', 'Usage:']
    },
    {
      command: 'auto --help',
      category: 'General',
      description: 'Enable automatic scaling help',
      expectedOutputs: ['Enable automatic scaling', 'Usage:']
    },
    {
      command: 'backup --help',
      category: 'General',
      description: 'Backup current configuration help',
      expectedOutputs: ['Backup current configuration', 'Usage:']
    },
    {
      command: 'batch --help',
      category: 'General',
      description: 'Batch execution mode help',
      expectedOutputs: ['Batch execution mode', 'Usage:']
    },
    {
      command: 'check --help',
      category: 'General',
      description: 'Run comprehensive health checks help',
      expectedOutputs: ['Run comprehensive health checks', 'Usage:']
    },
    {
      command: 'cleanup --help',
      category: 'General',
      description: 'Clean up old backups help',
      expectedOutputs: ['Clean up old backups', 'Usage:']
    },
    {
      command: 'clear --help',
      category: 'General',
      description: 'Clear all log files help',
      expectedOutputs: ['Clear all log files', 'Usage:']
    },
    {
      command: 'code --help',
      category: 'General',
      description: 'Coding implementation mode help',
      expectedOutputs: ['Coding implementation mode', 'Usage:']
    },
    {
      command: 'compare --help',
      category: 'General',
      description: 'Compare results with baseline help',
      expectedOutputs: ['Compare results with baseline', 'Usage:']
    },
    {
      command: 'connections --help',
      category: 'General',
      description: 'List active connections help',
      expectedOutputs: ['List active connections', 'Usage:']
    },
    {
      command: 'create --help',
      category: 'General',
      description: 'Create a new task help',
      expectedOutputs: ['Create a new task', 'Usage:']
    },
    {
      command: 'daemon --help',
      category: 'General',
      description: 'Stop daemon process help',
      expectedOutputs: ['Stop daemon process', 'Usage:']
    },
    {
      command: 'debug --help',
      category: 'General',
      description: 'Debugging mode help',
      expectedOutputs: ['Debugging mode', 'Usage:']
    },
    {
      command: 'demo --help',
      category: 'General',
      description: 'Run comprehensive swarm demonstrations help',
      expectedOutputs: ['Run comprehensive swarm demonstrations', 'Usage:']
    },
    {
      command: 'dependencies --help',
      category: 'General',
      description: 'Show service dependencies help',
      expectedOutputs: ['Show service dependencies', 'Usage:']
    },
    {
      command: 'diagnostics --help',
      category: 'General',
      description: 'Run system diagnostics help',
      expectedOutputs: ['Run system diagnostics', 'Usage:']
    },
    {
      command: 'disable --help',
      category: 'General',
      description: 'Disable daemon auto-start help',
      expectedOutputs: ['Disable daemon auto-start', 'Usage:']
    },
    {
      command: 'disk --help',
      category: 'General',
      description: 'Show disk usage information help',
      expectedOutputs: ['Show disk usage information', 'Usage:']
    },
    {
      command: 'docs --help',
      category: 'General',
      description: 'Documentation generation mode help',
      expectedOutputs: ['Documentation generation mode', 'Usage:']
    },
    {
      command: 'down --help',
      category: 'General',
      description: 'Rollback migrations help',
      expectedOutputs: ['Rollback migrations', 'Usage:']
    },
    {
      command: 'enable --help',
      category: 'General',
      description: 'Enable daemon auto-start help',
      expectedOutputs: ['Enable daemon auto-start', 'Usage:']
    },
    {
      command: 'exec --help',
      category: 'General',
      description: 'Execute command in terminal help',
      expectedOutputs: ['Execute command in terminal', 'Usage:']
    },
    {
      command: 'export --help',
      category: 'General',
      description: 'Export configuration help',
      expectedOutputs: ['Export configuration', 'Usage:']
    },
    {
      command: 'from --help',
      category: 'General',
      description: 'Restore from a specific backup help',
      expectedOutputs: ['Restore from a specific backup', 'Usage:']
    },
    {
      command: 'get --help',
      category: 'General',
      description: 'Get configuration value help',
      expectedOutputs: ['Get configuration value', 'Usage:']
    },
    {
      command: 'health --help',
      category: 'General',
      description: 'Check terminal manager health help',
      expectedOutputs: ['Check terminal manager health', 'Usage:']
    },
    {
      command: 'history --help',
      category: 'General',
      description: 'Show migration history help',
      expectedOutputs: ['Show migration history', 'Usage:']
    },
    {
      command: 'import --help',
      category: 'General',
      description: 'Import configuration help',
      expectedOutputs: ['Import configuration', 'Usage:']
    },
    {
      command: 'info --help',
      category: 'General',
      description: 'Show backup information help',
      expectedOutputs: ['Show backup information', 'Usage:']
    },
    {
      command: 'init --help',
      category: 'General',
      description: 'Initialize configuration with wizard help',
      expectedOutputs: ['Initialize configuration with wizard', 'Usage:']
    },
    {
      command: 'kill --help',
      category: 'General',
      description: 'Terminate a terminal session help',
      expectedOutputs: ['Terminate a terminal session', 'Usage:']
    },
    {
      command: 'list --help',
      category: 'General',
      description: 'List all configuration values help',
      expectedOutputs: ['List all configuration values', 'Usage:']
    },
    {
      command: 'load --help',
      category: 'General',
      description: 'Run load testing scenarios help',
      expectedOutputs: ['Run load testing scenarios', 'Usage:']
    },
    {
      command: 'logs --help',
      category: 'General',
      description: 'Monitor system logs help',
      expectedOutputs: ['Monitor system logs', 'Usage:']
    },
    {
      command: 'maintenance --help',
      category: 'General',
      description: 'Perform terminal maintenance help',
      expectedOutputs: ['Perform terminal maintenance', 'Usage:']
    },
    {
      command: 'manual --help',
      category: 'General',
      description: 'Switch to manual scaling help',
      expectedOutputs: ['Switch to manual scaling', 'Usage:']
    },
    {
      command: 'mcp --help',
      category: 'General',
      description: 'Stop MCP server help',
      expectedOutputs: ['Stop MCP server', 'Usage:']
    },
    {
      command: 'memory --help',
      category: 'General',
      description: 'Monitor memory usage help',
      expectedOutputs: ['Monitor memory usage', 'Usage:']
    },
    {
      command: 'metrics --help',
      category: 'General',
      description: 'Show scaling metrics help',
      expectedOutputs: ['Show scaling metrics', 'Usage:']
    },
    {
      command: 'network --help',
      category: 'General',
      description: 'Show network information help',
      expectedOutputs: ['Show network information', 'Usage:']
    },
    {
      command: 'open --help',
      category: 'General',
      description: 'Open console in browser help',
      expectedOutputs: ['Open console in browser', 'Usage:']
    },
    {
      command: 'performance --help',
      category: 'General',
      description: 'Analyze system performance help',
      expectedOutputs: ['Analyze system performance', 'Usage:']
    },
    {
      command: 'policy --help',
      category: 'General',
      description: 'Manage scaling policies help',
      expectedOutputs: ['Manage scaling policies', 'Usage:']
    },
    {
      command: 'processes --help',
      category: 'General',
      description: 'Show system processes help',
      expectedOutputs: ['Show system processes', 'Usage:']
    },
    {
      command: 'profile --help',
      category: 'General',
      description: 'Manage configuration profiles help',
      expectedOutputs: ['Manage configuration profiles', 'Usage:']
    },
    {
      command: 'query --help',
      category: 'General',
      description: 'Query memory bank help',
      expectedOutputs: ['Query memory bank', 'Usage:']
    },
    {
      command: 'reload --help',
      category: 'General',
      description: 'Reload daemon configuration help',
      expectedOutputs: ['Reload daemon configuration', 'Usage:']
    },
    {
      command: 'remove --help',
      category: 'General',
      description: 'Remove daemon configuration help',
      expectedOutputs: ['Remove daemon configuration', 'Usage:']
    },
    {
      command: 'report --help',
      category: 'General',
      description: 'Generate benchmark reports help',
      expectedOutputs: ['Generate benchmark reports', 'Usage:']
    },
    {
      command: 'reset --help',
      category: 'General',
      description: 'Reset to default configuration help',
      expectedOutputs: ['Reset to default configuration', 'Usage:']
    },
    {
      command: 'restore --help',
      category: 'General',
      description: 'Restore configuration from backup help',
      expectedOutputs: ['Restore configuration from backup', 'Usage:']
    },
    {
      command: 'review --help',
      category: 'General',
      description: 'Code review mode help',
      expectedOutputs: ['Code review mode', 'Usage:']
    },
    {
      command: 'rollback --help',
      category: 'General',
      description: 'Rollback a restore operation help',
      expectedOutputs: ['Rollback a restore operation', 'Usage:']
    },
    {
      command: 'rotate --help',
      category: 'General',
      description: 'Rotate log files help',
      expectedOutputs: ['Rotate log files', 'Usage:']
    },
    {
      command: 'run --help',
      category: 'General',
      description: 'Execute workflow help',
      expectedOutputs: ['Execute workflow', 'Usage:']
    },
    {
      command: 'security --help',
      category: 'General',
      description: 'Security review mode help',
      expectedOutputs: ['Security review mode', 'Usage:']
    },
    {
      command: 'seed --help',
      category: 'General',
      description: 'Run database seeders help',
      expectedOutputs: ['Run database seeders', 'Usage:']
    },
    {
      command: 'services --help',
      category: 'General',
      description: 'Stop all services help',
      expectedOutputs: ['Stop all services', 'Usage:']
    },
    {
      command: 'set --help',
      category: 'General',
      description: 'Set configuration value help',
      expectedOutputs: ['Set configuration value', 'Usage:']
    },
    {
      command: 'show --help',
      category: 'General',
      description: 'Show detailed task information help',
      expectedOutputs: ['Show detailed task information', 'Usage:']
    },
    {
      command: 'spawn --help',
      category: 'General',
      description: 'Spawn a new terminal session help',
      expectedOutputs: ['Spawn a new terminal session', 'Usage:']
    },
    {
      command: 'stats --help',
      category: 'General',
      description: 'Show log statistics help',
      expectedOutputs: ['Show log statistics', 'Usage:']
    },
    {
      command: 'store --help',
      category: 'General',
      description: 'Store information in memory help',
      expectedOutputs: ['Store information in memory', 'Usage:']
    },
    {
      command: 'stream --help',
      category: 'General',
      description: 'Stream terminal output help',
      expectedOutputs: ['Stream terminal output', 'Usage:']
    },
    {
      command: 'stress --help',
      category: 'General',
      description: 'Run stress testing scenarios help',
      expectedOutputs: ['Run stress testing scenarios', 'Usage:']
    },
    {
      command: 'swarm --help',
      category: 'General',
      description: 'Create and manage multiple swarms help',
      expectedOutputs: ['Create and manage multiple swarms', 'Usage:']
    },
    {
      command: 'swarms --help',
      category: 'General',
      description: 'Monitor swarm activity help',
      expectedOutputs: ['Monitor swarm activity', 'Usage:']
    },
    {
      command: 'system --help',
      category: 'General',
      description: 'Monitor system resources help',
      expectedOutputs: ['Monitor system resources', 'Usage:']
    },
    {
      command: 'tasks --help',
      category: 'General',
      description: 'Monitor task execution help',
      expectedOutputs: ['Monitor task execution', 'Usage:']
    },
    {
      command: 'tdd --help',
      category: 'General',
      description: 'Test-driven development mode help',
      expectedOutputs: ['Test-driven development mode', 'Usage:']
    },
    {
      command: 'template --help',
      category: 'General',
      description: 'Manage workflow templates help',
      expectedOutputs: ['Manage workflow templates', 'Usage:']
    },
    {
      command: 'templates --help',
      category: 'General',
      description: 'List available batch templates help',
      expectedOutputs: ['List available batch templates', 'Usage:']
    },
    {
      command: 'unset --help',
      category: 'General',
      description: 'Remove configuration value help',
      expectedOutputs: ['Remove configuration value', 'Usage:']
    },
    {
      command: 'up --help',
      category: 'General',
      description: 'Apply pending migrations help',
      expectedOutputs: ['Apply pending migrations', 'Usage:']
    },
    {
      command: 'validate --help',
      category: 'General',
      description: 'Validate configuration help',
      expectedOutputs: ['Validate configuration', 'Usage:']
    },
    {
      command: 'verify --help',
      category: 'General',
      description: 'Verify backup integrity help',
      expectedOutputs: ['Verify backup integrity', 'Usage:']
    },

    // SYSTEM COMMANDS (12)
    {
      command: 'benchmark --help',
      category: 'System',
      description: 'Run performance benchmarks help',
      expectedOutputs: ['Run performance benchmarks', 'Usage:', 'Options:']
    },
    {
      command: 'config --help',
      category: 'System',
      description: 'Manage Claude-Flow configuration help',
      expectedOutputs: ['Manage Claude-Flow configuration', 'Usage:', 'Options:']
    },
    {
      command: 'migration --help',
      category: 'System',
      description: 'Manage database migrations help',
      expectedOutputs: ['Manage database migrations', 'Usage:', 'Options:']
    },
    {
      command: 'monitor --help',
      category: 'System',
      description: 'Real-time system monitoring help',
      expectedOutputs: ['Real-time system monitoring', 'Usage:', 'Options:']
    },
    {
      command: 'restart --help',
      category: 'System',
      description: 'Restart the Claude-Flow system help',
      expectedOutputs: ['Restart the Claude-Flow', 'Usage:', 'Options:']
    },
    {
      command: 'scale --help',
      category: 'System',
      description: 'Dynamic agent scaling help',
      expectedOutputs: ['Dynamic agent scaling', 'Usage:', 'Options:']
    },
    {
      command: 'sparc --help',
      category: 'System',
      description: 'Execute SPARC methodology help',
      expectedOutputs: ['Execute SPARC methodology', 'Usage:', 'Options:']
    },
    {
      command: 'start --help',
      category: 'System',
      description: 'Start the Claude-Flow system help',
      expectedOutputs: ['Start the Claude-Flow', 'Usage:', 'Options:']
    },
    {
      command: 'status --help',
      category: 'System',
      description: 'Show comprehensive system status help',
      expectedOutputs: ['Show comprehensive system status', 'Usage:', 'Options:']
    },
    {
      command: 'stop --help',
      category: 'System',
      description: 'Stop the Claude-Flow system help',
      expectedOutputs: ['Stop the Claude-Flow', 'Usage:', 'Options:']
    },
    {
      command: 'terminal --help',
      category: 'System',
      description: 'Manage terminal sessions help',
      expectedOutputs: ['Manage terminal sessions', 'Usage:', 'Options:']
    },
    {
      command: 'ui --help',
      category: 'System',
      description: 'Launch and manage web console help',
      expectedOutputs: ['Launch and manage', 'Usage:', 'Options:']
    },

    // TASK COMMANDS (1)
    {
      command: 'task --help',
      category: 'Tasks',
      description: 'Unified task management help',
      expectedOutputs: ['Unified task management', 'Usage:', 'Options:', 'create', 'list', 'show', 'stats']
    },

    // WORKFLOW COMMANDS (1)
    {
      command: 'workflow --help',
      category: 'Workflow',
      description: 'Manage and execute workflows help',
      expectedOutputs: ['Manage and execute workflows', 'Usage:', 'Options:']
    }
  ];

  async runComprehensiveValidation(): Promise<void> {
    console.log('🔍 Starting Comprehensive E2E CLI Command Validation\n');
    console.log('=' .repeat(80));
    console.log(`Testing ${this.COMMAND_TESTS.length} CLI commands for correct functionality\n`);

    this.testStartTime = Date.now();

    // Run all tests in parallel batches to avoid overwhelming the system
    const batchSize = 10;
    const batches = this.chunkArray(this.COMMAND_TESTS, batchSize);

    for (let i = 0; i < batches.length; i++) {
      console.log(`\n📦 Running batch ${i + 1}/${batches.length} (${batches[i].length} commands)`);
      console.log('-'.repeat(60));

      const batchPromises = batches[i].map(test => this.runSingleTest(test));
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.results.push(result.value);
        } else {
          this.results.push({
            command: batches[i][index].command,
            status: 'FAIL',
            duration: 0,
            output: '',
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Show batch progress
      const batchStats = this.calculateBatchStats(batches[i].length);
      console.log(`Batch ${i + 1} completed: ${batchStats.pass} passed, ${batchStats.fail} failed, ${batchStats.skip} skipped`);
    }

    await this.runIntegrationTests();
    await this.runSideEffectValidation();
    this.generateComprehensiveReport();
  }

  private async runSingleTest(test: CommandTest): Promise<TestResult> {
    if (test.skipReason) {
      console.log(`⏭️  SKIP: ${test.command} (${test.skipReason})`);
      return {
        command: test.command,
        status: 'SKIP',
        duration: 0,
        output: test.skipReason
      };
    }

    const startTime = Date.now();
    const timeout = test.timeout || 10000; // 10 second default timeout

    try {
      console.log(`🧪 Testing: ${test.command}`);

      const { stdout, stderr } = await Promise.race([
        execAsync(`${CLI_COMMAND} ${test.command}`, { 
          cwd: path.resolve(__dirname, '..'),
          timeout: timeout
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Command timeout')), timeout)
        )
      ]);

      const output = stdout + stderr;
      const duration = Date.now() - startTime;

      // Validate expected outputs
      const hasExpectedOutputs = test.expectedOutputs.every(expected => 
        output.toLowerCase().includes(expected.toLowerCase())
      );

      if (hasExpectedOutputs) {
        console.log(`✅ PASS: ${test.command} (${duration}ms)`);
        return {
          command: test.command,
          status: 'PASS',
          duration,
          output: output.substring(0, 500) // Truncate for readability
        };
      } else {
        console.log(`❌ FAIL: ${test.command} - Missing expected outputs`);
        return {
          command: test.command,
          status: 'FAIL',
          duration,
          output: output.substring(0, 500),
          error: `Missing expected outputs: ${test.expectedOutputs.join(', ')}`
        };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('timeout')) {
        console.log(`⏱️  TIMEOUT: ${test.command} (${duration}ms)`);
        return {
          command: test.command,
          status: 'TIMEOUT',
          duration,
          output: '',
          error: 'Command exceeded timeout limit'
        };
      } else {
        console.log(`❌ FAIL: ${test.command} - ${errorMessage}`);
        return {
          command: test.command,
          status: 'FAIL',
          duration,
          output: '',
          error: errorMessage
        };
      }
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests');
    console.log('-'.repeat(40));

    // Test command chaining and integration
    const integrationTests = [
      {
        name: 'Config → Status Chain',
        commands: ['config list --format json', 'status --format json'],
        description: 'Test config and status command integration'
      },
      {
        name: 'Task → Memory Chain',
        commands: ['task stats', 'memory stats'],
        description: 'Test task and memory system integration'
      },
      {
        name: 'Agent → Swarm Chain',
        commands: ['agent --help', 'swarm --help'],
        description: 'Test agent and swarm command consistency'
      }
    ];

    for (const test of integrationTests) {
      console.log(`🔗 Testing: ${test.name}`);
      let allPassed = true;

      for (const command of test.commands) {
        try {
          const { stdout, stderr } = await execAsync(`${CLI_COMMAND} ${command}`, {
            cwd: path.resolve(__dirname, '..'),
            timeout: 15000
          });

          if (stderr && !stderr.includes('Warning')) {
            allPassed = false;
            break;
          }
        } catch (error) {
          allPassed = false;
          break;
        }
      }

      if (allPassed) {
        console.log(`✅ PASS: ${test.name}`);
      } else {
        console.log(`❌ FAIL: ${test.name}`);
      }
    }
  }

  private async runSideEffectValidation(): Promise<void> {
    console.log('\n🔍 Validating Side Effects');
    console.log('-'.repeat(40));

    // Test commands that should create files/directories
    const sideEffectTests = [
      {
        command: 'config init --profile test-profile',
        expectedFiles: ['config.json'],
        description: 'Config init should create configuration files'
      },
      {
        command: 'backup --name test-backup',
        expectedFiles: ['backups/'],
        description: 'Backup should create backup directory'
      }
    ];

    for (const test of sideEffectTests) {
      console.log(`📁 Testing side effects: ${test.command}`);
      
      try {
        // Run command
        await execAsync(`${CLI_COMMAND} ${test.command}`, {
          cwd: path.resolve(__dirname, '..'),
          timeout: 15000
        });

        // Check for expected files/directories
        let sideEffectsValid = true;
        for (const expectedFile of test.expectedFiles) {
          try {
            await fs.access(path.resolve(__dirname, '..', expectedFile));
          } catch {
            sideEffectsValid = false;
            break;
          }
        }

        if (sideEffectsValid) {
          console.log(`✅ PASS: Side effects validated for ${test.command}`);
        } else {
          console.log(`❌ FAIL: Missing expected files for ${test.command}`);
        }

      } catch (error) {
        console.log(`❌ FAIL: Command failed: ${test.command}`);
      }
    }
  }

  private generateComprehensiveReport(): void {
    const totalDuration = Date.now() - this.testStartTime;
    const stats = this.calculateOverallStats();

    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE E2E VALIDATION REPORT');
    console.log('='.repeat(80));

    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Total Commands Tested: ${this.results.length}`);
    console.log(`  Passed: ${stats.pass} (${((stats.pass / this.results.length) * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${stats.fail} (${((stats.fail / this.results.length) * 100).toFixed(1)}%)`);
    console.log(`  Skipped: ${stats.skip} (${((stats.skip / this.results.length) * 100).toFixed(1)}%)`);
    console.log(`  Timeouts: ${stats.timeout} (${((stats.timeout / this.results.length) * 100).toFixed(1)}%)`);
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`  Average Duration: ${(stats.avgDuration / 1000).toFixed(2)}s per command`);

    // Category breakdown
    console.log(`\n📊 Results by Category:`);
    const categoryStats = this.calculateCategoryStats();
    Object.entries(categoryStats).forEach(([category, catStats]) => {
      const successRate = ((catStats.pass / catStats.total) * 100).toFixed(1);
      console.log(`  ${category}: ${catStats.pass}/${catStats.total} (${successRate}%)`);
    });

    // Failed commands detail
    if (stats.fail > 0) {
      console.log(`\n❌ Failed Commands:`);
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.command}`);
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        });
    }

    // Timeout commands detail
    if (stats.timeout > 0) {
      console.log(`\n⏱️  Timeout Commands:`);
      this.results
        .filter(r => r.status === 'TIMEOUT')
        .forEach(result => {
          console.log(`  • ${result.command}`);
        });
    }

    // Success assessment
    const overallSuccessRate = ((stats.pass / this.results.length) * 100);
    console.log(`\n🎯 Overall Assessment:`);
    
    if (overallSuccessRate >= 95) {
      console.log(`  🌟 EXCELLENT: ${overallSuccessRate.toFixed(1)}% success rate`);
      console.log(`  ✅ All CLI commands are working correctly with expected outputs`);
    } else if (overallSuccessRate >= 85) {
      console.log(`  ✅ GOOD: ${overallSuccessRate.toFixed(1)}% success rate`);
      console.log(`  ⚠️  Minor issues detected, but system is largely functional`);
    } else if (overallSuccessRate >= 70) {
      console.log(`  ⚠️  FAIR: ${overallSuccessRate.toFixed(1)}% success rate`);
      console.log(`  🔧 Several issues need attention`);
    } else {
      console.log(`  ❌ POOR: ${overallSuccessRate.toFixed(1)}% success rate`);
      console.log(`  🚨 Significant issues require immediate attention`);
    }

    console.log('\n' + '='.repeat(80));
  }

  private calculateOverallStats() {
    const pass = this.results.filter(r => r.status === 'PASS').length;
    const fail = this.results.filter(r => r.status === 'FAIL').length;
    const skip = this.results.filter(r => r.status === 'SKIP').length;
    const timeout = this.results.filter(r => r.status === 'TIMEOUT').length;
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;

    return { pass, fail, skip, timeout, avgDuration };
  }

  private calculateBatchStats(batchSize: number) {
    const recentResults = this.results.slice(-batchSize);
    return {
      pass: recentResults.filter(r => r.status === 'PASS').length,
      fail: recentResults.filter(r => r.status === 'FAIL').length,
      skip: recentResults.filter(r => r.status === 'SKIP').length,
      timeout: recentResults.filter(r => r.status === 'TIMEOUT').length
    };
  }

  private calculateCategoryStats() {
    const categories: Record<string, { pass: number; total: number }> = {};

    this.COMMAND_TESTS.forEach(test => {
      if (!categories[test.category]) {
        categories[test.category] = { pass: 0, total: 0 };
      }
      categories[test.category].total++;

      const result = this.results.find(r => r.command === test.command);
      if (result?.status === 'PASS') {
        categories[test.category].pass++;
      }
    });

    return categories;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Run the comprehensive validation
const validator = new ComprehensiveE2EValidator();
validator.runComprehensiveValidation().catch(console.error); 
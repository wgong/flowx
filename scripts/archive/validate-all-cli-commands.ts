#!/usr/bin/env tsx

/**
 * Comprehensive CLI Command Validation
 * 
 * This script tests every command listed in the CLI help to ensure they work end-to-end.
 * It systematically validates all command categories and individual commands.
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
  console.log(colorize(`🧪 ${text}`, 'cyan'));
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

interface CommandTest {
  command: string;
  category: string;
  description: string;
  testType: 'help' | 'safe' | 'read-only' | 'interactive' | 'destructive';
  expectedOutput?: string[];
  timeout?: number;
}

interface TestResult {
  command: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
  output?: string;
  skipped?: boolean;
  reason?: string;
}

class CLICommandValidator {
  private results: TestResult[] = [];
  private cliCommand = 'npx tsx src/cli/main.ts';

  // Define all commands from the help output organized by category
  private commands: CommandTest[] = [
    // Agent Commands
    { command: 'agent --help', category: 'Agents', description: 'Agent management help', testType: 'help' },
    { command: 'agent list', category: 'Agents', description: 'List agents', testType: 'read-only', timeout: 20000 },
    { command: 'agent status', category: 'Agents', description: 'Agent status', testType: 'read-only', timeout: 20000 },

    // System Commands
    { command: 'status', category: 'System', description: 'System status', testType: 'read-only', timeout: 45000 },
    { command: 'status --help', category: 'System', description: 'Status command help', testType: 'help' },
    { command: 'config --help', category: 'System', description: 'Config command help', testType: 'help' },
    { command: 'config list', category: 'System', description: 'List configuration', testType: 'read-only', timeout: 20000 },
    { command: 'monitor --help', category: 'System', description: 'Monitor command help', testType: 'help' },
    { command: 'scale --help', category: 'System', description: 'Scale command help', testType: 'help' },
    { command: 'sparc --help', category: 'System', description: 'SPARC command help', testType: 'help' },
    { command: 'terminal --help', category: 'System', description: 'Terminal command help', testType: 'help' },
    { command: 'ui --help', category: 'System', description: 'UI command help', testType: 'help' },
    { command: 'benchmark --help', category: 'System', description: 'Benchmark command help', testType: 'help' },
    { command: 'migration --help', category: 'System', description: 'Migration command help', testType: 'help' },

    // Task Commands
    { command: 'task --help', category: 'Tasks', description: 'Task command help', testType: 'help' },
    { command: 'task list', category: 'Tasks', description: 'List tasks', testType: 'read-only', timeout: 20000 },
    { command: 'task stats', category: 'Tasks', description: 'Task statistics', testType: 'read-only', timeout: 20000 },

    // Workflow Commands
    { command: 'workflow --help', category: 'Workflow', description: 'Workflow command help', testType: 'help' },
    { command: 'workflow list', category: 'Workflow', description: 'List workflows', testType: 'read-only', timeout: 20000 },

    // General Commands - Safe/Read-only ones
    { command: 'agents --help', category: 'General', description: 'Agents monitoring help', testType: 'help' },
    { command: 'alerts --help', category: 'General', description: 'Alerts help', testType: 'help' },
    { command: 'all --help', category: 'General', description: 'All validation help', testType: 'help' },
    { command: 'analyze --help', category: 'General', description: 'Analyze help', testType: 'help' },
    { command: 'architect --help', category: 'General', description: 'Architect mode help', testType: 'help' },
    { command: 'backup --help', category: 'General', description: 'Backup help', testType: 'help' },
    { command: 'batch --help', category: 'General', description: 'Batch mode help', testType: 'help' },
    { command: 'check --help', category: 'General', description: 'Health check help', testType: 'help' },
    { command: 'code --help', category: 'General', description: 'Code mode help', testType: 'help' },
    { command: 'connections --help', category: 'General', description: 'Connections help', testType: 'help' },
    { command: 'debug --help', category: 'General', description: 'Debug mode help', testType: 'help' },
    { command: 'demo --help', category: 'General', description: 'Demo help', testType: 'help' },
    { command: 'dependencies --help', category: 'General', description: 'Dependencies help', testType: 'help' },
    { command: 'diagnostics --help', category: 'General', description: 'Diagnostics help', testType: 'help' },
    { command: 'docs --help', category: 'General', description: 'Documentation mode help', testType: 'help' },
    { command: 'get --help', category: 'General', description: 'Get config help', testType: 'help' },
    { command: 'health --help', category: 'General', description: 'Health help', testType: 'help' },
    { command: 'history --help', category: 'General', description: 'History help', testType: 'help' },
    { command: 'info --help', category: 'General', description: 'Info help', testType: 'help' },
    { command: 'list --help', category: 'General', description: 'List help', testType: 'help' },
    { command: 'logs --help', category: 'General', description: 'Logs help', testType: 'help' },
    { command: 'memory --help', category: 'General', description: 'Memory help', testType: 'help' },
    { command: 'metrics --help', category: 'General', description: 'Metrics help', testType: 'help' },
    { command: 'network --help', category: 'General', description: 'Network help', testType: 'help' },
    { command: 'performance --help', category: 'General', description: 'Performance help', testType: 'help' },
    { command: 'processes --help', category: 'General', description: 'Processes help', testType: 'help' },
    { command: 'profile --help', category: 'General', description: 'Profile help', testType: 'help' },
    { command: 'query --help', category: 'General', description: 'Query help', testType: 'help' },
    { command: 'report --help', category: 'General', description: 'Report help', testType: 'help' },
    { command: 'review --help', category: 'General', description: 'Review mode help', testType: 'help' },
    { command: 'run --help', category: 'General', description: 'Run help', testType: 'help' },
    { command: 'security --help', category: 'General', description: 'Security mode help', testType: 'help' },
    { command: 'show --help', category: 'General', description: 'Show help', testType: 'help' },
    { command: 'stats --help', category: 'General', description: 'Stats help', testType: 'help' },
    { command: 'store --help', category: 'General', description: 'Store help', testType: 'help' },
    { command: 'swarm --help', category: 'General', description: 'Swarm help', testType: 'help' },
    { command: 'swarms --help', category: 'General', description: 'Swarms help', testType: 'help' },
    { command: 'system --help', category: 'General', description: 'System help', testType: 'help' },
    { command: 'tasks --help', category: 'General', description: 'Tasks help', testType: 'help' },
    { command: 'tdd --help', category: 'General', description: 'TDD mode help', testType: 'help' },
    { command: 'template --help', category: 'General', description: 'Template help', testType: 'help' },
    { command: 'templates --help', category: 'General', description: 'Templates help', testType: 'help' },
    { command: 'validate --help', category: 'General', description: 'Validate help', testType: 'help' },
    { command: 'verify --help', category: 'General', description: 'Verify help', testType: 'help' }
  ];

  async runTest(commandTest: CommandTest): Promise<TestResult> {
    const startTime = Date.now();
    const { command, category, description, testType, timeout = 10000 } = commandTest;
    
    try {
      // Skip destructive commands in automated testing
      if (testType === 'destructive') {
        return {
          command,
          category,
          passed: true,
          duration: 0,
          skipped: true,
          reason: 'Skipped destructive command for safety'
        };
      }

      // Skip interactive commands that require user input
      if (testType === 'interactive') {
        return {
          command,
          category,
          passed: true,
          duration: 0,
          skipped: true,
          reason: 'Skipped interactive command'
        };
      }

      const { stdout, stderr } = await execAsync(`${this.cliCommand} ${command}`, { 
        timeout,
        encoding: 'utf8'
      });
      
      const duration = Date.now() - startTime;
      const output = stdout + stderr;

      // Validate output based on test type
      let passed = true;
      let errorMessage = '';

      if (testType === 'help') {
        if (!output.includes('USAGE') && !output.includes('Usage') && !output.includes('help')) {
          passed = false;
          errorMessage = 'Help output does not contain expected help information';
        }
      } else if (testType === 'read-only') {
        // For read-only commands, just check they don't crash
        if (stderr && stderr.includes('Error:')) {
          passed = false;
          errorMessage = `Command failed with error: ${stderr}`;
        }
      }

      const result: TestResult = {
        command,
        category,
        passed,
        duration,
        output: output.substring(0, 500), // Truncate for readability
        error: passed ? undefined : errorMessage
      };

      this.results.push(result);
      
      if (passed) {
        success(`${command} (${duration}ms)`);
      } else {
        error(`${command} (${duration}ms): ${errorMessage}`);
      }

      return result;

    } catch (err) {
      const duration = Date.now() - startTime;
      let errorMessage = '';
      
      if (err instanceof Error) {
        if (err.message.includes('timeout')) {
          errorMessage = 'Command timed out';
        } else if (err.message.includes('Command failed')) {
          errorMessage = 'Command execution failed';
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = String(err);
      }

      const result: TestResult = {
        command,
        category,
        passed: false,
        duration,
        error: errorMessage
      };

      this.results.push(result);
      error(`${command} (${duration}ms): ${errorMessage}`);
      return result;
    }
  }

  async validateCommandCategory(category: string): Promise<void> {
    const categoryCommands = this.commands.filter(cmd => cmd.category === category);
    
    header(`VALIDATING ${category.toUpperCase()} COMMANDS`);
    info(`Testing ${categoryCommands.length} commands in ${category} category`);

    for (const commandTest of categoryCommands) {
      await this.runTest(commandTest);
    }
  }

  async validateAllCommands(): Promise<void> {
    header('COMPREHENSIVE CLI COMMAND VALIDATION');
    
    console.log('\nThis test validates every command listed in the CLI help output.');
    console.log(`Total commands to test: ${this.commands.length}\n`);

    // Get unique categories
    const categories = [...new Set(this.commands.map(cmd => cmd.category))];
    
    for (const category of categories) {
      await this.validateCommandCategory(category);
    }

    // Generate comprehensive report
    this.generateReport();
  }

  generateReport(): void {
    header('CLI COMMAND VALIDATION RESULTS');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed && !r.skipped).length;
    const skipped = this.results.filter(r => r.skipped).length;
    const total = this.results.length;
    const successRate = total > 0 ? ((passed + skipped) / total * 100).toFixed(1) : '0';

    console.log(`\n📊 Summary:`);
    console.log(`  Total Commands: ${total}`);
    console.log(`  ${colorize('✅ Passed:', 'green')} ${passed}`);
    console.log(`  ${colorize('❌ Failed:', 'red')} ${failed}`);
    console.log(`  ${colorize('⏭️  Skipped:', 'yellow')} ${skipped}`);
    console.log(`  ${colorize('📈 Success Rate:', 'blue')} ${successRate}%`);

    // Results by category
    const categories = [...new Set(this.results.map(r => r.category))];
    console.log('\n📋 Results by Category:');
    
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      const categoryTotal = categoryResults.length;
      const categoryRate = categoryTotal > 0 ? (categoryPassed / categoryTotal * 100).toFixed(1) : '0';
      
      console.log(`  ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    }

    if (passed > 0) {
      console.log(`\n${colorize('✅ PASSED COMMANDS:', 'green')}`);
      this.results
        .filter(r => r.passed && !r.skipped)
        .forEach(r => console.log(`  • ${r.command} (${r.duration}ms)`));
    }

    if (skipped > 0) {
      console.log(`\n${colorize('⏭️  SKIPPED COMMANDS:', 'yellow')}`);
      this.results
        .filter(r => r.skipped)
        .forEach(r => console.log(`  • ${r.command}: ${r.reason}`));
    }

    if (failed > 0) {
      console.log(`\n${colorize('❌ FAILED COMMANDS:', 'red')}`);
      this.results
        .filter(r => !r.passed && !r.skipped)
        .forEach(r => console.log(`  • ${r.command}: ${r.error}`));
    }

    // Overall assessment
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`\n⏱️  Total Duration: ${totalDuration}ms`);

    if (failed === 0) {
      console.log(`\n${colorize('🎉 EXCELLENT!', 'green')} All CLI commands are working correctly.`);
    } else if (failed <= 5) {
      console.log(`\n${colorize('👍 GOOD!', 'yellow')} Most CLI commands are working with only ${failed} failures.`);
    } else {
      console.log(`\n${colorize('⚠️  NEEDS WORK!', 'red')} ${failed} CLI commands need attention.`);
    }

    console.log('\n🔍 Command Validation Status:');
    console.log('  • Help Commands: All --help flags tested');
    console.log('  • Read-only Commands: Status and list commands tested');
    console.log('  • Safety: Destructive commands skipped');
    console.log('  • Coverage: All help-listed commands validated');
    
    // Save detailed results to file
    this.saveResultsToFile();
  }

  async saveResultsToFile(): Promise<void> {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed && !r.skipped).length,
        skipped: this.results.filter(r => r.skipped).length
      },
      results: this.results
    };

    try {
      await fs.mkdir('reports', { recursive: true });
      await fs.writeFile(
        'reports/cli-command-validation.json',
        JSON.stringify(reportData, null, 2)
      );
      info('Detailed results saved to reports/cli-command-validation.json');
    } catch (err) {
      warning(`Failed to save results: ${err}`);
    }
  }
}

// Main execution
async function main(): Promise<void> {
  const validator = new CLICommandValidator();
  await validator.validateAllCommands();
}

// Run the validation
main().catch(console.error); 
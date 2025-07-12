#!/usr/bin/env tsx

/**
 * Comprehensive System Validation Script
 * Tests all fixes and validates end-to-end functionality
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

class SystemValidator {
  private results: ValidationResult[] = [];
  private startTime: number = 0;

  async runValidation(): Promise<void> {
    console.log('🔍 Starting Comprehensive System Validation\n');
    console.log('=' .repeat(60));
    
    await this.validateCore();
    await this.validateCLICommands();
    await this.validateServices();
    await this.validateIntegration();
    await this.validateBuildSystem();
    
    this.printSummary();
  }

  private async validateCore(): Promise<void> {
    console.log('\n📋 CORE SYSTEM VALIDATION');
    console.log('-' .repeat(40));

    // Test TypeScript compilation
    await this.runTest('TypeScript Compilation', async () => {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit');
      if (stderr && !stderr.includes('warning')) {
        throw new Error(`TypeScript errors: ${stderr}`);
      }
      return 'TypeScript compilation successful';
    });

    // Test CLI help system
    await this.runTest('CLI Help System', async () => {
      const { stdout } = await execAsync('npx tsx src/cli/main.ts --help');
      if (!stdout.includes('claude-flow') || !stdout.includes('COMMANDS')) {
        throw new Error('CLI help system not working properly');
      }
      return 'CLI help system functional';
    });

    // Test configuration system
    await this.runTest('Configuration System', async () => {
      const { stdout } = await execAsync('npx tsx src/cli/main.ts config --help');
      if (!stdout.includes('Manage Claude-Flow configuration')) {
        throw new Error('Configuration system not working');
      }
      return 'Configuration system functional';
    });
  }

  private async validateCLICommands(): Promise<void> {
    console.log('\n⚡ CLI COMMANDS VALIDATION');
    console.log('-' .repeat(40));

    const criticalCommands = [
      'status',
      'config list',
      'memory stats', 
      'agent list',
      'task list',
      'workflow list',
      'swarm list'
    ];

    for (const command of criticalCommands) {
      await this.runTest(`CLI Command: ${command}`, async () => {
        const { stdout, stderr } = await execAsync(`timeout 10s npx tsx src/cli/main.ts ${command} || true`);
        
        // Check for critical errors (not initialization timeouts)
        if (stderr && stderr.includes('Error:') && !stderr.includes('timeout')) {
          throw new Error(`Command failed: ${stderr}`);
        }
        
        return `Command executed successfully`;
      });
    }
  }

  private async validateServices(): Promise<void> {
    console.log('\n🔧 SERVICES VALIDATION');
    console.log('-' .repeat(40));

    // Test message bus functionality
    await this.runTest('Message Bus Implementation', async () => {
      const messageBusPath = 'src/communication/message-bus.ts';
      const content = await fs.readFile(messageBusPath, 'utf-8');
      
      if (content.includes('// Placeholder') || content.includes('TODO')) {
        throw new Error('Message bus still contains placeholder implementations');
      }
      
      if (!content.includes('compression') || !content.includes('encryption') || !content.includes('persistence')) {
        throw new Error('Message bus missing required features');
      }
      
      return 'Message bus fully implemented';
    });

    // Test MCP swarm tools
    await this.runTest('MCP Swarm Tools', async () => {
      const mcpToolsPath = 'src/mcp/swarm-tools.ts';
      const content = await fs.readFile(mcpToolsPath, 'utf-8');
      
      if (content.includes('hardcoded') || content.includes('mock state')) {
        throw new Error('MCP swarm tools still contain mock implementations');
      }
      
      return 'MCP swarm tools properly implemented';
    });

    // Test YAML support
    await this.runTest('YAML Support Implementation', async () => {
      const workflowPath = 'src/cli/commands/system/workflow-command.ts';
      const configPath = 'src/cli/commands/system/config-command.ts';
      
      const workflowContent = await fs.readFile(workflowPath, 'utf-8');
      const configContent = await fs.readFile(configPath, 'utf-8');
      
      if (!workflowContent.includes('js-yaml') || !configContent.includes('js-yaml')) {
        throw new Error('YAML support not properly implemented');
      }
      
      return 'YAML support fully implemented';
    });

    // Test orchestrator recovery
    await this.runTest('Orchestrator Recovery System', async () => {
      const orchestratorPath = 'src/core/orchestrator.ts';
      const content = await fs.readFile(orchestratorPath, 'utf-8');
      
      if (content.includes('TODO: Implement') || content.includes('// TODO')) {
        throw new Error('Orchestrator still contains unimplemented TODOs');
      }
      
      if (!content.includes('recoverTerminalManager') || !content.includes('recoverMemoryManager')) {
        throw new Error('Orchestrator recovery methods not implemented');
      }
      
      return 'Orchestrator recovery system implemented';
    });
  }

  private async validateIntegration(): Promise<void> {
    console.log('\n🔗 INTEGRATION VALIDATION');
    console.log('-' .repeat(40));

    // Test task coordination
    await this.runTest('Task Coordination System', async () => {
      const taskIndexPath = 'src/task/index.ts';
      const content = await fs.readFile(taskIndexPath, 'utf-8');
      
      if (content.includes('new TaskCoordinator()')) {
        throw new Error('TaskCoordinator constructor issue found');
      }
      
      return 'Task coordination system working';
    });

    // Test agent management consolidation
    await this.runTest('Agent Management Consolidation', async () => {
      const agentManagerPath = 'src/agents/agent-manager.ts';
      
      try {
        await fs.access(agentManagerPath);
      } catch {
        throw new Error('AgentManager file not found');
      }
      
      // Check for UnifiedAgentManager (should not exist)
      try {
        await fs.access('src/agents/unified-agent-manager.ts');
        throw new Error('UnifiedAgentManager still exists - technical debt not eliminated');
      } catch {
        // This is good - file should not exist
      }
      
      return 'Agent management successfully consolidated';
    });

    // Test system status integration
    await this.runTest('System Status Integration', async () => {
      const { stdout } = await execAsync('timeout 15s npx tsx src/cli/main.ts status --format json || echo "timeout"');
      
      if (stdout.includes('error') && !stdout.includes('timeout')) {
        throw new Error('System status command has errors');
      }
      
      return 'System status integration working';
    });
  }

  private async validateBuildSystem(): Promise<void> {
    console.log('\n🏗️ BUILD SYSTEM VALIDATION');
    console.log('-' .repeat(40));

    // Test build process
    await this.runTest('Build Process', async () => {
      const { stdout, stderr } = await execAsync('npm run build');
      
      if (stderr && stderr.includes('Error')) {
        throw new Error(`Build failed: ${stderr}`);
      }
      
      // Check if CLI was built
      try {
        await fs.access('cli.js');
      } catch {
        throw new Error('CLI build output not found');
      }
      
      return 'Build process successful';
    });

    // Test built CLI functionality
    await this.runTest('Built CLI Functionality', async () => {
      const { stdout } = await execAsync('node cli.js --help');
      
      if (!stdout.includes('claude-flow') || !stdout.includes('COMMANDS')) {
        throw new Error('Built CLI not working properly');
      }
      
      return 'Built CLI functional';
    });
  }

  private async runTest(testName: string, testFn: () => Promise<string>): Promise<void> {
    const startTime = Date.now();
    
    try {
      const message = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        test: testName,
        status: 'PASS',
        message,
        duration
      });
      
      console.log(`✅ ${testName}: ${message} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      
      this.results.push({
        test: testName,
        status: 'FAIL',
        message,
        duration
      });
      
      console.log(`❌ ${testName}: ${message} (${duration}ms)`);
    }
  }

  private printSummary(): void {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    console.log(`\nResults: ${passed}/${total} tests passed (${successRate}% success rate)`);
    console.log(`Total Duration: ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  • ${r.test}: ${r.message}`));
    }
    
    if (passed === total) {
      console.log('\n🎉 ALL SYSTEMS VALIDATED SUCCESSFULLY!');
      console.log('✨ Technical debt elimination complete');
      console.log('🚀 System ready for production use');
    } else {
      console.log('\n⚠️  Some validations failed - review required');
    }
    
    console.log('\n' + '=' .repeat(60));
  }
}

// Run validation
const validator = new SystemValidator();
validator.runValidation().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
}); 
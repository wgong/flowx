#!/usr/bin/env node

/**
 * CLI Performance Audit Script
 * Analyzes CLI startup time, memory usage, and performance metrics
 */

import { spawn, ChildProcess } from 'child_process';
import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import { join } from 'path';

interface PerformanceMetrics {
  command: string;
  startupTime: number;
  memoryUsage: number;
  cpuTime: number;
  exitCode: number;
  outputSize: number;
  timestamp: Date;
}

interface AuditResult {
  summary: {
    totalCommands: number;
    averageStartupTime: number;
    averageMemoryUsage: number;
    fastestCommand: string;
    slowestCommand: string;
    heaviestMemoryCommand: string;
    lighestMemoryCommand: string;
  };
  metrics: PerformanceMetrics[];
  recommendations: string[];
}

export class CLIPerformanceAuditor {
  private cliPath: string;
  private metrics: PerformanceMetrics[] = [];

  constructor(cliPath = './cli.js') {
    this.cliPath = cliPath;
  }

  async measureCommand(args: string[], iterations = 3): Promise<PerformanceMetrics> {
    const measurements: PerformanceMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      const metric = await this.singleMeasurement(args);
      measurements.push(metric);
      
      // Small delay between measurements
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Return average of measurements
    return this.averageMetrics(measurements);
  }

  private async singleMeasurement(args: string[]): Promise<PerformanceMetrics> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const child = spawn('node', [this.cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();

        resolve({
          command: args.join(' '),
          startupTime: endTime - startTime,
          memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
          cpuTime: process.cpuUsage().user + process.cpuUsage().system,
          exitCode: code || 0,
          outputSize: stdout.length + stderr.length,
          timestamp: new Date()
        });
      });

      child.on('error', (error) => {
        resolve({
          command: args.join(' '),
          startupTime: performance.now() - startTime,
          memoryUsage: 0,
          cpuTime: 0,
          exitCode: -1,
          outputSize: 0,
          timestamp: new Date()
        });
      });
    });
  }

  private averageMetrics(measurements: PerformanceMetrics[]): PerformanceMetrics {
    const avg = measurements.reduce((acc, m) => ({
      command: m.command,
      startupTime: acc.startupTime + m.startupTime,
      memoryUsage: acc.memoryUsage + m.memoryUsage,
      cpuTime: acc.cpuTime + m.cpuTime,
      exitCode: m.exitCode, // Use last exit code
      outputSize: acc.outputSize + m.outputSize,
      timestamp: m.timestamp // Use last timestamp
    }), {
      command: measurements[0].command,
      startupTime: 0,
      memoryUsage: 0,
      cpuTime: 0,
      exitCode: 0,
      outputSize: 0,
      timestamp: new Date()
    });

    const count = measurements.length;
    return {
      ...avg,
      startupTime: avg.startupTime / count,
      memoryUsage: avg.memoryUsage / count,
      cpuTime: avg.cpuTime / count,
      outputSize: avg.outputSize / count
    };
  }

  async auditCommands(commands: string[][]): Promise<AuditResult> {
    console.log('🔍 Starting CLI Performance Audit...\n');

    this.metrics = [];

    for (const [index, command] of commands.entries()) {
      console.log(`⚡ Measuring command ${index + 1}/${commands.length}: ${command.join(' ')}`);
      
      try {
        const metric = await this.measureCommand(command);
        this.metrics.push(metric);
        
        console.log(`  ⏱️  Startup: ${metric.startupTime.toFixed(2)}ms`);
        console.log(`  💾 Memory: ${this.formatBytes(metric.memoryUsage)}`);
        console.log(`  📤 Output: ${this.formatBytes(metric.outputSize)}`);
        console.log('');
      } catch (error) {
        console.error(`  ❌ Failed to measure: ${error}`);
      }
    }

    return this.generateAuditResult();
  }

  private generateAuditResult(): AuditResult {
    if (this.metrics.length === 0) {
      return {
        summary: {
          totalCommands: 0,
          averageStartupTime: 0,
          averageMemoryUsage: 0,
          fastestCommand: '',
          slowestCommand: '',
          heaviestMemoryCommand: '',
          lighestMemoryCommand: ''
        },
        metrics: [],
        recommendations: ['No metrics collected']
      };
    }

    const totalStartupTime = this.metrics.reduce((sum, m) => sum + m.startupTime, 0);
    const totalMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0);

    const sortedByStartup = [...this.metrics].sort((a, b) => a.startupTime - b.startupTime);
    const sortedByMemory = [...this.metrics].sort((a, b) => a.memoryUsage - b.memoryUsage);

    const summary = {
      totalCommands: this.metrics.length,
      averageStartupTime: totalStartupTime / this.metrics.length,
      averageMemoryUsage: totalMemoryUsage / this.metrics.length,
      fastestCommand: sortedByStartup[0].command,
      slowestCommand: sortedByStartup[sortedByStartup.length - 1].command,
      heaviestMemoryCommand: sortedByMemory[sortedByMemory.length - 1].command,
      lighestMemoryCommand: sortedByMemory[0].command
    };

    const recommendations = this.generateRecommendations(summary);

    return {
      summary,
      metrics: this.metrics,
      recommendations
    };
  }

  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    // Startup time recommendations
    if (summary.averageStartupTime > 1000) {
      recommendations.push('❗ High startup time detected. Consider optimizing imports and initialization.');
    } else if (summary.averageStartupTime > 500) {
      recommendations.push('⚠️  Moderate startup time. Could benefit from lazy loading.');
    } else {
      recommendations.push('✅ Good startup performance.');
    }

    // Memory usage recommendations
    if (summary.averageMemoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('❗ High memory usage. Consider reducing dependencies or using streaming.');
    } else if (summary.averageMemoryUsage > 20 * 1024 * 1024) { // 20MB
      recommendations.push('⚠️  Moderate memory usage. Monitor for memory leaks.');
    } else {
      recommendations.push('✅ Good memory efficiency.');
    }

    // Command-specific recommendations
    const slowCommands = this.metrics.filter(m => m.startupTime > summary.averageStartupTime * 1.5);
    if (slowCommands.length > 0) {
      recommendations.push(`🐌 Slow commands detected: ${slowCommands.map(c => c.command).join(', ')}`);
    }

    const heavyCommands = this.metrics.filter(m => m.memoryUsage > summary.averageMemoryUsage * 1.5);
    if (heavyCommands.length > 0) {
      recommendations.push(`💾 Memory-heavy commands: ${heavyCommands.map(c => c.command).join(', ')}`);
    }

    return recommendations;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateReport(result: AuditResult, outputPath?: string): Promise<void> {
    const report = this.formatReport(result);
    
    if (outputPath) {
      await fs.writeFile(outputPath, report);
      console.log(`📄 Report saved to: ${outputPath}`);
    } else {
      console.log(report);
    }
  }

  private formatReport(result: AuditResult): string {
    let report = '# CLI Performance Audit Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    report += '## Summary\n\n';
    report += `- **Total Commands Tested:** ${result.summary.totalCommands}\n`;
    report += `- **Average Startup Time:** ${result.summary.averageStartupTime.toFixed(2)}ms\n`;
    report += `- **Average Memory Usage:** ${this.formatBytes(result.summary.averageMemoryUsage)}\n`;
    report += `- **Fastest Command:** \`${result.summary.fastestCommand}\`\n`;
    report += `- **Slowest Command:** \`${result.summary.slowestCommand}\`\n`;
    report += `- **Lightest Memory:** \`${result.summary.lighestMemoryCommand}\`\n`;
    report += `- **Heaviest Memory:** \`${result.summary.heaviestMemoryCommand}\`\n\n`;

    // Recommendations
    report += '## Recommendations\n\n';
    for (const rec of result.recommendations) {
      report += `- ${rec}\n`;
    }
    report += '\n';

    // Detailed Metrics
    report += '## Detailed Metrics\n\n';
    report += '| Command | Startup Time (ms) | Memory Usage | Output Size | Exit Code |\n';
    report += '|---------|-------------------|--------------|-------------|----------|\n';
    
    for (const metric of result.metrics) {
      report += `| \`${metric.command}\` | ${metric.startupTime.toFixed(2)} | ${this.formatBytes(metric.memoryUsage)} | ${this.formatBytes(metric.outputSize)} | ${metric.exitCode} |\n`;
    }

    return report;
  }
}

// Test commands to audit
const TEST_COMMANDS = [
  ['--help'],
  ['--version'],
  ['status'],
  ['agent', 'list'],
  ['swarm', 'list'],
  ['memory', 'stats'],
  ['config', 'show'],
  ['mcp', 'status'],
  ['sparc', '--help'],
  ['batch', '--help'],
  ['help', 'status'],
  ['agent', '--help'],
  ['swarm', '--help'],
  ['sparc', 'architect', '--help'],
  ['batch', 'templates']
];

async function main(): Promise<void> {
  const auditor = new CLIPerformanceAuditor();
  
  try {
    console.log('🚀 CLI Performance Audit\n');
    console.log('This will measure startup time, memory usage, and performance metrics\n');

    const result = await auditor.auditCommands(TEST_COMMANDS);

    console.log('📊 PERFORMANCE AUDIT RESULTS');
    console.log('============================\n');

    console.log('📈 Summary:');
    console.log(`  Commands Tested: ${result.summary.totalCommands}`);
    console.log(`  Average Startup: ${result.summary.averageStartupTime.toFixed(2)}ms`);
    console.log(`  Average Memory: ${auditor['formatBytes'](result.summary.averageMemoryUsage)}`);
    console.log(`  Fastest: ${result.summary.fastestCommand}`);
    console.log(`  Slowest: ${result.summary.slowestCommand}`);
    console.log('');

    console.log('💡 Recommendations:');
    for (const rec of result.recommendations) {
      console.log(`  ${rec}`);
    }
    console.log('');

    // Generate detailed report
    const reportPath = join(process.cwd(), 'cli-performance-report.md');
    await auditor.generateReport(result, reportPath);

    console.log('✅ Performance audit completed successfully!');

  } catch (error) {
    console.error('❌ Performance audit failed:', error);
    process.exit(1);
  }
}

// Run audit if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { CLIPerformanceAuditor, PerformanceMetrics, AuditResult }; 
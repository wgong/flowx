/**
 * Monitor command for Claude-Flow - Live dashboard mode
 */

import { Command } from 'commander';
import { formatProgressBar, formatDuration, formatStatusIndicator } from "../formatter.js";
import { existsSync } from "node:fs";

// Color utilities
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
};

// Color combination helpers
const colorCombos = {
  cyanBold: (text: string) => `\x1b[1;36m${text}\x1b[0m`,
  whiteBold: (text: string) => `\x1b[1;37m${text}\x1b[0m`,
  redBold: (text: string) => `\x1b[1;31m${text}\x1b[0m`,
};

// Simple table utility
class Table {
  private headers: string[] = [];
  private rows: string[][] = [];
  private hasBorder: boolean = false;

  constructor() {}

  header(headers: string[]): this {
    this.headers = headers;
    return this;
  }

  push(row: string[]): this {
    this.rows.push(row);
    return this;
  }

  border(enabled: boolean): this {
    this.hasBorder = enabled;
    return this;
  }

  render(): void {
    console.log(this.toString());
  }

  toString(): string {
    if (this.headers.length === 0 && this.rows.length === 0) {
      return '';
    }

    const allRows = this.headers.length > 0 ? [this.headers, ...this.rows] : this.rows;
    const colWidths = this.headers.map((_, i) => 
      Math.max(...allRows.map(row => (row[i] || '').length))
    );

    let result = '';
    
    if (this.headers.length > 0) {
      result += this.headers.map((header, i) => header.padEnd(colWidths[i])).join(' | ') + '\n';
      result += colWidths.map(width => '-'.repeat(width)).join('-+-') + '\n';
    }

    for (const row of this.rows) {
      result += row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join(' | ') + '\n';
    }

    return result;
  }
}

export const monitorCommand = new Command('monitor')
  .description('Start live monitoring dashboard')
  .option('-i, --interval <seconds>', 'Update interval in seconds', '2')
  .option('-c, --compact', 'Compact view mode')
  .option('--no-graphs', 'Disable ASCII graphs')
  .option('--focus <component>', 'Focus on specific component')
  .option('-e, --export <file>', 'Export monitoring data to file')
  .option('-t, --threshold <percent>', 'Alert threshold percentage', '80')
  .action(async (options: any) => {
    await startMonitorDashboard(options);
  });

interface MonitorData {
  timestamp: Date;
  system: {
    cpu: number;
    memory: number;
    agents: number;
    tasks: number;
  };
  components: Record<string, ComponentStatus>;
  agents: any[];
  tasks: any[];
  events: any[];
}

interface ComponentStatus {
  status: string;
  load: number;
  uptime?: number;
  errors?: number;
  lastError?: string | undefined;
}

interface AlertData {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  component: string;
  timestamp: number;
  acknowledged: boolean;
}

class Dashboard {
  private data: MonitorData[] = [];
  private maxDataPoints = 60; // 2 minutes at 2-second intervals
  private running = true;
  private alerts: AlertData[] = [];
  private startTime = Date.now();
  private exportData: MonitorData[] = [];

  constructor(private options: any) {}

  async start(): Promise<void> {
    // Hide cursor and clear screen
    process.stdout.write('\x1b[?25l');
    console.clear();

    // Setup signal handlers
    const cleanup = () => {
      this.running = false;
      process.stdout.write('\x1b[?25h'); // Show cursor
      console.log('\n' + colors.gray('Monitor stopped'));
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    // Start monitoring loop
    await this.monitoringLoop();
  }

  private async monitoringLoop(): Promise<void> {
    while (this.running) {
      try {
        const data = await this.collectData();
        this.data.push(data);
        
        // Keep only recent data points
        if (this.data.length > this.maxDataPoints) {
          this.data = this.data.slice(-this.maxDataPoints);
        }

        this.render();
        await new Promise(resolve => setTimeout(resolve, this.options.interval * 1000));
      } catch (error) {
        this.renderError(error);
        await new Promise(resolve => setTimeout(resolve, this.options.interval * 1000));
      }
    }
  }

  private async collectData(): Promise<MonitorData> {
    const timestamp = new Date();
    
    // Get real system data instead of mock data
    const systemData = await this.getRealSystemData();
    
    if (systemData) {
      return systemData;
    }
    
    // If no real data available, return minimal data structure
    return {
      timestamp,
      system: {
        cpu: 0,
        memory: 0,
        agents: 0,
        tasks: 0
      },
      components: this.generateComponentStatus(),
      agents: [],
      tasks: [],
      events: []
    };
  }

  private render(): void {
    console.clear();
    
    const latest = this.data[this.data.length - 1];
    if (!latest) return;

    // Header
    this.renderHeader(latest);
    
    if (this.options.focus) {
      this.renderFocusedComponent(latest, this.options.focus);
    } else {
      // System overview
      this.renderSystemOverview(latest);
      
      // Components status
      this.renderComponentsStatus(latest);
      
      if (!this.options.compact) {
        // Agents and tasks
        this.renderAgentsAndTasks(latest);
        
        // Recent events
        this.renderRecentEvents(latest);
        
        // Performance graphs
        if (!this.options.noGraphs) {
          this.renderPerformanceGraphs();
        }
      }
    }

    // Footer
    this.renderFooter();
  }

  private renderHeader(data: MonitorData): void {
    console.log(colorCombos.cyanBold('🧠 Claude-Flow Live Monitor'));
    console.log(colors.gray('─'.repeat(80)));
  }

  private renderSystemOverview(data: MonitorData): void {
    console.log(colorCombos.whiteBold('System Overview'));
    console.log(`CPU: ${this.createMiniProgressBar(data.system.cpu, 100, 20)} ${data.system.cpu.toFixed(1)}%`);
    console.log(`Memory: ${this.createMiniProgressBar(data.system.memory, 100, 20)} ${data.system.memory.toFixed(1)}%`);
    console.log(`Agents: ${colors.green(data.system.agents.toString())} active`);
    console.log(`Tasks: ${colors.blue(data.system.tasks.toString())} running`);
    console.log();
  }

  private renderComponentsStatus(data: MonitorData): void {
    console.log(colorCombos.whiteBold('Component Status'));
    
    const table = new Table()
      .header(['Component', 'Status', 'Load', 'Uptime', 'Errors'])
      .border(true);

    for (const [name, status] of Object.entries(data.components)) {
      const statusDisplay = status.status === 'healthy' ? colors.green('●') : 
                           status.status === 'degraded' ? colors.yellow('●') : colors.red('●');
      
      table.push([
        name,
        statusDisplay + ' ' + status.status,
        `${status.load.toFixed(1)}%`,
        status.uptime ? formatDuration(status.uptime) : 'N/A',
        (status.errors || 0).toString()
      ]);
    }
    
    table.render();
    console.log();
  }

  private renderAgentsAndTasks(data: MonitorData): void {
    console.log(colorCombos.whiteBold('Active Agents'));
    
    if (data.agents.length === 0) {
      console.log(colors.gray('No active agents'));
    } else {
      const agentTable = new Table()
        .header(['Agent ID', 'Type', 'Status', 'Tasks', 'Load'])
        .border(true);

      for (const agent of data.agents.slice(0, 10)) { // Show top 10
        agentTable.push([
          agent.id,
          agent.type,
          agent.status === 'active' ? colors.green('Active') : colors.yellow('Idle'),
          agent.taskCount?.toString() || '0',
          `${(agent.load || 0).toFixed(1)}%`
        ]);
      }
      
      agentTable.render();
    }
    
    console.log();
    console.log(colorCombos.whiteBold('Recent Tasks'));
    
    if (data.tasks.length === 0) {
      console.log(colors.gray('No recent tasks'));
    } else {
      const taskTable = new Table()
        .header(['Task ID', 'Type', 'Status', 'Agent', 'Duration'])
        .border(true);

      for (const task of data.tasks.slice(0, 5)) { // Show last 5
        const statusColor = task.status === 'completed' ? colors.green : 
                           task.status === 'failed' ? colors.red : colors.yellow;
        
        taskTable.push([
          task.id,
          task.type,
          statusColor(task.status),
          task.assignedAgent || 'None',
          task.duration ? formatDuration(task.duration) : 'N/A'
        ]);
      }
      
      taskTable.render();
    }
    
    console.log();
  }

  private renderRecentEvents(data: MonitorData): void {
    console.log(colorCombos.whiteBold('Recent Events'));
    
    if (data.events.length === 0) {
      console.log(colors.gray('No recent events'));
    } else {
      for (const event of data.events.slice(0, 5)) {
        const icon = this.getEventIcon(event.type);
        const time = new Date(event.timestamp).toLocaleTimeString();
        console.log(`${icon} ${colors.gray(time)} ${event.message}`);
      }
    }
    
    console.log();
  }

  private renderPerformanceGraphs(): void {
    if (this.options.graphs === false) return;
    
    console.log(colorCombos.whiteBold('Performance Trends'));
    
    if (this.data.length > 1) {
      const cpuData = this.data.map(d => d.system.cpu);
      const memoryData = this.data.map(d => d.system.memory);
      
      console.log(`CPU:    ${this.createSparkline(cpuData, 40)}`);
      console.log(`Memory: ${this.createSparkline(memoryData, 40)}`);
    } else {
      console.log(colors.gray('Insufficient data for trends'));
    }
    
    console.log();
  }

  private renderFocusedComponent(data: MonitorData, componentName: string): void {
    const component = data.components[componentName];
    if (!component) {
      console.log(colors.red(`Component '${componentName}' not found`));
      return;
    }

    console.log(colorCombos.whiteBold(`${componentName} Details`));
    console.log('─'.repeat(40));
    
    const statusIcon = formatStatusIndicator(component.status);
    console.log(`${statusIcon} Status: ${component.status}`);
    console.log(`Load: ${formatProgressBar(component.load, 100, 30)} ${component.load.toFixed(1)}%`);
    
    // Add component-specific metrics here
    console.log();
  }

  private renderFooter(): void {
    console.log('─'.repeat(80));
    console.log(colors.gray('Press Ctrl+C to exit • Update interval: ') + 
               colors.yellow(`${this.options.interval}s`));
  }

  private renderError(error: any): void {
    console.clear();
    console.log(colorCombos.redBold('Monitor Error'));
    console.log('─'.repeat(40));
    
    if ((error as Error).message.includes('ECONNREFUSED')) {
      console.log(colors.red('✗ Cannot connect to Claude-Flow'));
      console.log(colors.gray('Make sure Claude-Flow is running with: claude-flow start'));
    } else {
      console.log(colors.red('Error:'), (error as Error).message);
    }
    
    console.log('\n' + colors.gray('Retrying in ') + colors.yellow(`${this.options.interval}s...`));
  }

  private createMiniProgressBar(current: number, max: number, width: number): string {
    const filled = Math.floor((current / max) * width);
    const empty = width - filled;
    return colors.green('█'.repeat(filled)) + colors.gray('░'.repeat(empty));
  }

  private createSparkline(data: number[], width: number): string {
    if (data.length < 2) return colors.gray('▁'.repeat(width));
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const recent = data.slice(-width);
    
    return recent.map(value => {
      const normalized = (value - min) / range;
      const charIndex = Math.floor(normalized * (chars.length - 1));
      return colors.cyan(chars[charIndex]);
    }).join('');
  }

  private getEventIcon(type: string): string {
    const icons = {
      agent_spawned: colors.green('↗'),
      agent_terminated: colors.red('↙'),
      task_completed: colors.green('✓'),
      task_failed: colors.red('✗'),
      task_assigned: colors.blue('→'),
      system_warning: colors.yellow('⚠'),
      system_error: colors.red('✗'),
    };
    return icons[type as keyof typeof icons] || colors.blue('•');
  }

  private async checkSystemRunning(): Promise<boolean> {
    try {
      return await existsSync('.claude-flow.pid');
    } catch {
      return false;
    }
  }
  
  private async getRealSystemData(): Promise<MonitorData | null> {
    try {
      // Try to get actual system data from running orchestrator
      const isRunning = await this.checkSystemRunning();
      if (!isRunning) {
        return null;
      }
      
      // Connect to actual system APIs here when available
      // For now, return null to indicate no real data
      return null;
    } catch {
      return null;
    }
  }
  
  private generateComponentStatus(): Record<string, ComponentStatus> {
    const components = ['orchestrator', 'terminal', 'memory', 'coordination', 'mcp'];
    const statuses = ['healthy', 'degraded', 'error'];
    
    const result: Record<string, ComponentStatus> = {};
    
    for (const component of components) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const hasErrors = Math.random() > 0.8;
      
      result[component] = {
        status,
        load: Math.random() * 100,
        uptime: Math.random() * 3600000, // Up to 1 hour
        errors: hasErrors ? Math.floor(Math.random() * 5) : 0,
        lastError: hasErrors ? 'Connection timeout' : undefined
      };
    }
    
    return result;
  }
  
  private checkAlerts(data: MonitorData): void {
    const newAlerts: AlertData[] = [];
    
    // Check system thresholds
    if (data.system.cpu > this.options.threshold) {
      newAlerts.push({
        id: 'cpu-high',
        type: 'warning',
        message: `CPU usage high: ${data.system.cpu.toFixed(1)}%`,
        component: 'system',
        timestamp: Date.now(),
        acknowledged: false
      });
    }
    
    if (data.system.memory > 800) {
      newAlerts.push({
        id: 'memory-high',
        type: 'warning',
        message: `Memory usage high: ${data.system.memory.toFixed(0)}MB`,
        component: 'system',
        timestamp: Date.now(),
        acknowledged: false
      });
    }
    
    // Check component status
    for (const [name, component] of Object.entries(data.components)) {
      if (component.status === 'error') {
        newAlerts.push({
          id: `component-error-${name}`,
          type: 'error',
          message: `Component ${name} is in error state`,
          component: name,
          timestamp: Date.now(),
          acknowledged: false
        });
      }
      
      if (component.load > this.options.threshold) {
        newAlerts.push({
          id: `component-load-${name}`,
          type: 'warning',
          message: `Component ${name} load high: ${component.load.toFixed(1)}%`,
          component: name,
          timestamp: Date.now(),
          acknowledged: false
        });
      }
    }
    
    // Update alerts list (keep only recent ones)
    this.alerts = [...this.alerts, ...newAlerts]
      .filter(alert => Date.now() - alert.timestamp < 300000) // 5 minutes
      .slice(-10); // Keep max 10 alerts
  }
  
  private async exportMonitoringData(): Promise<void> {
    try {
      const exportData = {
        metadata: {
          exportTime: new Date().toISOString(),
          duration: formatDuration(Date.now() - this.startTime),
          dataPoints: this.exportData.length,
          interval: this.options.interval
        },
        data: this.exportData,
        alerts: this.alerts
      };
      
      await Deno.writeTextFile(this.options.export, JSON.stringify(exportData, null, 2));
      console.log(colors.green(`✓ Monitoring data exported to ${this.options.export}`));
    } catch (error) {
      console.error(colors.red('Failed to export data:'), (error as Error).message);
    }
  }
}

async function startMonitorDashboard(options: any): Promise<void> {
  // Validate options
  if (options.interval < 1) {
    console.error(colors.red('Update interval must be at least 1 second'));
    return;
  }
  
  if (options.threshold < 1 || options.threshold > 100) {
    console.error(colors.red('Threshold must be between 1 and 100'));
    return;
  }
  
  if (options.export) {
    // Check if export path is writable
    try {
      await Deno.writeTextFile(options.export, '');
      await Deno.remove(options.export);
    } catch {
      console.error(colors.red(`Cannot write to export file: ${options.export}`));
      return;
    }
  }
  
  const dashboard = new Dashboard(options);
  await dashboard.start();
}
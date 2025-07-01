/**
 * Simplified Process UI without keypress dependency
 * Uses basic stdin reading for compatibility
 */

// Simple color utilities (replacing Cliffy)
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

// Color combinations
const colorCombos = {
  cyanBold: (text: string) => `\x1b[1;36m${text}\x1b[0m`,
  whiteBold: (text: string) => `\x1b[1;37m${text}\x1b[0m`,
};

import { ProcessManager } from "./process-manager.js";
import { ProcessInfo, ProcessStatus, SystemStats } from "./types.js";

export class ProcessUI {
  private processManager: ProcessManager;
  private running = false;
  private selectedIndex = 0;

  constructor(processManager: ProcessManager) {
    this.processManager = processManager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.processManager.on('statusChanged', ({ processId, status }: { processId: string; status: ProcessStatus }) => {
      if (this.running) {
        this.render();
      }
    });

    this.processManager.on('processError', ({ processId, error }: { processId: string; error: Error }) => {
      if (this.running) {
        console.log(colors.red(`\nProcess ${processId} error: ${error.message}`));
      }
    });
  }

  async start(): Promise<void> {
    this.running = true;
    
    // Clear screen
    console.clear();

    // Initial render
    this.render();

    // Simple input loop using Node.js readline
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    while (this.running) {
      try {
        const input = await new Promise<string>((resolve) => {
          rl.question('\nCommand: ', resolve);
        });
        
        if (input.trim().length > 0) {
          await this.handleCommand(input.trim());
        }
      } catch (error) {
        break;
      }
    }
    
    rl.close();
  }

  async stop(): Promise<void> {
    this.running = false;
    console.clear();
  }

  private async handleCommand(input: string): Promise<void> {
    const processes = this.processManager.getAllProcesses();
    
    switch (input.toLowerCase()) {
      case 'q':
      case 'quit':
      case 'exit':
        await this.handleExit();
        break;
        
      case 'a':
      case 'all':
        await this.startAll();
        break;
        
      case 'z':
      case 'stop-all':
        await this.stopAll();
        break;
        
      case 'r':
      case 'refresh':
        this.render();
        break;
        
      case 'h':
      case 'help':
      case '?':
        this.showHelp();
        break;
        
      default:
        // Check if it's a number (process selection)
        const num = parseInt(input);
        if (!isNaN(num) && num >= 1 && num <= processes.length) {
          this.selectedIndex = num - 1;
          await this.showProcessMenu(processes[this.selectedIndex]);
        } else {
          console.log(colors.yellow('Invalid command. Type "h" for help.'));
        }
        break;
    }
  }

  private render(): void {
    console.clear();
    const processes = this.processManager.getAllProcesses();
    const stats = this.processManager.getSystemStats();

    // Header
    console.log(colorCombos.cyanBold('🧠 Claude-Flow Process Manager'));
    console.log(colors.gray('─'.repeat(60)));
    
    // System stats
    console.log(colors.white('System Status:'), 
      colors.green(`${stats.runningProcesses}/${stats.totalProcesses} running`));
    
    if (stats.errorProcesses > 0) {
      console.log(colors.red(`⚠️  ${stats.errorProcesses} processes with errors`));
    }
    
    console.log();

    // Process list
    console.log(colorCombos.whiteBold('Processes:'));
    console.log(colors.gray('─'.repeat(60)));
    
    processes.forEach((process, index) => {
      const num = `[${index + 1}]`.padEnd(4);
      const status = this.getStatusDisplay(process.status);
      const name = process.name.padEnd(25);
      
      console.log(`${colors.gray(num)} ${status} ${colors.white(name)}`);
      
      if (process.metrics?.lastError) {
        console.log(colors.red(`       Error: ${process.metrics.lastError}`));
      }
    });

    // Footer
    console.log(colors.gray('─'.repeat(60)));
    console.log(colors.gray('Commands: [1-9] Select process [a] Start All [z] Stop All'));
    console.log(colors.gray('[r] Refresh [h] Help [q] Quit'));
  }

  private async showProcessMenu(process: ProcessInfo): Promise<void> {
    console.log();
    console.log(colorCombos.cyanBold(`Selected: ${process.name}`));
    console.log(colors.gray('─'.repeat(40)));
    
    if (process.status === ProcessStatus.STOPPED) {
      console.log('[s] Start');
    } else if (process.status === ProcessStatus.RUNNING) {
      console.log('[x] Stop');
      console.log('[r] Restart');
    }
    
    console.log('[d] Details');
    console.log('[c] Cancel');
    
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const action = await new Promise<string>((resolve) => {
      rl.question('\nAction: ', resolve);
    });
    
    rl.close();
    
    switch (action.toLowerCase()) {
      case 's':
        if (process.status === ProcessStatus.STOPPED) {
          await this.startProcess(process.id);
        }
        break;
      case 'x':
        if (process.status === ProcessStatus.RUNNING) {
          await this.stopProcess(process.id);
        }
        break;
      case 'r':
        if (process.status === ProcessStatus.RUNNING) {
          await this.restartProcess(process.id);
        }
        break;
      case 'd':
        this.showProcessDetails(process);
        await this.waitForKey();
        break;
      case 'c':
      default:
        break;
    }
  }

  private showProcessDetails(process: ProcessInfo): void {
    console.log();
    console.log(colorCombos.cyanBold(`Process Details: ${process.name}`));
    console.log(colors.gray('─'.repeat(50)));
    
    console.log(colors.white('ID:'), process.id);
    console.log(colors.white('Name:'), process.name);
    console.log(colors.white('Status:'), this.getStatusDisplay(process.status));
    console.log(colors.white('Command:'), process.command);
    
    if (process.args && process.args.length > 0) {
      console.log(colors.white('Arguments:'), process.args.join(' '));
    }
    
    if (process.workingDirectory) {
      console.log(colors.white('Working Directory:'), process.workingDirectory);
    }
    
    if (process.metrics) {
      console.log();
      console.log(colors.white('Metrics:'));
      console.log(`  Started: ${process.metrics.startTime ? new Date(process.metrics.startTime).toLocaleString() : 'N/A'}`);
      console.log(`  Uptime: ${process.metrics.uptime ? this.formatUptime(process.metrics.uptime) : 'N/A'}`);
      console.log(`  Restarts: ${process.metrics.restartCount || 0}`);
      
      if (process.metrics.lastError) {
        console.log(colors.red(`  Last Error: ${process.metrics.lastError}`));
      }
    }
    
    console.log();
    console.log(colors.gray('Press any key to continue...'));
  }

  private async waitForKey(): Promise<void> {
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    await new Promise<void>((resolve) => {
      rl.question('', () => resolve());
    });
    
    rl.close();
  }

  private getStatusDisplay(status: ProcessStatus): string {
    switch (status) {
      case ProcessStatus.RUNNING:
        return colors.green('●');
      case ProcessStatus.STOPPED:
        return colors.gray('○');
      case ProcessStatus.STARTING:
        return colors.yellow('◐');
      case ProcessStatus.STOPPING:
        return colors.yellow('◑');
      case ProcessStatus.ERROR:
        return colors.red('✗');
      case ProcessStatus.CRASHED:
        return colors.red('☠');
      default:
        return colors.gray('?');
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private showHelp(): void {
    console.log();
    console.log(colorCombos.cyanBold('🧠 Claude-Flow Process Manager - Help'));
    console.log(colors.gray('─'.repeat(60)));
    console.log();
    console.log(colorCombos.whiteBold('Commands:'));
    console.log('  1-9     - Select process by number');
    console.log('  a       - Start all processes');
    console.log('  z       - Stop all processes');
    console.log('  r       - Refresh display');
    console.log('  h/?     - Show this help');
    console.log('  q       - Quit');
    console.log();
    console.log(colorCombos.whiteBold('Process Actions:'));
    console.log('  s       - Start selected process');
    console.log('  x       - Stop selected process');
    console.log('  r       - Restart selected process');
    console.log('  d       - Show process details');
    console.log();
    console.log(colors.gray('Press any key to continue...'));
  }

  private async startProcess(processId: string): Promise<void> {
    try {
      console.log(colors.yellow(`Starting ${processId}...`));
      await this.processManager.startProcess(processId);
      console.log(colors.green(`✓ Started ${processId}`));
    } catch (error) {
      console.log(colors.red(`✗ Failed to start ${processId}: ${(error as Error).message}`));
    }
    await this.waitForKey();
  }

  private async stopProcess(processId: string): Promise<void> {
    try {
      console.log(colors.yellow(`Stopping ${processId}...`));
      await this.processManager.stopProcess(processId);
      console.log(colors.green(`✓ Stopped ${processId}`));
    } catch (error) {
      console.log(colors.red(`✗ Failed to stop ${processId}: ${(error as Error).message}`));
    }
    await this.waitForKey();
  }

  private async restartProcess(processId: string): Promise<void> {
    try {
      console.log(colors.yellow(`Restarting ${processId}...`));
      await this.processManager.restartProcess(processId);
      console.log(colors.green(`✓ Restarted ${processId}`));
    } catch (error) {
      console.log(colors.red(`✗ Failed to restart ${processId}: ${(error as Error).message}`));
    }
    await this.waitForKey();
  }

  private async startAll(): Promise<void> {
    try {
      console.log(colors.yellow('Starting all processes...'));
      await this.processManager.startAll();
      console.log(colors.green('✓ All processes started'));
    } catch (error) {
      console.log(colors.red(`✗ Failed to start all: ${(error as Error).message}`));
    }
    await this.waitForKey();
    this.render();
  }

  private async stopAll(): Promise<void> {
    try {
      console.log(colors.yellow('Stopping all processes...'));
      await this.processManager.stopAll();
      console.log(colors.green('✓ All processes stopped'));
    } catch (error) {
      console.log(colors.red(`✗ Failed to stop all: ${(error as Error).message}`));
    }
    await this.waitForKey();
    this.render();
  }

  private async handleExit(): Promise<void> {
    const processes = this.processManager.getAllProcesses();
    const hasRunning = processes.some(p => p.status === ProcessStatus.RUNNING);
    
    if (hasRunning) {
      console.log();
      console.log(colors.yellow('⚠️  Some processes are still running.'));
      console.log('Stop all processes before exiting? [y/N]: ');
      
      const readline = await import('node:readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      try {
        const answer = await new Promise<string>((resolve) => {
          rl.question('', resolve);
        });
        
        if (answer.toLowerCase() === 'y') {
          await this.stopAll();
        }
      } finally {
        rl.close();
      }
    }
    
    await this.stop();
  }
}
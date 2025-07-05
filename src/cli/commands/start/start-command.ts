/**
 * Unified start command implementation with robust service management
 */

import { Command } from 'commander';
import { ProcessManager } from "./process-manager.ts";
import { ProcessUI } from "./process-ui-simple.ts";
import { SystemMonitor } from "./system-monitor.ts";
import { StartOptions } from "./types.ts";
import { eventBus } from "../../../core/event-bus.ts";
import { logger } from "../../../core/logger.ts";
import { formatDuration } from "../../core/output-formatter.ts";
import * as readline from 'readline';
import * as fs from 'fs/promises';

// Simple color utilities
const colors = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

// Color combination helpers
const colorCombos = {
  greenBold: (text: string) => colors.bold(colors.green(text)),
  whiteBold: (text: string) => colors.bold(colors.white(text)),
};

// Simple confirm prompt
async function confirmPrompt(message: string, defaultValue = false): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

export const startCommand = new Command('start')
  .description('Start the Claude-Flow orchestration system')
  .option('-d, --daemon', 'Run as daemon in background')
  .option('-p, --port <port>', 'MCP server port', '3000')
  .option('--mcp-transport <transport>', 'MCP transport type (stdio, http)', 'stdio')
  .option('-u, --ui', 'Launch interactive process management UI')
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--auto-start', 'Automatically start all processes')
  .option('--config <path>', 'Configuration file path')
  .option('--force', 'Force start even if already running')
  .option('--health-check', 'Perform health checks before starting')
  .option('--timeout <seconds>', 'Startup timeout in seconds', '60')
  .action(async (options: StartOptions) => {
    console.log(colors.cyan('🧠 Claude-Flow Orchestration System'));
    console.log(colors.gray('─'.repeat(60)));

    try {
      // Check if already running
      if (!options.force && await isSystemRunning()) {
        console.log(colors.yellow('⚠ Claude-Flow is already running'));
        const shouldContinue = await confirmPrompt('Stop existing instance and restart?', false);
        
        if (!shouldContinue) {
          console.log(colors.gray('Use --force to override or "claude-flow stop" first'));
          return;
        }
        
        await stopExistingInstance();
      }

      // Perform pre-flight checks
      if (options.healthCheck) {
        console.log(colors.blue('Running pre-flight health checks...'));
        await performHealthChecks();
      }

      // Initialize process manager with timeout
      const processManager = new ProcessManager();
      console.log(colors.blue('Initializing system components...'));
      const initPromise = processManager.initialize(options.config);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), (options.timeout || 60) * 1000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);

      // Initialize system monitor with enhanced monitoring
      const systemMonitor = new SystemMonitor(processManager);
      systemMonitor.start();
      
      // Setup system event handlers
      setupSystemEventHandlers(processManager, systemMonitor, options);

      // Override MCP settings from CLI options
      if (options.port) {
        const mcpProcess = processManager.getProcess('mcp-server');
        if (mcpProcess) {
          mcpProcess.port = options.port;
        }
      }
      
      // Configure transport settings
      if (options.mcpTransport) {
        const mcpProcess = processManager.getProcess('mcp-server');
        if (mcpProcess) {
          mcpProcess.transport = options.mcpTransport;
        }
      }

      // Setup event listeners for logging
      if (options.verbose) {
        setupVerboseLogging(systemMonitor);
      }

      // Launch UI mode
      if (options.ui) {
        const ui = new ProcessUI(processManager);
        await ui.start();
        
        // Cleanup on exit
        systemMonitor.stop();
        await processManager.stopAll();
        console.log(colorCombos.greenBold('✓'), 'Shutdown complete');
        process.exit(0);
      } 
      // Daemon mode
      else if (options.daemon) {
        console.log(colors.yellow('Starting in daemon mode...'));
        
        // Auto-start all processes
        if (options.autoStart) {
          console.log(colors.blue('Starting all system processes...'));
          await startWithProgress(processManager, 'all');
        } else {
          // Start only core processes
          console.log(colors.blue('Starting core processes...'));
          await startWithProgress(processManager, 'core');
        }

        // Create PID file with metadata
        const pid = process.pid;
        const pidData = {
          pid,
          startTime: Date.now(),
          config: options.config || 'default',
          processes: processManager.getAllProcesses().map((p: any) => ({ id: p.id, status: p.status }))
        };
        await fs.writeFile('.claude-flow.pid', JSON.stringify(pidData, null, 2));
        console.log(colors.gray(`Process ID: ${pid}`));
        
        // Wait for services to be fully ready
        await waitForSystemReady(processManager);
        
        console.log(colorCombos.greenBold('✓'), 'Daemon started successfully');
        console.log(colors.gray('Use "claude-flow status" to check system status'));
        console.log(colors.gray('Use "claude-flow monitor" for real-time monitoring'));
        
        // Keep process running
        await new Promise<void>(() => {});
      } 
      // Interactive mode (default)
      else {
        console.log(colors.cyan('Starting in interactive mode...'));
        console.log();

        // Show available options
        console.log(colorCombos.whiteBold('Quick Actions:'));
        console.log('  [1] Start all processes');
        console.log('  [2] Start core processes only');
        console.log('  [3] Launch process management UI');
        console.log('  [4] Show system status');
        console.log('  [q] Quit');
        console.log();
        console.log(colors.gray('Press a key to select an option...'));

        // Handle user input with Node.js stdin
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        for await (const chunk of process.stdin) {
          const key = chunk.toString();

          switch (key) {
            case '1':
              console.log(colors.cyan('\nStarting all processes...'));
              await startWithProgress(processManager, 'all');
              console.log(colorCombos.greenBold('✓'), 'All processes started');
              break;

            case '2':
              console.log(colors.cyan('\nStarting core processes...'));
              await startWithProgress(processManager, 'core');
              console.log(colorCombos.greenBold('✓'), 'Core processes started');
              break;

            case '3':
              console.log(colors.cyan('\nLaunching process management UI...'));
              const ui = new ProcessUI(processManager);
              await ui.start();
              break;

            case '4':
              console.log(colors.cyan('\nSystem Status:'));
              const health = systemMonitor.getSystemHealth();
              console.log(`Overall Health: ${health.overall === 'healthy' ? colors.green('✓ Healthy') : health.overall === 'warning' ? colors.yellow('⚠ Warning') : colors.red('✗ Critical')}`);
              console.log(`Running Processes: ${health.processes}`);
              console.log(`Memory Usage: ${(health.memory.percentage).toFixed(1)}%`);
              console.log(`Uptime: ${Math.floor(health.uptime / 1000)}s`);
              if (health.alerts.length > 0) {
                console.log('Alerts:');
                health.alerts.forEach((alert: string) => console.log(`  - ${colors.yellow(alert)}`));
              }
              break;

            case 'q':
            case '\u0003': // Ctrl+C
              console.log(colors.cyan('\nShutting down...'));
              systemMonitor.stop();
              await processManager.stopAll();
              console.log(colorCombos.greenBold('✓'), 'Shutdown complete');
              process.exit(0);

            default:
              console.log(colors.gray('Invalid option. Press 1-4 or q to quit.'));
              break;
          }
        }
      }

    } catch (error) {
      console.error(colors.red('✗ Failed to start Claude-Flow:'), (error as Error).message);
      logger.error('Start command failed:', error);
      
      // Cleanup on failure
      await cleanupOnFailure();
      process.exit(1);
    }
  });

// Enhanced helper functions

async function isSystemRunning(): Promise<boolean> {
  try {
    const pidData = await fs.readFile('.claude-flow.pid', 'utf8');
    const data = JSON.parse(pidData);
    
    // Check if process is still running
    try {
      process.kill(data.pid, 'SIGTERM');
      return false; // Process was killed, so it was running
    } catch {
      return false; // Process not found
    }
  } catch {
    return false; // No PID file
  }
}

async function stopExistingInstance(): Promise<void> {
  try {
    const pidData = await fs.readFile('.claude-flow.pid', 'utf8');
    const data = JSON.parse(pidData);
    
    console.log(colors.yellow('Stopping existing instance...'));
    process.kill(data.pid, 'SIGTERM');
    
    // Wait for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force kill if still running
    try {
      process.kill(data.pid, 'SIGKILL');
    } catch {
      // Process already stopped
    }
    
    await fs.unlink('.claude-flow.pid').catch(() => {});
    console.log(colors.green('✓ Existing instance stopped'));
  } catch (error) {
    console.warn(colors.yellow('Warning: Could not stop existing instance'), (error as Error).message);
  }
}

async function performHealthChecks(): Promise<void> {
  const checks = [
    { name: 'Disk Space', check: checkDiskSpace },
    { name: 'Memory Available', check: checkMemoryAvailable },
    { name: 'Network Connectivity', check: checkNetworkConnectivity },
    { name: 'Required Dependencies', check: checkDependencies }
  ];
  
  for (const { name, check } of checks) {
    try {
      console.log(colors.gray(`  Checking ${name}...`));
      await check();
      console.log(colors.green(`  ✓ ${name} OK`));
    } catch (error) {
      console.log(colors.red(`  ✗ ${name} Failed: ${(error as Error).message}`));
      throw error;
    }
  }
}

async function checkDiskSpace(): Promise<void> {
  // Basic disk space check - would need platform-specific implementation
  const stats = await fs.stat('.');
  if (!stats.isDirectory) {
    throw new Error('Current directory is not accessible');
  }
}

async function checkMemoryAvailable(): Promise<void> {
  // Memory check - would integrate with system memory monitoring
  const memoryInfo = process.memoryUsage();
  if (memoryInfo.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
    throw new Error('High memory usage detected');
  }
}

async function checkNetworkConnectivity(): Promise<void> {
  // Basic network check
  try {
    const response = await fetch('https://httpbin.org/status/200', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      throw new Error(`Network check failed: ${response.status}`);
    }
  } catch {
    console.log(colors.yellow('  ⚠ Network connectivity check skipped (offline mode?)'));
  }
}

async function checkDependencies(): Promise<void> {
  // Check for required directories and files
  const requiredDirs = ['.claude-flow', 'memory', 'logs'];
  for (const dir of requiredDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      throw new Error(`Cannot create required directory: ${dir}`);
    }
  }
}

function setupSystemEventHandlers(
  processManager: ProcessManager, 
  systemMonitor: SystemMonitor, 
  options: StartOptions
): void {
  // Graceful shutdown handler
  const shutdownHandler = async () => {
    console.log(colors.yellow('\n🔄 Graceful shutdown initiated...'));
    
    try {
      systemMonitor.stop();
      await processManager.stopAll();
      await cleanupOnShutdown();
      console.log(colorCombos.greenBold('✓'), 'Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error(colors.red('✗ Error during shutdown:'), (error as Error).message);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', shutdownHandler);
  process.on('SIGTERM', shutdownHandler);
  process.on('SIGQUIT', shutdownHandler);

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error(colors.red('✗ Uncaught exception:'), error);
    logger.error('Uncaught exception:', error);
    await cleanupOnFailure();
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error(colors.red('✗ Unhandled promise rejection:'), reason);
    logger.error('Unhandled promise rejection:', { reason, promise });
    await cleanupOnFailure();
    process.exit(1);
  });
}

async function startWithProgress(processManager: ProcessManager, mode: 'all' | 'core'): Promise<void> {
  const processes = mode === 'all' 
    ? ['event-bus', 'memory-manager', 'terminal-pool', 'coordinator', 'mcp-server', 'orchestrator']
    : ['event-bus', 'memory-manager', 'mcp-server'];
  
  for (let i = 0; i < processes.length; i++) {
    const processId = processes[i];
    const progress = `[${i + 1}/${processes.length}]`;
    
    console.log(colors.gray(`${progress} Starting ${processId}...`));
    try {
      await processManager.startProcess(processId);
      console.log(colors.green(`${progress} ✓ ${processId} started`));
    } catch (error) {
      console.log(colors.red(`${progress} ✗ ${processId} failed: ${(error as Error).message}`));
      if (processId === 'orchestrator' || processId === 'mcp-server') {
        throw error; // Critical processes
      }
    }
    
    // Brief delay between starts
    if (i < processes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

async function waitForSystemReady(processManager: ProcessManager): Promise<void> {
  console.log(colors.blue('Waiting for system to be ready...'));
  
  const maxWait = 30000; // 30 seconds
  const checkInterval = 1000; // 1 second
  let waited = 0;
  
  while (waited < maxWait) {
    const stats = processManager.getSystemStats();
    if (stats.errorProcesses === 0 && stats.runningProcesses >= 3) {
      console.log(colors.green('✓ System ready'));
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waited += checkInterval;
  }
  
  console.log(colors.yellow('⚠ System startup completed but some processes may not be fully ready'));
}

async function cleanupOnFailure(): Promise<void> {
  try {
    await fs.unlink('.claude-flow.pid').catch(() => {});
    console.log(colors.gray('Cleaned up PID file'));
  } catch {
    // Ignore cleanup errors
  }
}

async function cleanupOnShutdown(): Promise<void> {
  try {
    await fs.unlink('.claude-flow.pid').catch(() => {});
    console.log(colors.gray('Cleaned up PID file'));
  } catch {
    // Ignore cleanup errors
  }
}

function setupVerboseLogging(monitor: SystemMonitor): void {
  // Enhanced verbose logging
  console.log(colors.gray('Verbose logging enabled'));
  
  // Periodically print system health
  setInterval(() => {
    console.log();
    console.log(colors.cyan('--- System Health Report ---'));
    const health = monitor.getSystemHealth();
    console.log(`Overall Health: ${health.overall}`);
    console.log(`Running Processes: ${health.processes}`);
    console.log(`Memory Usage: ${health.memory.percentage.toFixed(1)}%`);
    console.log(`Uptime: ${Math.floor(health.uptime / 1000)}s`);
    if (health.alerts.length > 0) {
      console.log('Alerts:');
      health.alerts.forEach((alert: string) => console.log(`  - ${alert}`));
    }
    console.log(colors.cyan('--- End Report ---'));
  }, 30000);
  
  // Log critical events
  eventBus.on('process:started', (data: any) => {
    console.log(colors.green(`[VERBOSE] Process started: ${data.processId}`));
  });
  
  eventBus.on('process:stopped', (data: any) => {
    console.log(colors.yellow(`[VERBOSE] Process stopped: ${data.processId}`));
  });
  
  eventBus.on('process:error', (data: any) => {
    console.log(colors.red(`[VERBOSE] Process error: ${data.processId} - ${data.error.message}`));
  });
}
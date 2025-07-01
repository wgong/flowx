/**
 * Enhanced Swarm Command - Integration with new comprehensive swarm system
 */

import { SwarmCoordinator, SwarmAgent, SwarmTask } from "../../coordination/swarm-coordinator.ts";
import { TaskExecutor } from "../../swarm/executor.ts";
import { SwarmMemoryManager } from "../../swarm/memory.ts";
import { generateId } from "../../utils/helpers.ts";
import { success, error, warning, info } from "../cli-core.ts";
import type { CommandContext } from "../cli-core.ts";
import { SwarmStrategy, SwarmMode, AgentType } from "../../swarm/types.ts";
import { exists, runInteractiveCommand } from "../../utils/runtime-env.ts";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "child_process";

export async function swarmAction(ctx: CommandContext) {
  const { args, flags } = ctx;
  
  if (args.length === 0) {
    showSwarmHelp();
    return;
  }

  const objective = args.join(' ');
  const options = parseSwarmOptions(flags);

  if (flags.help || flags.h) {
    showSwarmHelp();
    return;
  }

  const swarmId = generateId('swarm');
  const swarmDir = `./swarm-runs/${swarmId}`;

  if (flags.dryRun || flags['dry-run']) {
    showDryRunConfiguration(swarmId, objective, options);
    return;
  }

  if (flags.ui) {
    await launchSwarmUI(objective, options);
    return;
  }
  
  try {
    console.log(`\n🎯 Initializing swarm: ${swarmId}`);
    console.log(`📋 Objective: ${objective}`);
    console.log(`🔧 Strategy: ${options.strategy}`);
    console.log(`⚙️  Mode: ${options.mode}`);
    console.log(`👥 Max Agents: ${options.maxAgents}`);
    console.log(`📊 Max Tasks: ${options.maxTasks}`);
    
    if (options.verbose) {
      console.log(`🔍 Full configuration:`, JSON.stringify(options, null, 2));
    }

    // Initialize components
    const coordinator = new SwarmCoordinator({
      maxAgents: options.maxAgents,
      maxConcurrentTasks: options.maxTasks,
      taskTimeout: options.taskTimeout,
      enableMonitoring: options.monitor,
      enableWorkStealing: true,
      enableCircuitBreaker: true,
      memoryNamespace: options.memoryNamespace,
      coordinationStrategy: options.mode === 'distributed' ? 'distributed' : 'centralized',
      backgroundTaskInterval: 30000,
      healthCheckInterval: 10000,
      maxRetries: options.maxRetries,
      backoffMultiplier: 2.0
    });

    const executor = new TaskExecutor({
      timeoutMs: options.taskTimeout,
      retryAttempts: options.maxRetries,
      killTimeout: 5000,
      resourceLimits: {
        maxMemory: 512 * 1024 * 1024,
        maxCpuTime: options.taskTimeout,
        maxDiskSpace: 1024 * 1024 * 1024,
        maxNetworkConnections: 10,
        maxFileHandles: 100,
        priority: 1
      },
      sandboxed: true,
      logLevel: options.verbose ? 'debug' : 'error',
      captureOutput: true,
      streamOutput: options.streamOutput,
      enableMetrics: options.monitor
    });

    const memory = new SwarmMemoryManager({
      namespace: options.memoryNamespace,
      persistencePath: `${swarmDir}/memory`,
      maxMemorySize: 100 * 1024 * 1024,
      maxEntrySize: 10 * 1024 * 1024,
      defaultTtl: 24 * 60 * 60 * 1000,
      enableCompression: false,
      enableEncryption: options.encryption,
      consistencyLevel: 'eventual',
      syncInterval: 60000,
      backupInterval: 3600000,
      maxBackups: 24,
      enableDistribution: options.distributed,
      distributionNodes: [],
      replicationFactor: 1,
      enableCaching: true,
      cacheSize: 1000,
      cacheTtl: 300000,
      logging: {
        level: options.verbose ? 'debug' : 'error',
        format: 'text',
        destination: 'console'
      }
    });

    // Start all systems
    await coordinator.start();
    await executor.initialize();
    await memory.initialize();

    // Create swarm tracking directory
    await mkdir(swarmDir, { recursive: true });

    // Create objective - fix strategy type compatibility
    const validStrategy = options.strategy === 'testing' ? 'auto' : options.strategy as 'auto' | 'research' | 'development' | 'analysis' | 'test-stuck' | 'test-fail';
    const objectiveId = await coordinator.createObjective(
      objective,
      validStrategy
    );
    
    console.log(`\n📝 Objective created: ${objectiveId}`);

    // Register agents based on strategy and requirements
    const agentTypes = getRequiredAgentTypes(options.strategy);
    const agents: string[] = [];
    
    for (let i = 0; i < Math.min(options.maxAgents, agentTypes.length * 2); i++) {
      const agentType = agentTypes[i % agentTypes.length];
      const agentName = `${agentType}-${Math.floor(i / agentTypes.length) + 1}`;
      
      // Fix agent type compatibility
      const validAgentType = mapToValidAgentType(agentType);
      const agentId = await coordinator.registerAgent(
        agentName,
        validAgentType,
        getAgentCapabilities(agentType)
      );
      
      agents.push(agentId);
      console.log(`  🤖 Registered ${agentType}: ${agentName} (${agentId})`);
    }

    // Write swarm configuration
    await writeFile(`${swarmDir}/config.json`, JSON.stringify({
      swarmId,
      objectiveId,
      objective,
      strategy: options.strategy,
      mode: options.mode,
      agents,
      options,
      startTime: new Date().toISOString(),
      coordinator: {
        initialized: true,
        swarmId: swarmId
      }
    }, null, 2));

    // Set up event monitoring if requested (or always in background mode)
    if (options.monitor || options.background) {
      setupSwarmMonitoring(coordinator, memory, swarmDir);
    }
    
    // Set up incremental status updates (always enabled)
    await setupIncrementalUpdates(coordinator, swarmDir);

    // Execute the objective
    console.log(`\n🚀 Swarm execution started...`);
    
    // Start the objective execution
    await coordinator.executeObjective(objectiveId);

    if (options.background && process.env.CLAUDE_SWARM_NO_BG) {
      // We're running inside the background script
      // Save state and continue with normal execution
      await writeFile(`${swarmDir}/coordinator.json`, JSON.stringify({
        coordinatorRunning: true,
        pid: process.pid,
        startTime: new Date().toISOString(),
        status: coordinator.status,
        swarmId: swarmId
      }, null, 2));
      
      console.log(`\n🌙 Running in background mode`);
      console.log(`📁 Results: ${swarmDir}`);
      
      // Wait for completion in background with minimal output
      console.log(`\n⏳ Processing tasks...`);
      
      // Continue with background execution
      await waitForSwarmCompletion(coordinator, objectiveId, options);
      
      console.log(`\n✅ Swarm completed in background`);
      
      // Show final results
      await showSwarmResults(coordinator, memory, swarmDir);
      
    } else if (options.background) {
      // Fork to background and exit
      console.log(`\n🌙 Forking to background...`);
      console.log(`📁 Results will be saved to: ${swarmDir}`);
      
      // Spawn background process
      const backgroundProcess = spawn(process.execPath, [
        process.argv[1],
        'swarm',
        ...ctx.args,
        '--no-background'
      ], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          CLAUDE_SWARM_NO_BG: 'true'
        }
      });
      
      backgroundProcess.unref();
      
      console.log(`📋 Background process PID: ${backgroundProcess.pid}`);
      console.log(`📁 Monitor progress: ${swarmDir}/status.json`);
      
      // Gracefully shutdown coordinator
      await coordinator.stop();
      
    } else {
      // Wait for completion in foreground
      await waitForSwarmCompletion(coordinator, objectiveId, options);
      
      console.log(`\n✅ Swarm completed successfully!`);
      
      // Show final results
      await showSwarmResults(coordinator, memory, swarmDir);
      
      // Gracefully shutdown
      await coordinator.stop();
    }
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`❌ Swarm execution failed: ${errorMessage}`);
    
    if (options.verbose && err instanceof Error) {
      console.error(err.stack);
    }
    
    process.exit(1);
  }
}

function parseSwarmOptions(flags: any) {
  // Handle boolean true value for strategy
  let strategy = flags.strategy;
  if (strategy === true || strategy === 'true') {
    strategy = 'auto';
  }
  
  // Determine mode - if parallel flag is set, override mode to 'parallel'
  let mode = flags.mode as SwarmMode || 'centralized';
  
  return {
    strategy: strategy as SwarmStrategy || 'auto',
    mode: mode,
    maxAgents: parseInt(flags.maxAgents || flags['max-agents'] || '5'),
    maxTasks: parseInt(flags.maxTasks || flags['max-tasks'] || '100'),
    timeout: parseInt(flags.timeout || '60'), // minutes
    taskTimeout: parseInt(flags.taskTimeout || flags['task-timeout'] || '300000'), // ms
    taskTimeoutMinutes: parseInt(flags.taskTimeoutMinutes || flags['task-timeout-minutes'] || '59'), // minutes
    maxRetries: parseInt(flags.maxRetries || flags['max-retries'] || '3'),
    qualityThreshold: parseFloat(flags.qualityThreshold || flags['quality-threshold'] || '0.8'),
    
    // Execution options
    parallel: flags.parallel || false,
    background: flags.background || false,
    distributed: flags.distributed || false,
    
    // Quality options
    review: flags.review || false,
    testing: flags.testing || false,
    
    // Monitoring options
    monitor: flags.monitor || false,
    verbose: flags.verbose || flags.v || false,
    streamOutput: flags.streamOutput || flags['stream-output'] || false,
    
    // Memory options
    memoryNamespace: flags.memoryNamespace || flags['memory-namespace'] || 'swarm',
    persistence: flags.persistence !== false,
    
    // Security options
    encryption: flags.encryption || false,
    
    // Coordination strategy options
    agentSelection: flags.agentSelection || flags['agent-selection'] || 'capability-based',
    taskScheduling: flags.taskScheduling || flags['task-scheduling'] || 'priority',
    loadBalancing: flags.loadBalancing || flags['load-balancing'] || 'work-stealing',
    faultTolerance: flags.faultTolerance || flags['fault-tolerance'] || 'retry',
    communication: flags.communication || 'event-driven',
    
    // UI and debugging
    ui: flags.ui || false,
    dryRun: flags.dryRun || flags['dry-run'] || flags.d || false
  };
}

function getRequiredAgentTypes(strategy: SwarmStrategy): AgentType[] {
  switch (strategy) {
    case 'research':
      return ['researcher', 'analyzer', 'documenter'];
    case 'development':
      return ['developer', 'tester', 'reviewer', 'documenter'];
    case 'analysis':
      return ['analyzer', 'researcher', 'documenter'];
    case 'testing':
      return ['tester', 'developer', 'reviewer'];
    case 'optimization':
      return ['analyzer', 'developer', 'monitor'];
    case 'maintenance':
      return ['developer', 'monitor', 'tester'];
    default: // auto
      return ['coordinator', 'developer', 'researcher', 'analyzer'];
  }
}

function getAgentCapabilities(agentType: AgentType): string[] {
  switch (agentType) {
    case 'coordinator':
      return ['task-assignment', 'planning', 'delegation', 'coordination', 'analysis'];
    case 'developer':
      return ['code-generation', 'file-system', 'debugging', 'testing', 'implementation'];
    case 'researcher':
      return ['research', 'web-search', 'information-gathering', 'analysis', 'documentation'];
    case 'analyzer':
      return ['analysis', 'data-analysis', 'pattern-recognition', 'reporting', 'research'];
    case 'tester':
      return ['testing', 'code-review', 'quality-assurance', 'validation'];
    case 'reviewer':
      return ['code-review', 'analysis', 'documentation', 'quality-assurance'];
    case 'monitor':
      return ['monitoring', 'analysis', 'documentation', 'system-oversight'];
    default:
      return ['analysis', 'documentation'];
  }
}

let globalMetricsInterval: NodeJS.Timeout | undefined;
let globalStatusInterval: NodeJS.Timeout | undefined;

async function setupIncrementalUpdates(
  coordinator: SwarmCoordinator,
  swarmDir: string
): Promise<void> {
  const updateFunction = async () => {
    try {
      // Get objectives from coordinator
      const objectives = coordinator.getSwarmStatus();
      
      // Write status update
      await writeFile(`${swarmDir}/status.json`, JSON.stringify({
        timestamp: new Date().toISOString(),
        status: coordinator.status,
        objectives: objectives.objectives,
        tasks: objectives.tasks,
        agents: objectives.agents,
        uptime: objectives.uptime
      }, null, 2));
      
    } catch (err) {
      // Ignore errors in status updates
    }
  };

  // Update every 10 seconds
  const interval = setInterval(updateFunction, 10000);
  
  // Initial update
  await updateFunction();
  
  // Cleanup on process exit
  const cleanup = () => {
    clearInterval(interval);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

function setupSwarmMonitoring(
  coordinator: SwarmCoordinator,
  memory: SwarmMemoryManager,
  swarmDir: string
): void {
  console.log(`📊 Monitoring enabled - status updates every 30 seconds`);
  
  const monitorFunction = () => {
    try {
      const swarmStatus = coordinator.getSwarmStatus();
      console.log(`📈 Status: ${swarmStatus.tasks.completed}/${swarmStatus.tasks.total} tasks completed, ${swarmStatus.agents.idle}/${swarmStatus.agents.total} agents idle`);
    } catch (err) {
      // Ignore monitoring errors
    }
  };

  // Monitor every 30 seconds
  const interval = setInterval(monitorFunction, 30000);
  
  // Cleanup on process exit
  const cleanup = () => {
    clearInterval(interval);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

async function waitForSwarmCompletion(
  coordinator: SwarmCoordinator,
  objectiveId: string,
  options: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    const checkCompletion = () => {
      const objective = coordinator.getObjectiveStatus(objectiveId);
      if (!objective) {
        reject(new Error('Objective not found'));
        return;
      }
      
      if (objective.status === 'completed') {
        resolve();
      } else if (objective.status === 'failed') {
        reject(new Error('Objective failed'));
      } else {
        // Continue waiting
        setTimeout(checkCompletion, 5000);
      }
    };
    
    checkCompletion();
  });
}

async function showSwarmResults(
  coordinator: SwarmCoordinator,
  memory: SwarmMemoryManager,
  swarmDir: string
): Promise<void> {
  console.log(`\n📊 Swarm Results Summary`);
  console.log(`📁 Results Directory: ${swarmDir}`);
  
  const swarmStatus = coordinator.getSwarmStatus();
  console.log(`\n📈 Final Statistics:`);
  console.log(`  Objectives: ${swarmStatus.objectives}`);
  console.log(`  Tasks: ${swarmStatus.tasks.total} (${swarmStatus.tasks.completed} completed)`);
  console.log(`  Agents: ${swarmStatus.agents.total}`);
  console.log(`  Uptime: ${formatDuration(swarmStatus.uptime)}`);
  
  // Try to get memory statistics
  try {
    const memoryStats = memory.getStatistics();
    console.log(`\n🧠 Memory Usage:`);
    console.log(`  Total Entries: ${memoryStats.totalEntries}`);
    console.log(`  Total Size: ${formatBytes(memoryStats.totalSize)}`);
  } catch (err) {
    // Ignore memory stats errors
  }
}

// Helper function to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function launchSwarmUI(objective: string, options: any): Promise<void> {
  try {
    // When bundled, we need to go from dist/ back to the project root, then to src/cli/simple-commands/
    const projectRoot = process.cwd();
    const uiScriptPath = join(projectRoot, 'src', 'cli', 'simple-commands', 'swarm-ui.js');

    if (!(await exists(uiScriptPath))) {
      warning('Swarm UI script not found. Falling back to standard mode.');
      return;
    }

    const code = await runInteractiveCommand('node', [uiScriptPath, objective, ...buildUIArgs(options)]);

    if (code !== 0) {
      error(`Swarm UI exited with code ${code}`);
    }
  } catch (err) {
    warning(`Failed to launch swarm UI: ${(err as Error).message}`);
    console.log('Falling back to standard mode...');
  }
}

function buildUIArgs(options: any): string[] {
  const args: string[] = [];
  
  if (options.strategy !== 'auto') args.push('--strategy', options.strategy);
  if (options.mode !== 'centralized') args.push('--mode', options.mode);
  if (options.maxAgents !== 5) args.push('--max-agents', options.maxAgents.toString());
  if (options.parallel) args.push('--parallel');
  if (options.distributed) args.push('--distributed');
  if (options.monitor) args.push('--monitor');
  if (options.verbose) args.push('--verbose');
  
  return args;
}

function showDryRunConfiguration(swarmId: string, objective: string, options: any): void {
  warning('DRY RUN - Advanced Swarm Configuration:');
  console.log(`🆔 Swarm ID: ${swarmId}`);
  console.log(`📋 Objective: ${objective}`);
  console.log(`🎯 Strategy: ${options.strategy}`);
  console.log(`🏗️  Mode: ${options.mode}`);
  console.log(`🤖 Max Agents: ${options.maxAgents}`);
  console.log(`📊 Max Tasks: ${options.maxTasks}`);
  console.log(`⏰ Timeout: ${options.timeout} minutes`);
  console.log(`🔄 Parallel: ${options.parallel}`);
  console.log(`🌐 Distributed: ${options.distributed}`);
  console.log(`🔍 Monitoring: ${options.monitor}`);
  console.log(`👥 Review Mode: ${options.review}`);
  console.log(`🧪 Testing: ${options.testing}`);
  console.log(`🧠 Memory Namespace: ${options.memoryNamespace}`);
  console.log(`💾 Persistence: ${options.persistence}`);
  console.log(`🔒 Encryption: ${options.encryption}`);
  console.log(`📊 Quality Threshold: ${options.qualityThreshold}`);
  console.log(`\n🎛️  Coordination Strategy:`);
  console.log(`  • Agent Selection: ${options.agentSelection}`);
  console.log(`  • Task Scheduling: ${options.taskScheduling}`);
  console.log(`  • Load Balancing: ${options.loadBalancing}`);
  console.log(`  • Fault Tolerance: ${options.faultTolerance}`);
  console.log(`  • Communication: ${options.communication}`);
}

function showSwarmHelp(): void {
  console.log(`
🐝 Claude Flow Advanced Swarm System

USAGE:
  claude-flow swarm <objective> [options]

EXAMPLES:
  claude-flow swarm "Build a REST API" --strategy development
  claude-flow swarm "Research cloud architecture" --strategy research --ui
  claude-flow swarm "Analyze data trends" --strategy analysis --parallel
  claude-flow swarm "Optimize performance" --distributed --monitor

STRATEGIES:
  auto           Automatically determine best approach (default)
  research       Research and information gathering
  development    Software development and coding
  analysis       Data analysis and insights
  testing        Testing and quality assurance
  optimization   Performance optimization
  maintenance    System maintenance

MODES:
  centralized    Single coordinator (default)
  distributed    Multiple coordinators
  hierarchical   Tree structure coordination
  mesh           Peer-to-peer coordination
  hybrid         Mixed coordination strategies

OPTIONS:
  --strategy <type>          Execution strategy (default: auto)
  --mode <type>              Coordination mode (default: centralized)
  --max-agents <n>           Maximum agents (default: 5)
  --max-tasks <n>            Maximum tasks (default: 100)
  --timeout <minutes>        Timeout in minutes (default: 60)
  --task-timeout <ms>        Individual task timeout (default: 300000)
  --max-retries <n>          Maximum retries per task (default: 3)
  --quality-threshold <n>    Quality threshold 0-1 (default: 0.8)

EXECUTION:
  --parallel                 Enable parallel execution
  --background               Run in background mode
  --distributed              Enable distributed coordination
  --stream-output            Stream real-time output

QUALITY:
  --review                   Enable peer review
  --testing                  Enable automated testing

MONITORING:
  --monitor                  Enable real-time monitoring
  --verbose                  Enable detailed logging
  --ui                       Launch terminal UI interface

MEMORY:
  --memory-namespace <name>  Memory namespace (default: swarm)
  --persistence              Enable persistence (default: true)
  --encryption               Enable encryption

COORDINATION:
  --agent-selection <type>   Agent selection strategy
  --task-scheduling <type>   Task scheduling algorithm
  --load-balancing <type>    Load balancing method
  --fault-tolerance <type>   Fault tolerance strategy
  --communication <type>     Communication pattern

DEBUGGING:
  --dry-run                  Show configuration without executing
  --help                     Show this help message

ADVANCED FEATURES:
  🤖 Intelligent agent selection and management
  ⚡ Timeout-free background task execution
  🧠 Distributed memory sharing between agents
  🔄 Work stealing and load balancing
  🛡️  Circuit breaker patterns for reliability
  📊 Real-time monitoring and metrics
  🎛️  Multiple coordination strategies
  💾 Persistent state and recovery
  🔒 Security and encryption options
  🖥️  Interactive terminal UI

For more information, visit: https://github.com/ruvnet/claude-code-flow
`);
}

// Helper function to map AgentType to valid SwarmAgent type
function mapToValidAgentType(agentType: AgentType): 'researcher' | 'developer' | 'analyzer' | 'coordinator' | 'reviewer' {
  switch (agentType) {
    case 'researcher': return 'researcher';
    case 'developer': return 'developer';
    case 'analyzer': return 'analyzer';
    case 'coordinator': return 'coordinator';
    case 'reviewer': return 'reviewer';
    case 'tester': return 'analyzer'; // Map tester to analyzer
    case 'monitor': return 'coordinator'; // Map monitor to coordinator
    default: return 'researcher'; // Default fallback
  }
}
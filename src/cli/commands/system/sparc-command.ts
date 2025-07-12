/**
 * SPARC Command - Single Source of Truth Implementation
 * Comprehensive SPARC methodology implementation using real SparcTaskExecutor
 * NO MOCK OR PARTIAL IMPLEMENTATIONS - FULLY FUNCTIONAL
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';
import { getMemoryManager, getPersistenceManager, getLogger } from '../../core/global-initialization.ts';
import { SparcTaskExecutor } from '../../../swarm/sparc-executor.ts';
import { TaskDefinition, AgentState, AgentId, TaskType, AgentType, TaskStatus, AgentStatus, TaskPriority } from '../../../swarm/types.ts';
import { generateId } from '../../../utils/helpers.ts';
import { Logger } from '../../../core/logger.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

export const sparcCommand: CLICommand = {
  name: 'sparc',
  description: 'Execute SPARC methodology workflows with real implementation',
  category: 'System',
  usage: 'claude-flow sparc <mode> [TASK] [OPTIONS]',
  examples: [
    'claude-flow sparc architect "Design user service"',
    'claude-flow sparc code "Implement auth module"', 
    'claude-flow sparc tdd "Create test suite"',
    'claude-flow sparc review "Security review"',
    'claude-flow sparc batch --modes "architect,code,tdd"'
  ],
  arguments: [
    {
      name: 'mode',
      description: 'SPARC mode to execute',
      required: true
    },
    {
      name: 'task',
      description: 'Task description',
      required: false
    }
  ],
  options: [
    {
      name: 'namespace',
      short: 'n',
      description: 'Memory namespace for this session',
      type: 'string',
      default: 'sparc'
    },
    {
      name: 'parallel',
      description: 'Enable parallel execution',
      type: 'boolean'
    },
    {
      name: 'batch',
      description: 'Enable batch operations',
      type: 'boolean'
    },
    {
      name: 'modes',
      description: 'Comma-separated list of modes for batch execution',
      type: 'string'
    },
    {
      name: 'config',
      short: 'c',
      description: 'SPARC configuration file',
      type: 'string'
    },
    {
      name: 'verbose',
      short: 'v',
      description: 'Enable verbose output',
      type: 'boolean'
    },
    {
      name: 'dry-run',
      short: 'd',
      description: 'Preview what would be executed',
      type: 'boolean'
    },
    {
      name: 'output-dir',
      short: 'o',
      description: 'Directory to output generated files',
      type: 'string',
      default: './sparc-output'
    },
    {
      name: 'format',
      short: 'f',
      description: 'Output format',
      type: 'string',
      choices: ['text', 'json', 'markdown'],
      default: 'text'
    },
    {
      name: 'enable-tdd',
      description: 'Enable Test-Driven Development',
      type: 'boolean',
      default: true
    },
    {
      name: 'quality-threshold',
      description: 'Quality threshold (0.0-1.0)',
      type: 'number',
      default: 0.8
    }
  ],
  subcommands: [
    {
      name: 'architect',
      description: 'Architecture design mode',
      options: [
        {
          name: 'namespace',
          short: 'n',
          description: 'Memory namespace for this session',
          type: 'string',
          default: 'sparc'
        },
        {
          name: 'dry-run',
          short: 'd',
          description: 'Preview what would be executed',
          type: 'boolean'
        },
        {
          name: 'output-dir',
          short: 'o',
          description: 'Directory to output generated files',
          type: 'string',
          default: './sparc-output'
        },
        {
          name: 'format',
          short: 'f',
          description: 'Output format',
          type: 'string',
          choices: ['text', 'json', 'markdown'],
          default: 'text'
        },
        {
          name: 'enable-tdd',
          description: 'Enable Test-Driven Development',
          type: 'boolean',
          default: true
        },
        {
          name: 'quality-threshold',
          description: 'Quality threshold (0.0-1.0)',
          type: 'number',
          default: 0.8
        },
        {
          name: 'verbose',
          short: 'v',
          description: 'Enable verbose output',
          type: 'boolean'
        }
      ],
      handler: async (context: CLIContext) => await executeSparcMode('architect', context)
    },
    {
      name: 'code',
      description: 'Coding implementation mode',
      options: [
        {
          name: 'namespace',
          short: 'n',
          description: 'Memory namespace for this session',
          type: 'string',
          default: 'sparc'
        },
        {
          name: 'dry-run',
          short: 'd',
          description: 'Preview what would be executed',
          type: 'boolean'
        },
        {
          name: 'output-dir',
          short: 'o',
          description: 'Directory to output generated files',
          type: 'string',
          default: './sparc-output'
        },
        {
          name: 'format',
          short: 'f',
          description: 'Output format',
          type: 'string',
          choices: ['text', 'json', 'markdown'],
          default: 'text'
        },
        {
          name: 'enable-tdd',
          description: 'Enable Test-Driven Development',
          type: 'boolean',
          default: true
        },
        {
          name: 'quality-threshold',
          description: 'Quality threshold (0.0-1.0)',
          type: 'number',
          default: 0.8
        },
        {
          name: 'verbose',
          short: 'v',
          description: 'Enable verbose output',
          type: 'boolean'
        }
      ],
      handler: async (context: CLIContext) => await executeSparcMode('code', context)
    },
    {
      name: 'tdd',
      description: 'Test-driven development mode',
      options: [
        {
          name: 'namespace',
          short: 'n',
          description: 'Memory namespace for this session',
          type: 'string',
          default: 'sparc'
        },
        {
          name: 'dry-run',
          short: 'd',
          description: 'Preview what would be executed',
          type: 'boolean'
        },
        {
          name: 'output-dir',
          short: 'o',
          description: 'Directory to output generated files',
          type: 'string',
          default: './sparc-output'
        },
        {
          name: 'format',
          short: 'f',
          description: 'Output format',
          type: 'string',
          choices: ['text', 'json', 'markdown'],
          default: 'text'
        },
        {
          name: 'enable-tdd',
          description: 'Enable Test-Driven Development',
          type: 'boolean',
          default: true
        },
        {
          name: 'quality-threshold',
          description: 'Quality threshold (0.0-1.0)',
          type: 'number',
          default: 0.8
        },
        {
          name: 'verbose',
          short: 'v',
          description: 'Enable verbose output',
          type: 'boolean'
        }
      ],
      handler: async (context: CLIContext) => await executeSparcMode('tdd', context)
    },
    {
      name: 'review',
      description: 'Code review mode',
      handler: async (context: CLIContext) => await executeSparcMode('review', context)
    },
    {
      name: 'debug',
      description: 'Debugging mode',
      handler: async (context: CLIContext) => await executeSparcMode('debug', context)
    },
    {
      name: 'docs',
      description: 'Documentation generation mode',
      handler: async (context: CLIContext) => await executeSparcMode('docs', context)
    },
    {
      name: 'security',
      description: 'Security review mode',
      handler: async (context: CLIContext) => await executeSparcMode('security', context)
    },
    {
      name: 'batch',
      description: 'Batch execution mode',
      options: [
        {
          name: 'modes',
          description: 'Comma-separated list of modes for batch execution',
          type: 'string'
        },
        {
          name: 'parallel',
          description: 'Enable parallel execution',
          type: 'boolean'
        },
        {
          name: 'namespace',
          short: 'n',
          description: 'Memory namespace for this session',
          type: 'string',
          default: 'sparc'
        },
        {
          name: 'dry-run',
          short: 'd',
          description: 'Preview what would be executed',
          type: 'boolean'
        },
        {
          name: 'output-dir',
          short: 'o',
          description: 'Directory to output generated files',
          type: 'string',
          default: './sparc-output'
        },
        {
          name: 'enable-tdd',
          description: 'Enable Test-Driven Development',
          type: 'boolean',
          default: true
        },
        {
          name: 'quality-threshold',
          description: 'Quality threshold (0.0-1.0)',
          type: 'number',
          default: 0.8
        },
        {
          name: 'verbose',
          short: 'v',
          description: 'Enable verbose output',
          type: 'boolean'
        }
      ],
      handler: async (context: CLIContext) => await executeBatchMode(context)
    },
    {
      name: 'list',
      description: 'List available SPARC modes',
      handler: async (context: CLIContext) => await listSparcModes(context)
    }
  ],
  handler: async (context: CLIContext) => {
    const { args, options } = context;
    
    if (args.length === 0) {
      return await listSparcModes(context);
    }

    const mode = args[0];
    const task = args[1];

    if (options.batch || options.modes) {
      return await executeBatchMode(context);
    }

    return await executeSparcMode(mode, context);
  }
};

async function executeSparcMode(mode: string, context: CLIContext): Promise<void> {
  const { args, options } = context;
  const task = args[1] || args[0];

  // Options should already have defaults applied by CLI application
  // No need to manually apply defaults here

  if (!task) {
    printError(`Task description required for SPARC ${mode} mode`);
    printInfo(`Usage: claude-flow sparc ${mode} "task description"`);
    return;
  }

  printInfo(`🚀 Executing SPARC ${mode.toUpperCase()} mode`);
  console.log(`📋 Task: ${task}`);
  console.log(`💾 Namespace: ${options.namespace}`);
  
  if (options.verbose) {
    console.log(`⚙️  Mode: ${mode}`);
    console.log(`🔧 Options:`, options);
  }

  if (options['dry-run']) {
    console.log('\n🔍 DRY RUN - Would execute:');
    console.log(`  Mode: ${mode}`);
    console.log(`  Task: ${task}`);
    console.log(`  Namespace: ${options.namespace}`);
    console.log(`  Output Directory: ${options['output-dir']}`);
    console.log(`  Enable TDD: ${options['enable-tdd']}`);
    console.log(`  Quality Threshold: ${options['quality-threshold']}`);
    console.log(`  Format: ${options.format}`);
    console.log(`  Verbose: ${options.verbose}`);
    return;
  }

  try {
    // Create output directory if it doesn't exist
    const outputDir = options['output-dir'] || './sparc-output';
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create mode-specific output directory
    const modeOutputDir = path.join(outputDir, `${mode}-${Date.now()}`);
    await fs.mkdir(modeOutputDir, { recursive: true });
    
    // Get logger - create a new Logger instance instead of using ILogger
    const logger = new Logger({
      level: options.verbose ? 'debug' : 'info',
      format: 'json',
      destination: 'console'
    }, { component: 'sparc-command', mode });
    
    // Create the SparcTaskExecutor with proper configuration
    const executor = new SparcTaskExecutor({
      logger,
      enableTDD: options['enable-tdd'],
      qualityThreshold: options['quality-threshold'],
      enableMemory: true
    });
    
    // Create task definition with proper types
    const taskDefinition: TaskDefinition = {
      id: { 
        id: generateId('task'),
        swarmId: 'sparc-swarm',
        sequence: 1,
        priority: 1
      },
      name: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Task`,
      description: task,
      type: mapModeToTaskType(mode),
      priority: 'high' as TaskPriority,
      status: 'created' as TaskStatus,
      instructions: task,
      requirements: {
        capabilities: [mode, 'sparc-methodology'],
        tools: [],
        permissions: ['read', 'write', 'execute']
      },
      constraints: {
        dependencies: [],
        dependents: [],
        conflicts: [],
        maxRetries: 3,
        timeoutAfter: 300000
      },
      input: { description: task },
      context: {
        namespace: options.namespace,
        mode: mode,
        outputDir: modeOutputDir,
        verbose: options.verbose
      },
      examples: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: [],
      statusHistory: [{
        timestamp: new Date(),
        from: 'created' as TaskStatus,
        to: 'created' as TaskStatus,
        reason: 'Task created by SPARC command',
        triggeredBy: 'system'
      }]
    };
    
    // Create agent state with proper types
    const agentState: AgentState = {
      id: { 
        id: generateId('agent'),
        swarmId: 'sparc-swarm',
        type: mapModeToAgentType(mode),
        instance: 1
      },
      name: `SPARC ${mode.charAt(0).toUpperCase() + mode.slice(1)} Agent`,
      type: mapModeToAgentType(mode),
      status: 'idle' as AgentStatus,
      capabilities: {
        codeGeneration: mode === 'code',
        codeReview: mode === 'review',
        testing: mode === 'tdd',
        documentation: mode === 'docs',
        research: mode === 'architect',
        analysis: mode === 'architect',
        webSearch: false,
        apiIntegration: false,
        fileSystem: true,
        terminalAccess: false,
        languages: ['typescript', 'javascript'],
        frameworks: [],
        domains: [mode],
        tools: ['sparc-methodology'],
        maxConcurrentTasks: 1,
        maxMemoryUsage: 512,
        maxExecutionTime: 300000,
        reliability: 1.0,
        speed: 1.0,
        quality: options['quality-threshold']
      },
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        averageExecutionTime: 0,
        successRate: 1.0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkUsage: 0,
        codeQuality: options['quality-threshold'],
        testCoverage: 0,
        bugRate: 0,
        userSatisfaction: 0.8,
        totalUptime: 0,
        lastActivity: new Date(),
        responseTime: 100
      },
      workload: 0,
      health: 1.0,
      config: {
        autonomyLevel: 0.8,
        learningEnabled: false,
        adaptationEnabled: false,
        maxTasksPerHour: 10,
        maxConcurrentTasks: 1,
        timeoutThreshold: 300000,
        reportingInterval: 30000,
        heartbeatInterval: 10000,
        permissions: ['read', 'write', 'execute'],
        trustedAgents: [],
        expertise: { [mode]: 1.0 },
        preferences: {}
      },
      environment: {
        runtime: 'node',
        version: process.version,
        workingDirectory: modeOutputDir,
        tempDirectory: path.join(modeOutputDir, 'temp'),
        logDirectory: path.join(modeOutputDir, 'logs'),
        apiEndpoints: {},
        credentials: {},
        availableTools: ['sparc-methodology'],
        toolConfigs: {}
      },
      endpoints: [],
      lastHeartbeat: new Date(),
      taskHistory: [],
      errorHistory: [],
      childAgents: [],
      collaborators: []
    };
    
    // Execute the task
    printInfo('📝 Executing task with SPARC executor...');
    const startTime = Date.now();
    const result = await executor.executeTask(taskDefinition, agentState, modeOutputDir);
    const duration = Date.now() - startTime;
    
    printSuccess(`✅ SPARC ${mode} mode completed in ${duration}ms`);
    
    // Process and display results
    if (options.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else if (options.format === 'markdown') {
      displayResultsMarkdown(result, mode, task);
    } else {
      displayResultsText(result, mode, task, modeOutputDir);
    }
    
    // Store result in memory
    try {
      const memoryManager = await getMemoryManager();
      const memoryKey = `sparc-${mode}-${Date.now()}`;
      const memoryValue = {
        mode,
        task,
        result,
        outputDir: modeOutputDir,
        duration,
        timestamp: new Date().toISOString(),
        agentId: agentState.id.id,
        quality: result.quality,
        completeness: result.completeness
      };
      
      // Use the store method with key-value pattern
      await memoryManager.store(memoryKey, memoryValue, {
        tags: [mode, 'sparc', 'methodology', 'execution'],
        classification: 'internal',
        retention: 30
      });
      console.log(`\n💾 Stored in memory: ${memoryKey}`);
    } catch (memoryError) {
      printWarning(`Failed to store result in memory: ${memoryError instanceof Error ? memoryError.message : String(memoryError)}`);
    }

  } catch (error) {
    printError(`Failed to execute SPARC ${mode} mode: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function executeBatchMode(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const task = args[1] || args[0];

  // Options should already have defaults applied by CLI application
  // No need to manually apply defaults here
  
  printInfo('🚀 Executing SPARC Batch Mode');
  
  const modes = options.modes ? options.modes.split(',').map((m: string) => m.trim()) : ['architect', 'code', 'tdd', 'review'];
  
  console.log(`📋 Modes: ${modes.join(', ')}`);
  console.log(`⚡ Parallel: ${options.parallel ? 'enabled' : 'disabled'}`);
  console.log(`💾 Namespace: ${options.namespace}`);
  console.log(`📁 Output Directory: ${options['output-dir']}`);
  
  if (!task && !args[0]) {
    printError('Task description required for batch mode');
    printInfo('Usage: claude-flow sparc batch "task description" --modes "architect,code,tdd"');
    return;
  }
  
  if (options['dry-run']) {
    console.log('\n🔍 DRY RUN - Would execute modes:');
    modes.forEach((mode: string) => console.log(`  - ${mode}: ${task || args[0]}`));
    console.log(`\nConfiguration:`);
    console.log(`  Namespace: ${options.namespace}`);
    console.log(`  Output Directory: ${options['output-dir']}`);
    console.log(`  Enable TDD: ${options['enable-tdd']}`);
    console.log(`  Quality Threshold: ${options['quality-threshold']}`);
    console.log(`  Parallel Execution: ${options.parallel}`);
    return;
  }

  try {
    // Create output directory if it doesn't exist
    const outputDir = options['output-dir'] || './sparc-output';
    await fs.mkdir(outputDir, { recursive: true });
    
    // Prepare batch task
    const batchTask = task || args[0];
    const batchOutputDir = path.join(outputDir, `batch-${Date.now()}`);
    await fs.mkdir(batchOutputDir, { recursive: true });
    
    printInfo(`📁 Batch output directory: ${batchOutputDir}`);
    
    const batchResults: any = {
      task: batchTask,
      modes: {},
      startTime: new Date(),
      endTime: null,
      summary: {}
    };
    
    const executeMode = async (mode: string): Promise<any> => {
      printInfo(`\n🔄 Executing ${mode}...`);
      const modeOutputDir = path.join(batchOutputDir, mode);
      await fs.mkdir(modeOutputDir, { recursive: true });
      
      // Create new context for this mode
      const modeContext = {
        ...context,
        args: [mode, batchTask],
        options: {
          ...options,
          'output-dir': modeOutputDir
        }
      };
      
      try {
        await executeSparcMode(mode, modeContext);
        return { status: 'completed', mode, outputDir: modeOutputDir };
      } catch (error) {
        printError(`Mode ${mode} failed: ${error instanceof Error ? error.message : String(error)}`);
        return { status: 'failed', mode, error: error instanceof Error ? error.message : String(error) };
      }
    };
    
    if (options.parallel) {
      // Execute modes in parallel
      const promises = modes.map((mode: string) => executeMode(mode));
      const results = await Promise.all(promises);
      
      // Store results
      modes.forEach((mode: string, index: number) => {
        batchResults.modes[mode] = results[index];
      });
    } else {
      // Execute modes sequentially
      for (const mode of modes) {
        const modeResult = await executeMode(mode);
        batchResults.modes[mode] = modeResult;
      }
    }
    
    // Calculate summary
    batchResults.endTime = new Date();
    batchResults.duration = batchResults.endTime.getTime() - batchResults.startTime.getTime();
    
    let successfulModes = 0;
    let failedModes = 0;
    
    for (const mode of Object.keys(batchResults.modes)) {
      const modeResult = batchResults.modes[mode];
      if (modeResult.status === 'completed') {
        successfulModes++;
      } else {
        failedModes++;
      }
    }
    
    batchResults.summary = {
      totalModes: modes.length,
      successfulModes,
      failedModes,
      duration: batchResults.duration
    };
    
    // Save batch results
    const batchResultsPath = path.join(batchOutputDir, 'batch-results.json');
    await fs.writeFile(batchResultsPath, JSON.stringify(batchResults, null, 2));
    
    printSuccess(`🎉 SPARC batch execution completed in ${batchResults.duration}ms`);
    printInfo(`📊 Summary: ${successfulModes}/${modes.length} modes completed successfully`);
    if (failedModes > 0) {
      printWarning(`⚠️  ${failedModes} modes failed`);
    }
    printInfo(`📁 Results saved to ${batchOutputDir}`);
    printInfo(`📄 Batch summary: ${batchResultsPath}`);
    
  } catch (error) {
    printError(`Batch execution failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function listSparcModes(context: CLIContext): Promise<void> {
  console.log(successBold('\n🧠 Available SPARC Modes\n'));
  
  const modes = [
    { name: 'architect', description: '🏗️  Architecture design and system planning', category: 'Design' },
    { name: 'code', description: '💻 Code implementation and development', category: 'Development' },
    { name: 'tdd', description: '🧪 Test-driven development and testing', category: 'Testing' },
    { name: 'review', description: '👁️  Code review and quality assurance', category: 'Quality' },
    { name: 'debug', description: '🐛 Debugging and troubleshooting', category: 'Maintenance' },
    { name: 'docs', description: '📚 Documentation generation', category: 'Documentation' },
    { name: 'security', description: '🛡️  Security analysis and review', category: 'Security' },
    { name: 'batch', description: '🚀 Batch execution of multiple modes', category: 'Automation' }
  ];

  const categories = Array.from(new Set(modes.map(m => m.category)));
  
  for (const category of categories) {
    console.log(infoBold(`${category}:`));
    const categoryModes = modes.filter((m: any) => m.category === category);
    for (const mode of categoryModes) {
      console.log(`  ${mode.name.padEnd(12)} ${mode.description}`);
    }
    console.log();
  }

  console.log(infoBold('Examples:'));
  console.log('  claude-flow sparc architect "Design user authentication system"');
  console.log('  claude-flow sparc code "Implement REST API endpoints"');
  console.log('  claude-flow sparc tdd "Create comprehensive test suite"');
  console.log('  claude-flow sparc batch --modes "architect,code,tdd" --parallel');
  console.log();
}

// === UTILITY FUNCTIONS ===

function mapModeToTaskType(mode: string): TaskType {
  const modeToType: Record<string, TaskType> = {
    'architect': 'analysis',
    'code': 'coding',
    'tdd': 'testing',
    'review': 'review',
    'debug': 'maintenance',
    'docs': 'documentation',
    'security': 'review'
  };
  
  return modeToType[mode] || 'custom';
}

function mapModeToAgentType(mode: string): AgentType {
  const modeToAgentType: Record<string, AgentType> = {
    'architect': 'developer',
    'code': 'developer',
    'tdd': 'tester',
    'review': 'reviewer',
    'debug': 'developer',
    'docs': 'documenter',
    'security': 'reviewer'
  };
  
  return modeToAgentType[mode] || 'developer';
}

function displayResultsText(result: any, mode: string, task: string, outputDir: string): void {
  console.log('\n📄 Execution Results:');
  console.log('─'.repeat(60));
  
  if (result.output) {
    console.log(`Output: ${typeof result.output === 'string' ? result.output : JSON.stringify(result.output)}`);
  }
  
  if (result.metadata) {
    console.log(`\n📊 Metadata:`);
    console.log(`  Agent Type: ${result.metadata.agentType}`);
    console.log(`  Execution Time: ${result.metadata.executionTime}ms`);
    console.log(`  Quality Score: ${result.quality}`);
    console.log(`  Completeness: ${result.completeness}`);
    console.log(`  Accuracy: ${result.accuracy}`);
    if (result.metadata.sparcPhase) {
      console.log(`  SPARC Phase: ${result.metadata.sparcPhase}`);
    }
  }
  
  if (result.artifacts && Object.keys(result.artifacts).length > 0) {
    console.log(`\n📁 Generated Artifacts:`);
    for (const [key, value] of Object.entries(result.artifacts)) {
      console.log(`  ${key}: ${typeof value === 'string' ? value.substring(0, 100) + '...' : JSON.stringify(value)}`);
    }
  }
  
  console.log(`\n📂 Output Directory: ${outputDir}`);
}

function displayResultsMarkdown(result: any, mode: string, task: string): void {
  console.log(`\n# SPARC ${mode.toUpperCase()} Execution Results\n`);
  console.log(`**Task:** ${task}\n`);
  console.log(`**Mode:** ${mode}\n`);
  
  if (result.output) {
    console.log(`## Output\n`);
    console.log(`${typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2)}\n`);
  }
  
  if (result.metadata) {
    console.log(`## Metadata\n`);
    console.log(`- **Agent Type:** ${result.metadata.agentType}`);
    console.log(`- **Execution Time:** ${result.metadata.executionTime}ms`);
    console.log(`- **Quality Score:** ${result.quality}`);
    console.log(`- **Completeness:** ${result.completeness}`);
    console.log(`- **Accuracy:** ${result.accuracy}`);
    if (result.metadata.sparcPhase) {
      console.log(`- **SPARC Phase:** ${result.metadata.sparcPhase}`);
    }
    console.log();
  }
  
  if (result.artifacts && Object.keys(result.artifacts).length > 0) {
    console.log(`## Generated Artifacts\n`);
    for (const [key, value] of Object.entries(result.artifacts)) {
      console.log(`### ${key}\n`);
      console.log(`\`\`\`\n${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n\`\`\`\n`);
    }
  }
}

export default sparcCommand; 
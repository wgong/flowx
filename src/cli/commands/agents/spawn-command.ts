/**
 * Spawn Command
 * Direct agent spawning interface
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { printSuccess, printError, printInfo, printWarning } from '../../core/output-formatter.ts';
import { getMemoryManager, getPersistenceManager } from '../../core/global-initialization.ts';
import { SwarmCoordinator } from '../../../swarm/coordinator.ts';
import { TaskEngine } from '../../../task/engine.ts';
import { Logger } from '../../../core/logger.ts';

export const spawnCommand: CLICommand = {
  name: 'spawn',
  description: 'Direct agent spawning interface',
  category: 'Agents',
  usage: 'flowx spawn <agent-type> [name] [OPTIONS]',
  examples: [
    'flowx spawn researcher "Research Bot"',
    'flowx spawn coder --priority high',
    'flowx spawn coordinator --timeout 300',
    'flowx spawn analyst --capabilities "data,patterns"'
  ],
  options: [
    {
      name: 'name',
      short: 'n',
      description: 'Agent name',
      type: 'string'
    },
    {
      name: 'priority',
      short: 'p',
      description: 'Agent priority (1-10)',
      type: 'number',
      default: 5
    },
    {
      name: 'timeout',
      short: 't',
      description: 'Agent timeout in seconds',
      type: 'number',
      default: 300
    },
    {
      name: 'capabilities',
      short: 'c',
      description: 'Comma-separated agent capabilities',
      type: 'string'
    },
    {
      name: 'max-tasks',
      short: 'm',
      description: 'Maximum concurrent tasks',
      type: 'number',
      default: 3
    },
    {
      name: 'autonomy',
      short: 'a',
      description: 'Autonomy level (0.0-1.0)',
      type: 'number',
      default: 0.7
    },
    {
      name: 'verbose',
      short: 'v',
      description: 'Verbose output',
      type: 'boolean'
    }
  ],
  handler: async (context: CLIContext) => {
    const { args, options } = context;
    
    console.log('Debug - args:', args, 'options:', options);
    
    if (args.length === 0) {
      printError('Agent type is required');
      printInfo('Usage: flowx spawn <agent-type> [name] [OPTIONS]');
      printInfo('Available types: researcher, coder, analyst, coordinator, tester, reviewer, architect, optimizer, documenter, monitor, specialist, security, devops');
      return;
    }

    const agentType = args[0];
    const agentName = args[1] || options.name || `${agentType}-${Date.now()}`;

    // Validate agent type
    const validTypes = [
      'researcher', 'coder', 'analyst', 'coordinator', 'tester', 'reviewer',
      'architect', 'optimizer', 'documenter', 'monitor', 'specialist', 
      'security', 'devops'
    ];

    if (!validTypes.includes(agentType)) {
      printError(`Invalid agent type: ${agentType}`);
      printInfo(`Valid types: ${validTypes.join(', ')}`);
      return;
    }

    try {
      printInfo(`🚀 Spawning ${agentType} agent: ${agentName}`);
      
      // Initialize SwarmCoordinator
      const logger = Logger.getInstance();
      const swarmCoordinator = new SwarmCoordinator({
        name: 'spawn-swarm',
        description: 'Temporary swarm for agent spawning',
        version: '1.0.0',
        mode: 'centralized',
        strategy: 'auto',
        maxAgents: 50,
        maxConcurrentTasks: 10,
        qualityThreshold: 0.8,
        resourceLimits: {
          memory: 512 * 1024 * 1024, // 512MB
          cpu: 2,
          disk: 1024 * 1024 * 1024 // 1GB
        }
      });

      // Initialize the coordinator
      await swarmCoordinator.initialize();

      // Parse capabilities
      const capabilities = options.capabilities ? 
        options.capabilities.split(',').map((c: string) => c.trim()) : 
        [];

      if (options.verbose) {
        printInfo('Agent Configuration:');
        console.log(JSON.stringify({
          name: agentName,
          type: agentType,
          capabilities,
          priority: options.priority || 5,
          timeout: options.timeout || 300,
          maxTasks: options.maxTasks || 3,
          autonomy: options.autonomy || 0.7
        }, null, 2));
      }

      // Register the agent with SwarmCoordinator
      const agentId = await swarmCoordinator.registerAgent(
        agentName,
        agentType as any,
        capabilities
      );
      
      printSuccess(`✅ Agent spawned successfully!`);
      printInfo(`🆔 Agent ID: ${agentId}`);
      printInfo(`🏷️  Name: ${agentName}`);
      printInfo(`🔧 Type: ${agentType}`);
      printInfo(`⚡ Priority: ${options.priority || 5}`);
      printInfo(`🎯 Max Tasks: ${options.maxTasks || 3}`);
      printInfo(`🤖 Autonomy: ${((options.autonomy || 0.7) * 100).toFixed(0)}%`);
      
      if (capabilities.length > 0) {
        printInfo(`🛠️  Capabilities: ${capabilities.join(', ')}`);
      }

      // Show swarm status
      const swarmStatus = swarmCoordinator.getSwarmStatus();
      printInfo(`📊 Swarm Status: ${swarmStatus.status}`);
      printInfo(`👥 Total Agents: ${swarmStatus.agents.total}`);
      printInfo(`🟢 Idle Agents: ${swarmStatus.agents.idle}`);

      // Stop coordinator
      await swarmCoordinator.stop();

    } catch (error) {
      printError(`Failed to spawn agent: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}; 
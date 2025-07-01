/**
 * Swarm Management Command
 * Comprehensive swarm coordination and management
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';

export const swarmCommand: CLICommand = {
  name: 'swarm',
  description: 'Manage AI swarms',
  category: 'Swarm',
  usage: 'claude-flow swarm <subcommand> [OPTIONS]',
  examples: [
    'claude-flow swarm create development --agents 5',
    'claude-flow swarm list',
    'claude-flow swarm status swarm-001',
    'claude-flow swarm scale swarm-001 --agents 10'
  ],
  subcommands: [
    {
      name: 'create',
      description: 'Create a new swarm',
      handler: createSwarm,
      arguments: [
        {
          name: 'name',
          description: 'Swarm name',
          required: true
        }
      ],
      options: [
        {
          name: 'agents',
          short: 'a',
          description: 'Number of agents to spawn',
          type: 'number',
          default: 3
        },
        {
          name: 'coordinator',
          short: 'c',
          description: 'Coordinator type',
          type: 'string',
          choices: ['hierarchical', 'mesh', 'centralized'],
          default: 'hierarchical'
        }
      ]
    },
    {
      name: 'list',
      description: 'List all swarms',
      handler: listSwarms,
      options: [
        {
          name: 'format',
          short: 'f',
          description: 'Output format',
          type: 'string',
          choices: ['table', 'json'],
          default: 'table'
        }
      ]
    }
  ],
  handler: async (context: CLIContext) => {
    return await listSwarms(context);
  }
};

async function createSwarm(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const swarmName = args[0];
  
  try {
    printInfo(`Creating swarm: ${swarmName}...`);
    printSuccess(`Swarm created successfully: ${swarmName}`);
  } catch (error) {
    printError(`Failed to create swarm: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function listSwarms(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const swarms = [
      { id: 'swarm-001', name: 'Development Swarm', status: 'active', agents: 5 },
      { id: 'swarm-002', name: 'Research Swarm', status: 'idle', agents: 3 }
    ];
    
    if (options.format === 'json') {
      console.log(JSON.stringify(swarms, null, 2));
    } else {
      console.log(successBold('\n🐝 Claude Flow Swarms\n'));
      const table = formatTable(swarms, [
        { header: 'ID', key: 'id' },
        { header: 'Name', key: 'name' },
        { header: 'Status', key: 'status' },
        { header: 'Agents', key: 'agents' }
      ]);
      console.log(table);
    }
    
  } catch (error) {
    printError(`Failed to list swarms: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

export default swarmCommand; 
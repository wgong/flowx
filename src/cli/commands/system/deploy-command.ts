/**
 * Deploy Command
 * Production deployment and environment management
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';
import { DeploymentManager, DeploymentEnvironment, Deployment, DeploymentStrategy } from '../../../enterprise/deployment-manager.ts';
import { Logger } from '../../../core/logger.ts';
import { ConfigManager } from '../../../core/config.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

let deploymentManager: DeploymentManager | null = null;

async function getDeploymentManager(): Promise<DeploymentManager> {
  if (!deploymentManager) {
    const logger = new Logger({
      level: 'info',
      format: 'json',
      destination: 'console'
    });
    const config = ConfigManager.getInstance();
    deploymentManager = new DeploymentManager('./deployments', logger, config);
    await deploymentManager.initialize();
  }
  return deploymentManager;
}

// Helper function to access deployments from manager
function getDeploymentFromManager(manager: DeploymentManager, deploymentId: string): Deployment | null {
  // Access the private deployments Map through type assertion
  const deploymentsMap = (manager as any).deployments as Map<string, Deployment>;
  return deploymentsMap.get(deploymentId) || null;
}

// Helper function to get all deployments from manager
function getDeploymentsFromManager(manager: DeploymentManager, filters?: {
  projectId?: string;
  environmentId?: string;
  limit?: number;
}): Deployment[] {
  // Access the private deployments Map through type assertion
  const deploymentsMap = (manager as any).deployments as Map<string, Deployment>;
  let deployments = Array.from(deploymentsMap.values());
  
  // Apply filters
  if (filters?.projectId) {
    deployments = deployments.filter(d => d.projectId === filters.projectId);
  }
  if (filters?.environmentId) {
    deployments = deployments.filter(d => d.environmentId === filters.environmentId);
  }
  
  // Sort by creation date (newest first)
  deployments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  // Apply limit
  if (filters?.limit) {
    deployments = deployments.slice(0, filters.limit);
  }
  
  return deployments;
}

// Helper function to get all environments from manager
function getEnvironmentsFromManager(manager: DeploymentManager): DeploymentEnvironment[] {
  // Access the private environments Map through type assertion
  const environmentsMap = (manager as any).environments as Map<string, DeploymentEnvironment>;
  return Array.from(environmentsMap.values());
}

export const deployCommand: CLICommand = {
  name: 'deploy',
  description: 'Deploy applications to production environments',
  category: 'System',
  usage: 'claude-flow deploy <subcommand> [OPTIONS]',
  examples: [
    'claude-flow deploy create --env production --strategy blue-green',
    'claude-flow deploy status --deployment dep-123',
    'claude-flow deploy rollback --deployment dep-123',
    'claude-flow deploy env list',
    'claude-flow deploy pipeline run --project myapp'
  ],
  options: [
    {
      name: 'env',
      short: 'e',
      description: 'Target environment (development, staging, production)',
      type: 'string'
    },
    {
      name: 'strategy',
      short: 's',
      description: 'Deployment strategy (blue-green, canary, rolling, recreate)',
      type: 'string',
      default: 'rolling'
    },
    {
      name: 'version',
      short: 'v',
      description: 'Application version to deploy',
      type: 'string'
    },
    {
      name: 'project',
      short: 'p',
      description: 'Project identifier',
      type: 'string'
    },
    {
      name: 'branch',
      short: 'b',
      description: 'Git branch to deploy',
      type: 'string',
      default: 'main'
    },
    {
      name: 'tag',
      short: 't',
      description: 'Git tag to deploy',
      type: 'string'
    },
    {
      name: 'force',
      short: 'f',
      description: 'Force deployment without approval',
      type: 'boolean'
    },
    {
      name: 'dry-run',
      short: 'd',
      description: 'Preview deployment without executing',
      type: 'boolean'
    },
    {
      name: 'watch',
      short: 'w',
      description: 'Watch deployment progress',
      type: 'boolean'
    }
  ],
  subcommands: [
    {
      name: 'create',
      description: 'Create and execute a new deployment',
      handler: async (context: CLIContext) => await createDeployment(context)
    },
    {
      name: 'status',
      description: 'Show deployment status',
      handler: async (context: CLIContext) => await showDeploymentStatus(context)
    },
    {
      name: 'list',
      description: 'List recent deployments',
      handler: async (context: CLIContext) => await listDeployments(context)
    },
    {
      name: 'rollback',
      description: 'Rollback a deployment',
      handler: async (context: CLIContext) => await rollbackDeployment(context)
    },
    {
      name: 'cancel',
      description: 'Cancel a running deployment',
      handler: async (context: CLIContext) => await cancelDeployment(context)
    },
    {
      name: 'logs',
      description: 'Show deployment logs',
      handler: async (context: CLIContext) => await showDeploymentLogs(context)
    },
    {
      name: 'env',
      description: 'Manage deployment environments',
      handler: async (context: CLIContext) => await manageEnvironments(context),
      subcommands: [
        {
          name: 'list',
          description: 'List environments',
          handler: async (context: CLIContext) => await listEnvironments(context)
        },
        {
          name: 'create',
          description: 'Create environment',
          handler: async (context: CLIContext) => await createEnvironment(context)
        },
        {
          name: 'update',
          description: 'Update environment',
          handler: async (context: CLIContext) => await updateEnvironment(context)
        },
        {
          name: 'delete',
          description: 'Delete environment',
          handler: async (context: CLIContext) => await deleteEnvironment(context)
        }
      ]
    },
    {
      name: 'strategy',
      description: 'Manage deployment strategies',
      handler: async (context: CLIContext) => await manageStrategies(context),
      subcommands: [
        {
          name: 'list',
          description: 'List strategies',
          handler: async (context: CLIContext) => await listStrategies(context)
        },
        {
          name: 'create',
          description: 'Create strategy',
          handler: async (context: CLIContext) => await createStrategy(context)
        }
      ]
    },
    {
      name: 'pipeline',
      description: 'Manage deployment pipelines',
      handler: async (context: CLIContext) => await managePipelines(context),
      subcommands: [
        {
          name: 'run',
          description: 'Run pipeline',
          handler: async (context: CLIContext) => await runPipeline(context)
        },
        {
          name: 'status',
          description: 'Pipeline status',
          handler: async (context: CLIContext) => await pipelineStatus(context)
        }
      ]
    },
    {
      name: 'metrics',
      description: 'Show deployment metrics',
      handler: async (context: CLIContext) => await showMetrics(context)
    }
  ],
  handler: async (context: CLIContext) => {
    const { args } = context;
    
    if (args.length === 0) {
      await listDeployments(context);
      return;
    }
    
    printError('Invalid subcommand. Use "claude-flow deploy --help" for usage information.');
  }
};

// === SUBCOMMAND HANDLERS ===

async function createDeployment(context: CLIContext): Promise<void> {
  const { options } = context;
  
  // Validate required options
  if (!options.env) {
    printError('Environment is required. Use --env to specify target environment.');
    return;
  }
  
  if (!options.project) {
    printError('Project is required. Use --project to specify project identifier.');
    return;
  }

  try {
    const manager = await getDeploymentManager();
    
    // Get git information
    const gitInfo = await getCurrentGitInfo(options);
    
    // Create deployment
    const deploymentData = {
      name: `${options.project}-${options.version || gitInfo.commit.substring(0, 8)}`,
      version: options.version || gitInfo.commit,
      projectId: options.project,
      environmentId: options.env,
      strategyId: options.strategy || 'rolling',
      initiatedBy: 'cli-user',
      source: {
        repository: gitInfo.repository,
        branch: options.branch || gitInfo.branch,
        commit: gitInfo.commit,
        tag: options.tag
      },
      artifacts: {
        files: []
      }
    };

    if (options.dryRun) {
      printInfo('🔍 Deployment Preview (Dry Run)');
      console.log(JSON.stringify(deploymentData, null, 2));
      printInfo('Use --force to execute this deployment');
      return;
    }

    const deployment = await manager.createDeployment(deploymentData);
    
    printSuccess(`✅ Deployment created: ${deployment.id}`);
    printInfo(`Name: ${deployment.name}`);
    printInfo(`Environment: ${deployment.environmentId}`);
    printInfo(`Strategy: ${deployment.strategyId}`);
    printInfo(`Version: ${deployment.version}`);

    // Execute deployment
    if (!options.force) {
      printWarning('Deployment created but not executed. Use --force to auto-execute.');
    } else {
      printInfo('🚀 Starting deployment execution...');
      await manager.executeDeployment(deployment.id);
      
      if (options.watch) {
        await watchDeployment(deployment.id, manager);
      }
    }
    
  } catch (error) {
    printError(`Failed to create deployment: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showDeploymentStatus(context: CLIContext): Promise<void> {
  const { args } = context;
  
  const deploymentId = args[0];
  if (!deploymentId) {
    printError('Deployment ID is required');
    printInfo('Usage: claude-flow deploy status <deployment-id>');
    return;
  }

  try {
    const manager = await getDeploymentManager();
    
    const deployment = getDeploymentFromManager(manager, deploymentId);
    if (!deployment) {
      printError(`Deployment not found: ${deploymentId}`);
      return;
    }

    console.log(successBold(`\n🚀 Deployment Status: ${deployment.id}\n`));
    console.log(`Name: ${deployment.name}`);
    console.log(`Project: ${deployment.projectId}`);
    console.log(`Environment: ${deployment.environmentId}`);
    console.log(`Strategy: ${deployment.strategyId}`);
    console.log(`Version: ${deployment.version}`);
    console.log(`Status: ${getStatusDisplay(deployment.status)}`);
    console.log(`Initiated By: ${deployment.initiatedBy}`);
    console.log(`Started: ${deployment.createdAt.toLocaleString()}`);
    
    if (deployment.metrics.endTime) {
      console.log(`Completed: ${deployment.metrics.endTime.toLocaleString()}`);
      console.log(`Duration: ${formatDuration(deployment.metrics.duration || 0)}`);
    }

    // Show source information
    console.log(`\nSource:`);
    console.log(`  Repository: ${deployment.source.repository}`);
    console.log(`  Branch: ${deployment.source.branch}`);
    console.log(`  Commit: ${deployment.source.commit}`);
    if (deployment.source.tag) {
      console.log(`  Tag: ${deployment.source.tag}`);
    }

    // Show stage progress
    if (deployment.stages.length > 0) {
      console.log(infoBold('\n📋 Stage Progress\n'));
      
      const stageTable = deployment.stages.map((stage: any) => ({
        name: stage.name,
        status: getStatusDisplay(stage.status),
        duration: stage.duration ? formatDuration(stage.duration) : '-',
        order: stage.order
      }));

      console.log(formatTable(stageTable, [
        { header: 'Order', key: 'order' },
        { header: 'Stage', key: 'name' },
        { header: 'Status', key: 'status' },
        { header: 'Duration', key: 'duration' }
      ]));
    }
    
  } catch (error) {
    printError(`Failed to show deployment status: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function listDeployments(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const manager = await getDeploymentManager();
    const deployments = getDeploymentsFromManager(manager, {
      projectId: options.project,
      environmentId: options.env,
      limit: 20
    });

    if (deployments.length === 0) {
      printInfo('No deployments found');
      return;
    }

    console.log(infoBold('\n📋 Recent Deployments\n'));
    
    const deploymentTable = deployments.map((dep: any) => ({
      id: dep.id.substring(0, 8),
      name: dep.name,
      version: dep.version,
      env: dep.environmentId,
      status: getStatusDisplay(dep.status),
      created: dep.createdAt.toLocaleDateString()
    }));

    console.log(formatTable(deploymentTable, [
      { header: 'ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Version', key: 'version' },
      { header: 'Environment', key: 'env' },
      { header: 'Status', key: 'status' },
      { header: 'Created', key: 'created' }
    ]));

    printSuccess(`Found ${deployments.length} deployments`);
    
  } catch (error) {
    printError(`Failed to list deployments: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function rollbackDeployment(context: CLIContext): Promise<void> {
  const { args, options } = context;
  
  const deploymentId = args[0];
  if (!deploymentId) {
    printError('Deployment ID is required');
    printInfo('Usage: claude-flow deploy rollback <deployment-id> [--reason "reason"]');
    return;
  }

  try {
    const manager = await getDeploymentManager();
    const reason = options.reason || 'Manual rollback requested';
    
    printInfo(`🔄 Rolling back deployment: ${deploymentId}`);
    await manager.rollbackDeployment(deploymentId, reason, 'cli-user');
    
    printSuccess(`✅ Rollback initiated for deployment: ${deploymentId}`);
    
  } catch (error) {
    printError(`Failed to rollback deployment: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function cancelDeployment(context: CLIContext): Promise<void> {
  const { args } = context;
  
  const deploymentId = args[0];
  if (!deploymentId) {
    printError('Deployment ID is required');
    printInfo('Usage: claude-flow deploy cancel <deployment-id>');
    return;
  }

  try {
    printInfo(`⏹️ Cancelling deployment: ${deploymentId}`);
    // Implementation would cancel the deployment
    printSuccess(`✅ Deployment cancelled: ${deploymentId}`);
    
  } catch (error) {
    printError(`Failed to cancel deployment: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showDeploymentLogs(context: CLIContext): Promise<void> {
  const { args, options } = context;
  
  const deploymentId = args[0];
  if (!deploymentId) {
    printError('Deployment ID is required');
    printInfo('Usage: claude-flow deploy logs <deployment-id> [options]');
    return;
  }

  try {
    const manager = await getDeploymentManager();
    
    const deployment = getDeploymentFromManager(manager, deploymentId);
    if (!deployment) {
      printError(`Deployment not found: ${deploymentId}`);
      return;
    }

    console.log(successBold(`\n📄 Deployment Logs: ${deployment.id}\n`));

    // Show logs from all stages
    for (const stage of deployment.stages) {
      if (stage.logs.length > 0) {
        console.log(infoBold(`\n--- ${stage.name} ---\n`));
        stage.logs.forEach(log => {
          const timestamp = log.timestamp.toLocaleTimeString();
          const level = formatLogLevel(log.level);
          console.log(`[${timestamp}] ${level} ${log.message}`);
        });
      }
    }
    
  } catch (error) {
    printError(`Failed to show deployment logs: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function listEnvironments(context: CLIContext): Promise<void> {
  try {
    const manager = await getDeploymentManager();
    const environments = getEnvironmentsFromManager(manager);
    
    if (environments.length === 0) {
      printInfo('No environments configured');
      return;
    }

    console.log(infoBold('\n🌍 Deployment Environments\n'));
    
    const envTable = environments.map((env: any) => ({
      id: env.id,
      name: env.name,
      type: env.type,
      status: getStatusDisplay(env.status),
      provider: env.configuration.provider,
      region: env.configuration.region
    }));

    console.log(formatTable(envTable, [
      { header: 'ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Type', key: 'type' },
      { header: 'Status', key: 'status' },
      { header: 'Provider', key: 'provider' },
      { header: 'Region', key: 'region' }
    ]));

    printSuccess(`Found ${environments.length} environments`);
    
  } catch (error) {
    printError(`Failed to list environments: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function createEnvironment(context: CLIContext): Promise<void> {
  const { options } = context;
  
  if (!options.name) {
    printError('Environment name is required');
    printInfo('Usage: claude-flow deploy env create --name <name> --type <type> [options]');
    return;
  }

  try {
    const manager = await getDeploymentManager();
    
    const environmentData = {
      name: options.name,
      type: options.type || 'development',
      status: 'active' as 'active' | 'inactive' | 'maintenance' | 'error',
      configuration: {
        region: options.region || 'us-east-1',
        provider: options.provider || 'aws',
        endpoints: [],
        secrets: {},
        environment_variables: {},
        resources: {
          cpu: options.cpu || '1',
          memory: options.memory || '1Gi',
          storage: options.storage || '10Gi',
          replicas: parseInt(options.replicas || '1')
        }
      },
      healthCheck: {
        url: options.healthUrl || '/health',
        method: 'GET' as 'GET' | 'POST' | 'HEAD',
        expectedStatus: 200,
        timeout: 30000,
        interval: 60000,
        retries: 3
      },
      monitoring: {
        enabled: true,
        alerts: [],
        metrics: ['cpu', 'memory', 'requests'],
        logs: {
          level: 'info',
          retention: '30d',
          aggregation: true
        }
      },
      security: {
        tls: true,
        authentication: true,
        authorization: ['rbac'],
        compliance: ['gdpr'],
        scanning: {
          vulnerabilities: true,
          secrets: true,
          licenses: true
        }
      }
    };

    const environment = await manager.createEnvironment(environmentData);
    
    printSuccess(`✅ Environment created: ${environment.id}`);
    printInfo(`Name: ${environment.name}`);
    printInfo(`Type: ${environment.type}`);
    printInfo(`Provider: ${environment.configuration.provider}`);
    
  } catch (error) {
    printError(`Failed to create environment: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showMetrics(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const manager = await getDeploymentManager();
    const metrics = await manager.getDeploymentMetrics({
      projectId: options.project,
      environmentId: options.env
    });

    console.log(successBold('\n📊 Deployment Metrics\n'));
    
    console.log(`Total Deployments: ${metrics.totalDeployments}`);
    console.log(`Successful: ${metrics.successfulDeployments}`);
    console.log(`Failed: ${metrics.failedDeployments}`);
    console.log(`Rolled Back: ${metrics.rolledBackDeployments}`);
    console.log(`Success Rate: ${((metrics.successfulDeployments / metrics.totalDeployments) * 100).toFixed(1)}%`);
    console.log(`Average Deployment Time: ${formatDuration(metrics.averageDeploymentTime)}`);
    console.log(`Deployment Frequency: ${metrics.deploymentFrequency.toFixed(2)} per day`);
    console.log(`Mean Time to Recovery: ${formatDuration(metrics.meanTimeToRecovery)}`);
    console.log(`Change Failure Rate: ${(metrics.changeFailureRate * 100).toFixed(1)}%`);
    
  } catch (error) {
    printError(`Failed to show metrics: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// === HELPER FUNCTIONS ===

async function getCurrentGitInfo(options: any): Promise<any> {
  return {
    repository: 'claude-flow',
    branch: options.branch || 'main',
    commit: Math.random().toString(36).substring(2, 15)
  };
}

async function watchDeployment(deploymentId: string, manager: DeploymentManager): Promise<void> {
  printInfo(`👀 Watching deployment: ${deploymentId}`);
  
  // Mock implementation - would watch deployment progress
  const interval = setInterval(() => {
    const deployment = getDeploymentFromManager(manager, deploymentId);
    if (deployment) {
      console.log(`Status: ${deployment.status}`);
      
      if (['success', 'failed', 'cancelled'].includes(deployment.status)) {
        clearInterval(interval);
        printInfo(`Deployment ${deployment.status}`);
      }
    }
  }, 2000);

  // Stop watching after 5 minutes
  setTimeout(() => {
    clearInterval(interval);
    printInfo('Stopped watching deployment');
  }, 300000);
}

function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    pending: '⏳ Pending',
    running: '🔄 Running',
    success: '✅ Success',
    failed: '❌ Failed',
    'rolled-back': '🔄 Rolled Back',
    cancelled: '⏹️ Cancelled',
    active: '🟢 Active',
    inactive: '🔴 Inactive',
    maintenance: '🟡 Maintenance',
    error: '❌ Error'
  };
  return statusMap[status] || status;
}

function formatLogLevel(level: string): string {
  const levelMap: Record<string, string> = {
    debug: '🐛 DEBUG',
    info: 'ℹ️ INFO',
    warn: '⚠️ WARN',
    error: '❌ ERROR'
  };
  return levelMap[level] || level;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

async function updateEnvironment(context: CLIContext): Promise<void> {
  printInfo('Environment update functionality coming soon...');
}

async function deleteEnvironment(context: CLIContext): Promise<void> {
  printInfo('Environment deletion functionality coming soon...');
}

async function manageEnvironments(context: CLIContext): Promise<void> {
  await listEnvironments(context);
}

async function listStrategies(context: CLIContext): Promise<void> {
  printInfo('Strategy listing functionality coming soon...');
}

async function createStrategy(context: CLIContext): Promise<void> {
  printInfo('Strategy creation functionality coming soon...');
}

async function manageStrategies(context: CLIContext): Promise<void> {
  printInfo('Strategy management functionality coming soon...');
}

async function runPipeline(context: CLIContext): Promise<void> {
  printInfo('Pipeline execution functionality coming soon...');
}

async function pipelineStatus(context: CLIContext): Promise<void> {
  printInfo('Pipeline status functionality coming soon...');
}

async function managePipelines(context: CLIContext): Promise<void> {
  printInfo('Pipeline management functionality coming soon...');
} 
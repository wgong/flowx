/**
 * Swarm Demonstration Command
 * 
 * Provides CLI integration for running comprehensive swarm demonstrations
 * with multiple agents working together on real projects.
 */

import { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { SwarmCoordinator } from '../../../coordination/swarm-coordinator.ts';
import { Logger } from '../../../core/logger.ts';
import { promises as fs } from 'fs';
import { join } from 'path';

export class SwarmDemoCommand implements CLICommand {
  name = 'demo';
  description = 'Run comprehensive swarm demonstrations with multiple agents';
  
  subcommands: CLICommand[] = [
    {
      name: 'hello-world',
      description: 'Demonstrate 10+ agents building a Hello World application',
      handler: this.runHelloWorldDemo.bind(this)
    },
    {
      name: 'web-app',
      description: 'Demonstrate full-stack web application development',
      handler: this.runWebAppDemo.bind(this)
    },
    {
      name: 'api-service',
      description: 'Demonstrate REST API service development',
      handler: this.runApiServiceDemo.bind(this)
    },
    {
      name: 'list',
      description: 'List available demonstrations',
      handler: this.listDemos.bind(this)
    },
    {
      name: 'status',
      description: 'Show status of running demonstrations',
      handler: this.showDemoStatus.bind(this)
    }
  ];

  private logger: Logger;
  private activeCoordinators: Map<string, SwarmCoordinator> = new Map();

  constructor() {
    this.logger = new Logger({ level: 'info', format: 'text', destination: 'console' }, { component: 'SwarmDemo' });
  }

  async handler(context: CLIContext): Promise<void> {
    const { args } = context;
    
    if (args.length === 0) {
      await this.showHelp(context);
      return;
    }

    const subcommand = args[0];
    const subcommandHandler = this.subcommands.find(sc => sc.name === subcommand);
    
    if (!subcommandHandler) {
      console.error(`Unknown subcommand: ${subcommand}`);
      await this.showHelp(context);
      return;
    }

    await subcommandHandler.handler(context);
  }

  private async showHelp(context: CLIContext): Promise<void> {
    console.log('\n🔮 Swarm Demonstration Commands:\n');
    
    this.subcommands.forEach(subcommand => {
      console.log(`  ${subcommand.name.padEnd(15)} - ${subcommand.description}`);
    });
    
    console.log('\nExamples:');
    console.log('  claude-flow swarm demo hello-world --agents 12 --output ./demo-output');
    console.log('  claude-flow swarm demo web-app --features auth,api,ui --agents 15');
    console.log('  claude-flow swarm demo api-service --endpoints users,posts,auth');
    console.log('  claude-flow swarm demo status');
  }

  private async runHelloWorldDemo(context: CLIContext): Promise<void> {
    const { options } = context;
    
    const config = {
      agentCount: options.agents || 10,
      outputDir: options.output || './hello-world-demo',
      timeout: options.timeout || 600000, // 10 minutes
      quality: options.quality || 0.8,
      monitoring: options.monitoring !== false
    };

    console.log('\n🚀 Starting Hello World Swarm Demonstration');
    console.log(`📊 Configuration: ${config.agentCount} agents, output: ${config.outputDir}`);

    try {
      // Create swarm coordinator
      const coordinator = await this.createSwarmCoordinator('hello-world-demo', {
        maxAgents: config.agentCount,
        outputDirectory: config.outputDir
      });

      // Create agents for the demonstration
      const agentIds = await this.createDemoAgents(coordinator, config.agentCount);
      console.log(`✅ Created ${agentIds.length} demo agents`);

      // Create objective using the correct method signature
      const objectiveId = await coordinator.createObjective(
        this.getHelloWorldObjective(config.outputDir),
        'auto'
      );
      
      console.log(`📋 Created objective: ${objectiveId}`);
      
      // Start execution by starting the coordinator
      await coordinator.start();
      console.log('🚀 Swarm execution started');
      
      // Monitor progress
      await this.monitorSwarmProgress(coordinator, console, config.timeout);
      
      // Validate results
      const results = await this.validateSwarmResults(config.outputDir, console);
      
      // Generate report
      await this.generateDemoReport(coordinator, results, config.outputDir);
      
      console.log('✅ Hello World demonstration completed successfully!');
      
    } catch (error) {
      console.error(`❌ Demo failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async runWebAppDemo(context: CLIContext): Promise<void> {
    const { options } = context;
    
    const config = {
      agentCount: options.agents || 15,
      outputDir: options.output || './webapp-demo',
      features: options.features ? options.features.split(',') : ['auth', 'api', 'ui', 'tests'],
      timeout: options.timeout || 1200000, // 20 minutes
      quality: options.quality || 0.85,
      monitoring: options.monitoring !== false
    };

    console.log('\n🌐 Starting Web Application Swarm Demonstration');
    console.log(`📊 Features: ${config.features.join(', ')}`);

    try {
      // Create swarm coordinator
      const coordinator = await this.createSwarmCoordinator('webapp-demo', {
        maxAgents: config.agentCount,
        outputDirectory: config.outputDir
      });

      // Create specialized agents
      const agentIds = await this.createWebAppAgents(coordinator, config.agentCount);
      console.log(`✅ Created ${agentIds.length} specialized web app agents`);

      // Create objective
      const objectiveId = await coordinator.createObjective(
        this.getWebAppObjective(config.outputDir, config.features),
        'auto'
      );
      
      console.log(`📋 Created web app objective: ${objectiveId}`);

      // Start execution
      await coordinator.start();
      console.log('🚀 Web app swarm execution started');
      
      // Monitor with detailed progress
      await this.monitorSwarmProgress(coordinator, console, config.timeout);
      
      // Validate results
      const results = await this.validateWebAppResults(config.outputDir, console);
      
      // Generate comprehensive report
      await this.generateDemoReport(coordinator, results, config.outputDir);
      
      console.log('✅ Web application demonstration completed successfully!');
      
    } catch (error) {
      console.error(`❌ Web app demo failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async runApiServiceDemo(context: CLIContext): Promise<void> {
    const { options } = context;
    
    const config = {
      agentCount: options.agents || 8,
      outputDir: options.output || './api-service-demo',
      endpoints: options.endpoints ? options.endpoints.split(',') : ['users', 'posts', 'auth', 'comments'],
      timeout: options.timeout || 900000, // 15 minutes
      quality: options.quality || 0.9,
      monitoring: options.monitoring !== false
    };

    console.log('\n🔌 Starting API Service Swarm Demonstration');
    console.log(`📊 Endpoints: ${config.endpoints.join(', ')}`);

    try {
      // Create swarm coordinator
      const coordinator = await this.createSwarmCoordinator('api-service-demo', {
        maxAgents: config.agentCount,
        outputDirectory: config.outputDir
      });

      // Create specialized agents
      const agentIds = await this.createApiServiceAgents(coordinator, config.agentCount);
      console.log(`✅ Created ${agentIds.length} specialized API service agents`);

      // Create objective
      const objectiveId = await coordinator.createObjective(
        this.getApiServiceObjective(config.outputDir, config.endpoints),
        'auto'
      );
      
      console.log(`📋 Created API service objective: ${objectiveId}`);

      // Start execution
      await coordinator.start();
      console.log('🚀 API service swarm execution started');
      
      // Monitor progress
      await this.monitorSwarmProgress(coordinator, console, config.timeout);
      
      // Validate results
      const results = await this.validateApiServiceResults(config.outputDir, console);
      
      // Generate report
      await this.generateDemoReport(coordinator, results, config.outputDir);
      
      console.log('✅ API service demonstration completed successfully!');
      
    } catch (error) {
      console.error(`❌ API service demo failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async listDemos(context: CLIContext): Promise<void> {
    console.log('\n📋 Available Swarm Demonstrations:\n');
    
    const demos = [
      {
        name: 'hello-world',
        description: 'Basic Hello World application with 10+ agents',
        complexity: 'Beginner',
        duration: '5-10 minutes',
        agents: '8-12',
        outputs: 'HTML, CSS, JS, README'
      },
      {
        name: 'web-app',
        description: 'Full-stack web application with authentication',
        complexity: 'Intermediate',
        duration: '15-20 minutes',
        agents: '12-18',
        outputs: 'Frontend, Backend, Database, Tests'
      },
      {
        name: 'api-service',
        description: 'REST API service with multiple endpoints',
        complexity: 'Advanced',
        duration: '10-15 minutes',
        agents: '6-10',
        outputs: 'API Server, Documentation, Tests'
      }
    ];

    demos.forEach(demo => {
      console.log(`🔮 ${demo.name}`);
      console.log(`   ${demo.description}`);
      console.log(`   Complexity: ${demo.complexity} | Duration: ${demo.duration}`);
      console.log(`   Agents: ${demo.agents} | Outputs: ${demo.outputs}`);
      console.log('');
    });

    console.log('Usage: claude-flow swarm demo <demo-name> [options]');
    console.log('Options: --agents <count> --output <dir> --timeout <ms> --quality <0-1>');
  }

  private async showDemoStatus(context: CLIContext): Promise<void> {
    console.log('\n📊 Swarm Demonstration Status:\n');
    
    if (this.activeCoordinators.size === 0) {
      console.log('No active demonstrations running.');
      return;
    }

    for (const [name, coordinator] of this.activeCoordinators) {
      const status = coordinator.getSwarmStatus();
      
      console.log(`🔮 ${name}`);
      console.log(`   Status: ${status.status}`);
      console.log(`   Objectives: ${status.objectives}`);
      console.log(`   Tasks: ${status.tasks.total} total, ${status.tasks.completed} completed`);
      console.log(`   Agents: ${status.agents.total} total, ${status.agents.busy} busy`);
      console.log(`   Uptime: ${Math.floor(status.uptime / 1000)}s`);
      console.log('');
    }
  }

  private async createSwarmCoordinator(name: string, config: any): Promise<SwarmCoordinator> {
    const coordinator = new SwarmCoordinator({
      maxAgents: config.maxAgents || 10,
      coordinationStrategy: {
        name: 'hybrid',
        description: 'Hybrid coordination strategy combining multiple approaches',
        agentSelection: 'capability-based',
        taskScheduling: 'priority',
        loadBalancing: 'work-stealing',
        faultTolerance: 'retry',
        communication: 'direct'
      }
    });

    await coordinator.initialize();
    this.activeCoordinators.set(name, coordinator);
    
    return coordinator;
  }

  private async createDemoAgents(coordinator: SwarmCoordinator, count: number): Promise<string[]> {
    const agentConfigs = [
      { type: 'frontend', name: 'UI Developer', specialization: 'React/HTML/CSS' },
      { type: 'backend', name: 'Backend Developer', specialization: 'Node.js/API' },
      { type: 'tester', name: 'QA Tester', specialization: 'Testing/Validation' },
      { type: 'documenter', name: 'Technical Writer', specialization: 'Documentation' },
      { type: 'reviewer', name: 'Code Reviewer', specialization: 'Code Quality' },
      { type: 'architect', name: 'Solution Architect', specialization: 'Architecture' },
      { type: 'devops', name: 'DevOps Engineer', specialization: 'Build/Deploy' },
      { type: 'security', name: 'Security Analyst', specialization: 'Security Review' }
    ];

    const agentIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const agentConfig = agentConfigs[i % agentConfigs.length];
      
      const agentId = await coordinator.registerAgent(
        `${agentConfig.name} ${Math.floor(i / agentConfigs.length) + 1}`,
        agentConfig.type as any,
        [
          'code-generation',
          'code-review',
          'testing',
          'documentation'
        ]
      );
      
      agentIds.push(agentId);
    }

    return agentIds;
  }

  private async createWebAppAgents(coordinator: SwarmCoordinator, count: number): Promise<string[]> {
    const agentConfigs = [
      { type: 'frontend', name: 'Frontend Developer', specialization: 'React/TypeScript' },
      { type: 'backend', name: 'Backend Developer', specialization: 'Node.js/Express' },
      { type: 'database', name: 'Database Developer', specialization: 'PostgreSQL/MongoDB' },
      { type: 'auth', name: 'Auth Specialist', specialization: 'Authentication/Security' },
      { type: 'api', name: 'API Developer', specialization: 'REST/GraphQL' },
      { type: 'tester', name: 'QA Engineer', specialization: 'E2E/Unit Testing' },
      { type: 'documenter', name: 'Technical Writer', specialization: 'API/User Docs' },
      { type: 'reviewer', name: 'Senior Developer', specialization: 'Code Review' },
      { type: 'ui', name: 'UI/UX Designer', specialization: 'Design/Usability' },
      { type: 'devops', name: 'DevOps Engineer', specialization: 'CI/CD/Docker' }
    ];

    const agentIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const agentConfig = agentConfigs[i % agentConfigs.length];
      
      const agentId = await coordinator.registerAgent(
        `${agentConfig.name} ${Math.floor(i / agentConfigs.length) + 1}`,
        agentConfig.type as any,
        [
          'code-generation',
          'code-review',
          'testing',
          'documentation',
          'ui-design'
        ]
      );
      
      agentIds.push(agentId);
    }

    return agentIds;
  }

  private async createApiServiceAgents(coordinator: SwarmCoordinator, count: number): Promise<string[]> {
    const agentConfigs = [
      { type: 'backend', name: 'API Developer', specialization: 'REST API/Express' },
      { type: 'database', name: 'Database Specialist', specialization: 'Schema/Queries' },
      { type: 'auth', name: 'Security Engineer', specialization: 'JWT/OAuth' },
      { type: 'tester', name: 'API Tester', specialization: 'API Testing' },
      { type: 'documenter', name: 'API Writer', specialization: 'OpenAPI/Swagger' },
      { type: 'reviewer', name: 'Senior Engineer', specialization: 'Code Review' },
      { type: 'performance', name: 'Performance Engineer', specialization: 'Optimization' },
      { type: 'validation', name: 'Data Validator', specialization: 'Input Validation' }
    ];

    const agentIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const agentConfig = agentConfigs[i % agentConfigs.length];
      
      const agentId = await coordinator.registerAgent(
        `${agentConfig.name} ${Math.floor(i / agentConfigs.length) + 1}`,
        agentConfig.type as any,
        [
          'code-generation',
          'code-review',
          'testing',
          'documentation',
          'api-design'
        ]
      );
      
      agentIds.push(agentId);
    }

    return agentIds;
  }

  private getHelloWorldObjective(outputDir: string): string {
    return `Create a comprehensive Hello World application in ${outputDir}/hello-world-app with the following requirements:

1. **Frontend Components:**
   - Modern HTML5 structure with semantic elements
   - Responsive CSS with animations and modern styling
   - Interactive JavaScript with user engagement features
   - Mobile-first responsive design

2. **Content & Features:**
   - Personalized greeting with user input
   - Dynamic time-based greetings
   - Interactive elements (buttons, forms)
   - Smooth animations and transitions

3. **Code Quality:**
   - Clean, well-commented code
   - Modular structure with separate files
   - Cross-browser compatibility
   - Performance optimizations

4. **Documentation:**
   - Comprehensive README.md
   - Code comments and documentation
   - Setup and usage instructions
   - Feature descriptions

5. **Testing & Validation:**
   - Input validation
   - Error handling
   - Cross-browser testing notes
   - Performance considerations`;
  }

  private getWebAppObjective(outputDir: string, features: string[]): string {
    return `Develop a full-stack web application in ${outputDir}/webapp with the following features: ${features.join(', ')}.

Requirements include:
- Modern frontend framework (React/Vue)
- RESTful API backend
- Database integration
- User authentication
- Responsive design
- Comprehensive testing
- API documentation
- Deployment configuration`;
  }

  private getApiServiceObjective(outputDir: string, endpoints: string[]): string {
    return `Build a REST API service in ${outputDir}/api-service with endpoints: ${endpoints.join(', ')}.

Requirements include:
- Express.js/Fastify server
- Database models and migrations
- Authentication middleware
- Input validation
- Error handling
- API documentation (OpenAPI/Swagger)
- Unit and integration tests
- Docker configuration`;
  }

  private async monitorSwarmProgress(
    coordinator: SwarmCoordinator,
    outputFormatter: any,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= timeout) {
          clearInterval(checkInterval);
          reject(new Error('Demonstration timed out'));
          return;
        }
        
        const status = coordinator.getSwarmStatus();
        outputFormatter.log(`📊 Progress: ${status.tasks.completed}/${status.tasks.total} tasks completed`);
        
        // Check completion
        if (status.tasks.total > 0 && status.tasks.completed === status.tasks.total) {
          clearInterval(checkInterval);
          resolve();
          return;
        }
        
        // Check for failures
        if (status.tasks.failed > status.tasks.total * 0.5) {
          clearInterval(checkInterval);
          reject(new Error('Too many task failures'));
          return;
        }
        
      }, 5000); // Check every 5 seconds
    });
  }

  private async validateSwarmResults(outputDir: string, outputFormatter: any): Promise<any> {
    const results = {
      filesCreated: 0,
      qualityScore: 0,
      errors: [] as string[]
    };

    try {
      results.filesCreated = await this.countFilesRecursively(outputDir);
      outputFormatter.log(`📁 Files created: ${results.filesCreated}`);
      
      // Check for key files
      const packagePath = join(outputDir, 'hello-world-app', 'package.json');
      try {
        await fs.access(packagePath);
        results.qualityScore += 25;
      } catch {
        results.errors.push('package.json not found');
      }
      
      const readmePath = join(outputDir, 'hello-world-app', 'README.md');
      try {
        await fs.access(readmePath);
        results.qualityScore += 25;
      } catch {
        results.errors.push('README.md not found');
      }
      
      outputFormatter.info(`📁 Files created: ${results.filesCreated}`);
      outputFormatter.info(`🎯 Quality score: ${results.qualityScore}%`);
      
    } catch (error) {
      results.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      outputFormatter.error(`❌ Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results;
  }

  private async validateWebAppResults(outputDir: string, outputFormatter: any): Promise<any> {
    // Implementation for web app validation
    return { filesCreated: 0, qualityScore: 0, errors: [] };
  }

  private async validateApiServiceResults(outputDir: string, outputFormatter: any): Promise<any> {
    // Implementation for API service validation
    return { filesCreated: 0, qualityScore: 0, errors: [] };
  }

  private async countFilesRecursively(dir: string): Promise<number> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let count = 0;
      
      for (const entry of entries) {
        if (entry.isFile()) {
          count++;
        } else if (entry.isDirectory()) {
          count += await this.countFilesRecursively(join(dir, entry.name));
        }
      }
      
      return count;
    } catch {
      return 0;
    }
  }

  private async generateDemoReport(
    coordinator: SwarmCoordinator,
    results: any,
    outputDir: string
  ): Promise<void> {
    const report = {
      demonstration: 'Swarm Demo Report',
      timestamp: new Date().toISOString(),
      swarm: {
        status: coordinator.getSwarmStatus()
      },
      agents: coordinator.getAgents().map(agent => ({
        id: agent.id,
        type: agent.type,
        status: agent.status,
        tasksCompleted: agent.performance?.tasksCompleted || 0,
        performance: agent.performance?.averageResponseTime || 0
      })),
      tasks: coordinator.getTasks().map(task => ({
        id: task.id,
        type: task.type,
        status: task.status
      })),
      results,
      summary: {
        totalAgents: coordinator.getAgents().length,
        totalTasks: coordinator.getTasks().length,
        successRate: results.qualityScore,
        filesGenerated: results.filesCreated
      }
    };

    const reportPath = join(outputDir, 'demo-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📊 Demo report saved to: ${reportPath}`);
  }
}

export default SwarmDemoCommand;
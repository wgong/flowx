/**
 * Registration module for the benchmark system integration with claude-flow.
 * This file exports functions to register the benchmark system with the main claude-flow application.
 */

const { registerBenchmarkCommands } = require('./benchmark_integration');

/**
 * Register the benchmark system with the claude-flow application
 * @param {Object} app Claude-flow application instance
 * @returns {Object} The registered benchmark components
 */
function registerBenchmarkSystem(app) {
  if (!app || !app.commandRegistry) {
    throw new Error('Invalid claude-flow application instance. Command registry not available.');
  }

  // Register commands with the command registry
  registerBenchmarkCommands(app.commandRegistry);
  
  // Register with the API if available
  if (app.api) {
    registerBenchmarkApi(app.api);
  }
  
  // Register with the MCP if available
  if (app.mcp) {
    registerBenchmarkMcp(app.mcp);
  }
  
  // Register with other systems as needed
  
  return {
    registered: true,
    components: ['commands', app.api ? 'api' : null, app.mcp ? 'mcp' : null].filter(Boolean)
  };
}

/**
 * Register benchmark API endpoints
 * @param {Object} api Claude-flow API instance
 */
function registerBenchmarkApi(api) {
  if (!api || !api.registerEndpoint) {
    return false;
  }
  
  // Register API endpoints
  api.registerEndpoint({
    path: '/benchmarks',
    method: 'GET',
    handler: async (req, res) => {
      // List benchmarks
      res.json({ benchmarks: [] }); // Placeholder
    }
  });
  
  api.registerEndpoint({
    path: '/benchmarks',
    method: 'POST',
    handler: async (req, res) => {
      const { runBenchmarkIntegration } = require('./benchmark_integration');
      const options = req.body;
      
      try {
        const result = await runBenchmarkIntegration(options, { logger: api.logger });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  });
  
  return true;
}

/**
 * Register benchmark MCP tools
 * @param {Object} mcp Claude-flow MCP instance
 */
function registerBenchmarkMcp(mcp) {
  if (!mcp || !mcp.registerTool) {
    return false;
  }
  
  // Register MCP tools
  mcp.registerTool({
    name: 'runBenchmark',
    description: 'Run a benchmark with the specified options',
    schema: {
      type: 'object',
      properties: {
        objective: { type: 'string', description: 'Benchmark objective' },
        strategy: { type: 'string', description: 'Strategy to use' },
        mode: { type: 'string', description: 'Coordination mode' },
        maxAgents: { type: 'number', description: 'Maximum number of agents' },
        parallel: { type: 'boolean', description: 'Enable parallel execution' },
        optimized: { type: 'boolean', description: 'Enable optimizations' },
        metrics: { type: 'boolean', description: 'Enable metrics collection' }
      },
      required: ['objective']
    },
    handler: async (params) => {
      const { runBenchmarkIntegration } = require('./benchmark_integration');
      
      try {
        const result = await runBenchmarkIntegration(params, { 
          logger: mcp.logger,
          baseDir: mcp.baseDir 
        });
        return result;
      } catch (error) {
        throw new Error(`Benchmark failed: ${error.message}`);
      }
    }
  });
  
  return true;
}

module.exports = {
  registerBenchmarkSystem
};
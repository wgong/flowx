const { build } = require('esbuild');

// Plugin to strip "npm:" prefixes
const stripNpmPrefixPlugin = {
  name: 'strip-npm-prefix',
  setup(build) {
    build.onResolve({ filter: /^npm:/ }, args => {
      return {
        path: args.path.substring(4), // Remove "npm:"
        external: true,
      };
    });
  },
};

// Plugin to exclude problematic native modules
const excludeNativeModulesPlugin = {
  name: 'exclude-native-modules',
  setup(build) {
    build.onResolve({ filter: /^node-pty$/ }, () => {
      return { path: 'node-pty', external: true, sideEffects: false };
    });
  },
};

// Plugin to mark all other non-relative paths as external
const makeAllPackagesExternalPlugin = {
  name: 'make-all-packages-external',
  setup(build) {
    let filter = /^[^./]|^\.[^./]|^\.\.[^/]/; // Must not start with "/" or "./" or "../"
    build.onResolve({ filter }, args => ({ path: args.path, external: true }));
  },
};


(async () => {
  try {
    // Main CLI entrypoint
    await build({
      entryPoints: ['src/cli/main.ts'],
      bundle: true,
      platform: 'node',
      outfile: 'dist/main.js',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind core files
    await build({
      entryPoints: [
        'src/hive-mind/index.ts',
        'src/hive-mind/hive-coordinator.ts',
        'src/hive-mind/hive-initializer.ts',
        'src/hive-mind/types.ts'
      ],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind core components
    await build({
      entryPoints: ['src/hive-mind/core/hive-mind.ts'],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind/core',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind agents
    await build({
      entryPoints: [
        'src/hive-mind/agents/agent-factory.ts',
        'src/hive-mind/agents/agent-spawner.ts'
      ],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind/agents',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind tasks
    await build({
      entryPoints: ['src/hive-mind/tasks/task-executor.ts'],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind/tasks',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind database
    await build({
      entryPoints: ['src/hive-mind/database/database-manager.ts'],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind/database',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind neural system
    await build({
      entryPoints: [
        'src/hive-mind/neural/neural-manager.ts',
        'src/hive-mind/neural/neural-integration.ts',
        'src/hive-mind/neural/neural-workflow.ts',
        'src/hive-mind/neural/pattern-recognizer.ts',
        'src/hive-mind/neural/tensorflow-model.ts',
        'src/hive-mind/neural/index.ts'
      ],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind/neural',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind consensus
    await build({
      entryPoints: ['src/hive-mind/consensus/consensus-engine.ts'],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind/consensus',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Hive Mind utilities
    await build({
      entryPoints: ['src/hive-mind/utilities/resource-manager.ts'],
      bundle: false,
      platform: 'node',
      outdir: 'dist/hive-mind/utilities',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Utils
    await build({
      entryPoints: ['src/utils/helpers.ts', 'src/utils/types.ts'],
      bundle: false,
      platform: 'node',
      outdir: 'dist/utils',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Agents
    await build({
      entryPoints: ['src/agents/queen-agent.ts'],
      bundle: false,
      platform: 'node',
      outdir: 'dist/agents',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Core modules
    await build({
      entryPoints: [
        'src/core/logger.ts',
        'src/core/event-bus.ts',
        'src/core/config.ts',
        'src/core/container.ts',
        'src/core/bootstrap.ts',
        'src/core/orchestrator.ts',
        'src/core/persistence.ts',
        'src/core/plugin-system.ts'
      ],
      bundle: false,
      platform: 'node',
      outdir: 'dist/core',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    // Coordination modules
    await build({
      entryPoints: [
        'src/coordination/neural-pattern-engine.ts',
        'src/coordination/background-executor.ts',
        'src/coordination/conflict-resolution.ts',
        'src/coordination/dependency-graph.ts',
        'src/coordination/swarm-monitor.ts',
        'src/coordination/multi-model-orchestrator.ts'
      ],
      bundle: false,
      platform: 'node',
      outdir: 'dist/coordination',
      format: 'esm',
      plugins: [stripNpmPrefixPlugin, excludeNativeModulesPlugin, makeAllPackagesExternalPlugin],
      banner: {
        js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);'
      }
    });
    
    console.log('Build finished successfully!');
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  }
})(); 
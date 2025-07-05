#!/usr/bin/env node

/**
 * Claude Flow CLI - Main Entry Point
 * Optimized for fast startup with lazy service initialization
 */

import { CLIApplication } from './core/application.ts';
import { getAllCommands } from './core/command-registry.ts';
import { initializeGlobalServices, shutdownGlobalServices, isServicesInitialized } from './core/global-initialization.ts';
import { EventBus } from '../core/event-bus.ts';
import { Logger } from '../core/logger.ts';

async function main() {
  try {
    // Fast CLI startup - don't initialize heavy services immediately
    const app = new CLIApplication(
      'claude-flow',
      'AI-powered development workflows'
    );

    // Register all available commands
    const commands = getAllCommands();
    app.registerCommands(commands);
    
    // Setup graceful shutdown
    const shutdownHandler = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      if (isServicesInitialized()) {
        await shutdownGlobalServices();
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
    
    // Check if this is a help or version command (no need to initialize services)
    const args = process.argv.slice(2);
    const isHelpOrVersion = args.includes('--help') || args.includes('-h') || 
                           args.includes('--version') || args.includes('-v') ||
                           args.length === 0;

    if (isHelpOrVersion) {
      // Fast path for help/version - no service initialization needed
      await app.run();
      return;
    }

    // For actual commands, initialize services with timeout and progress
    console.log('🚀 Initializing Claude Flow CLI...');
    const startTime = Date.now();
    
    try {
      // Create core services
      const eventBus = EventBus.getInstance();
      const logger = Logger.getInstance();
      
      // Create memory config
      const memoryConfig = {
        backend: 'sqlite' as const,
        cacheSizeMB: 100,
        syncInterval: 60000, // 1 minute
        conflictResolution: 'last-write' as const,
        retentionDays: 30,
        sqlitePath: '.claude-flow/memory.db'
      };
      
      // Initialize with 8 second timeout
      await initializeGlobalServices(eventBus, logger, memoryConfig, 8000);
      
      const initTime = Date.now() - startTime;
      console.log(`✅ Backend services initialized (${initTime}ms)`);

    } catch (error) {
      const initTime = Date.now() - startTime;
      console.error(`❌ Service initialization failed after ${initTime}ms:`, error instanceof Error ? error.message : error);
      
      // Continue with degraded functionality
      console.log('⚠️  Continuing with limited functionality...');
    }
    
    await app.run();

  } catch (error) {
    console.error('❌ Failed to start CLI:', error);
    
    // Only shutdown if services were initialized
    if (isServicesInitialized()) {
      await shutdownGlobalServices();
    }
    
    process.exit(1);
  }
}

main().catch(console.error); 
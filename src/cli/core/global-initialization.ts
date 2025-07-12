/**
 * Global Initialization System
 * Ensures all backend services are properly initialized when CLI starts
 * Fixes Critical Gap #2: Database Connectivity
 */

import { PersistenceManager } from '../../core/persistence.ts';
import { IEventBus } from '../../core/event-bus.ts';
import { ILogger } from '../../core/logger.ts';
import { ConfigManager } from '../../core/config.ts';
import { printInfo, printError, printSuccess } from './output-formatter.ts';
import { MemoryVault } from '../../memory/memory-vault.ts';
import { MemoryConfig } from '../../utils/types.ts';
import { MemoryManager } from '../../memory/manager.ts';

// Global singleton instances
let globalPersistenceManager: PersistenceManager | null = null;
let globalEventBus: IEventBus | null = null;
let globalLogger: ILogger | null = null;
let globalConfig: GlobalConfig | null = null;
let isInitialized = false;
let initializationPromise: Promise<GlobalServices> | null = null;

export interface GlobalConfig {
  eventBus: IEventBus;
  logger: ILogger;
  memory: MemoryVault;
}

export interface GlobalServices {
  persistence: PersistenceManager;
  eventBus: IEventBus;
  logger: ILogger;
  config: GlobalConfig;
}

/**
 * Initialize all global backend services with timeout and error handling
 * This is called once when CLI starts
 */
export async function initializeGlobalServices(
  eventBus: IEventBus,
  logger: ILogger,
  memoryConfig: MemoryConfig,
  timeoutMs: number = 10000
): Promise<GlobalServices> {
  // Return existing services if already initialized
  if (isInitialized && globalPersistenceManager && globalEventBus && globalLogger && globalConfig) {
    return {
      persistence: globalPersistenceManager,
      eventBus: globalEventBus,
      logger: globalLogger,
      config: globalConfig
    };
  }

  // Return existing initialization promise if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Create new initialization promise with timeout
  initializationPromise = Promise.race([
    initializeServicesInternal(eventBus, logger, memoryConfig),
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Service initialization timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);

  try {
    const result = await initializationPromise;
    return result;
  } catch (error) {
    // Reset initialization promise on failure
    initializationPromise = null;
    throw error;
  }
}

/**
 * Internal service initialization logic
 */
async function initializeServicesInternal(
  eventBus: IEventBus,
  logger: ILogger,
  memoryConfig: MemoryConfig
): Promise<GlobalServices> {
  try {
    logger.info('Starting global services initialization');

    // Initialize core services first
    globalLogger = logger;
    globalEventBus = eventBus;

    // Initialize configuration with memory system
    globalConfig = {
      eventBus: globalEventBus,
      logger: globalLogger,
      memory: new MemoryVault(
        memoryConfig,
        globalEventBus,
        globalLogger
      )
    };

    // Initialize persistence manager with timeout
    logger.info('Initializing persistence manager');
    globalPersistenceManager = new PersistenceManager('.claude-flow');
    await Promise.race([
      globalPersistenceManager.initialize(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('PersistenceManager initialization timeout')), 5000)
      )
    ]);

    // Initialize memory system with timeout
    logger.info('Initializing memory system');
    await Promise.race([
      globalConfig.memory.initialize(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('MemoryVault initialization timeout')), 5000)
      )
    ]);

    isInitialized = true;
    logger.info('Global services initialized successfully');

    return {
      persistence: globalPersistenceManager,
      eventBus: globalEventBus,
      logger: globalLogger,
      config: globalConfig
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to initialize global services', error);
    printError(`❌ Failed to initialize backend services: ${errorMessage}`);
    
    // Reset state on failure
    isInitialized = false;
    globalPersistenceManager = null;
    globalConfig = null;
    
    throw error;
  }
}

/**
 * Get global services (lazy initialization)
 */
export async function getGlobalServices(): Promise<GlobalServices> {
  if (isInitialized && globalPersistenceManager && globalEventBus && globalLogger && globalConfig) {
    return {
      persistence: globalPersistenceManager,
      eventBus: globalEventBus,
      logger: globalLogger,
      config: globalConfig
    };
  }

  // If not initialized, throw error instead of trying to initialize
  // This prevents circular dependencies and forces explicit initialization
  throw new Error('Global services not initialized. Call initializeGlobalServices() first.');
}

/**
 * Get individual service instances with lazy initialization fallback
 */
export async function getPersistenceManager(): Promise<PersistenceManager> {
  if (globalPersistenceManager) {
    return globalPersistenceManager;
  }
  throw new Error('PersistenceManager not initialized. Call initializeGlobalServices() first.');
}

export async function getMemoryManager(): Promise<MemoryVault> {
  if (globalConfig?.memory) {
    return globalConfig.memory;
  }
  throw new Error('MemoryManager not initialized. Call initializeGlobalServices() first.');
}

export async function getLogger(): Promise<ILogger> {
  if (globalLogger) {
    return globalLogger;
  }
  throw new Error('Logger not initialized. Call initializeGlobalServices() first.');
}

export async function getConfigManager(): Promise<GlobalConfig> {
  if (globalConfig) {
    return globalConfig;
  }
  throw new Error('Config not initialized. Call initializeGlobalServices() first.');
}

/**
 * Shutdown all global services gracefully
 */
export async function shutdownGlobalServices(): Promise<void> {
  try {
    if (globalLogger) {
      globalLogger.info('Starting global services shutdown');
    }

    // Shutdown services in reverse order
    if (globalConfig?.memory) {
      try {
        await globalConfig.memory.shutdown();
      } catch (error) {
        console.warn('Error shutting down memory system:', error);
      }
    }

    if (globalPersistenceManager) {
      try {
        await globalPersistenceManager.close();
      } catch (error) {
        console.warn('Error shutting down persistence manager:', error);
      }
    }

    if (globalLogger) {
      globalLogger.info('Global services shutdown completed');
    }

    // Reset globals
    globalPersistenceManager = null;
    globalEventBus = null;
    globalLogger = null;
    globalConfig = null;
    isInitialized = false;
    initializationPromise = null;

  } catch (error) {
    printError(`Failed to shutdown services: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Health check for all services
 */
export async function checkServicesHealth(): Promise<{
  persistence: boolean;
  memory: boolean;
  logger: boolean;
  config: boolean;
  overall: boolean;
}> {
  try {
    const health = {
      persistence: !!(globalPersistenceManager?.db),
      memory: !!(globalConfig?.memory),
      logger: !!globalLogger,
      config: !!globalConfig,
      overall: false
    };

    health.overall = health.persistence && health.memory && health.logger && health.config;
    
    return health;

  } catch (error) {
    return {
      persistence: false,
      memory: false,
      logger: false,
      config: false,
      overall: false
    };
  }
}

/**
 * Force reinitialize all services
 */
export async function reinitializeServices(
  eventBus: IEventBus,
  logger: ILogger,
  memoryConfig: MemoryConfig
): Promise<void> {
  await shutdownGlobalServices();
  await initializeGlobalServices(eventBus, logger, memoryConfig);
}

/**
 * Get initialization status
 */
export function isServicesInitialized(): boolean {
  return isInitialized && !!globalPersistenceManager && !!globalConfig?.memory && !!globalLogger;
}

/**
 * Get global event bus (safe access)
 */
export function getEventBus(): IEventBus {
  if (!globalEventBus) {
    throw new Error('Global event bus not initialized');
  }
  return globalEventBus;
}

/**
 * Get global config (safe access)
 */
export function getGlobalConfig(): GlobalConfig {
  if (!globalConfig) {
    throw new Error('Global config not initialized');
  }
  return globalConfig;
}

/**
 * Lightweight initialization check
 */
export function getInitializationStatus(): {
  initialized: boolean;
  services: {
    persistence: boolean;
    memory: boolean;
    logger: boolean;
    config: boolean;
  }
} {
  return {
    initialized: isInitialized,
    services: {
      persistence: !!globalPersistenceManager,
      memory: !!(globalConfig?.memory),
      logger: !!globalLogger,
      config: !!globalConfig
    }
  };
}

 
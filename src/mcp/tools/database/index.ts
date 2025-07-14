/**
 * Database MCP tools module
 * Provides tools for interacting with databases
 */

import { MCPTool, MCPContext } from "../../../utils/types.ts";
import { ILogger } from "../../../core/logger.ts";
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Define database types we support
type DatabaseType = 'sqlite' | 'mysql' | 'postgresql' | 'mongodb';

export interface DatabaseToolContext extends MCPContext {
  connectionStrings?: Record<string, string>; // Named connection strings
  defaultConnection?: string; // Default connection name
  workingDirectory?: string; // Working directory for relative paths
}

/**
 * Create all Database MCP tools
 */
export function createDatabaseTools(logger: ILogger): MCPTool[] {
  return [
    // Core database operations
    createQueryTool(logger),
    createExecuteTool(logger),
    
    // Schema management
    createSchemaTool(logger),
    
    // Database maintenance
    createBackupTool(logger),
    createRestoreTool(logger),
    
    // Connection management
    createConnectionTool(logger),
  ];
}

/**
 * Executes database queries with results
 */
function createQueryTool(logger: ILogger): MCPTool {
  return {
    name: 'database/query',
    description: 'Execute database queries that return results',
    inputSchema: {
      type: 'object',
      properties: {
        connection: {
          type: 'string',
          description: 'Connection string or connection name',
        },
        type: {
          type: 'string',
          enum: ['sqlite', 'mysql', 'postgresql', 'mongodb'],
          description: 'Database type',
          default: 'sqlite',
        },
        query: {
          type: 'string',
          description: 'SQL query or MongoDB query string',
        },
        params: {
          type: 'array',
          description: 'Query parameters',
        },
        maxRows: {
          type: 'number',
          description: 'Maximum number of rows to return',
          default: 1000,
        },
        filename: {
          type: 'string',
          description: 'SQLite database filename (for sqlite type only)',
        },
      },
      required: ['query'],
    },
    handler: async (input: any, context?: DatabaseToolContext) => {
      logger.info('Executing database query', { 
        type: input.type || 'sqlite', 
        connection: input.connection,
        sessionId: context?.sessionId,
      });
      
      try {
        // Determine connection details
        const connectionInfo = await resolveConnection(input, context);
        const dbType = connectionInfo.type as DatabaseType;
        
        // Execute query based on database type
        switch (dbType) {
          case 'sqlite':
            return await executeSqliteQuery(
              connectionInfo.connection, 
              input.query, 
              logger,
              input.params, 
              input.maxRows || 1000
            );
            
          case 'mysql':
          case 'postgresql':
          case 'mongodb':
            return {
              type: dbType,
              error: `${dbType} support requires appropriate database drivers`,
              suggestion: `For ${dbType} support, install the appropriate database driver package`,
              timestamp: new Date().toISOString(),
            };
            
          default:
            throw new Error(`Unsupported database type: ${dbType}`);
        }
      } catch (error: any) {
        logger.error('Database query failed', { type: input.type, error: error.message });
        throw new Error(`Failed to execute database query: ${error.message}`);
      }
    },
  };
}

/**
 * Executes database commands without returning results
 */
function createExecuteTool(logger: ILogger): MCPTool {
  return {
    name: 'database/execute',
    description: 'Execute database commands that do not return results',
    inputSchema: {
      type: 'object',
      properties: {
        connection: {
          type: 'string',
          description: 'Connection string or connection name',
        },
        type: {
          type: 'string',
          enum: ['sqlite', 'mysql', 'postgresql', 'mongodb'],
          description: 'Database type',
          default: 'sqlite',
        },
        command: {
          type: 'string',
          description: 'SQL command or database operation',
        },
        params: {
          type: 'array',
          description: 'Command parameters',
        },
        filename: {
          type: 'string',
          description: 'SQLite database filename (for sqlite type only)',
        },
      },
      required: ['command'],
    },
    handler: async (input: any, context?: DatabaseToolContext) => {
      logger.info('Executing database command', { 
        type: input.type || 'sqlite', 
        connection: input.connection,
        sessionId: context?.sessionId,
      });
      
      try {
        // Determine connection details
        const connectionInfo = await resolveConnection(input, context);
        const dbType = connectionInfo.type as DatabaseType;
        
        // Execute command based on database type
        switch (dbType) {
          case 'sqlite':
            return await executeSqliteCommand(
              connectionInfo.connection, 
              input.command, 
              logger,
              input.params
            );
            
          case 'mysql':
          case 'postgresql':
          case 'mongodb':
            return {
              type: dbType,
              error: `${dbType} support requires appropriate database drivers`,
              suggestion: `For ${dbType} support, install the appropriate database driver package`,
              timestamp: new Date().toISOString(),
            };
            
          default:
            throw new Error(`Unsupported database type: ${dbType}`);
        }
      } catch (error: any) {
        logger.error('Database command failed', { type: input.type, error: error.message });
        throw new Error(`Failed to execute database command: ${error.message}`);
      }
    },
  };
}

/**
 * Manages database schemas
 */
function createSchemaTool(logger: ILogger): MCPTool {
  return {
    name: 'database/schema',
    description: 'Manage database schemas',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['get', 'create', 'alter', 'drop'],
          description: 'Schema action',
          default: 'get',
        },
        connection: {
          type: 'string',
          description: 'Connection string or connection name',
        },
        type: {
          type: 'string',
          enum: ['sqlite', 'mysql', 'postgresql', 'mongodb'],
          description: 'Database type',
          default: 'sqlite',
        },
        target: {
          type: 'string',
          description: 'Target object (table, collection, etc.)',
        },
        definition: {
          type: 'string',
          description: 'Schema definition (SQL DDL or JSON schema)',
        },
        filename: {
          type: 'string',
          description: 'SQLite database filename (for sqlite type only)',
        },
      },
      required: ['action'],
    },
    handler: async (input: any, context?: DatabaseToolContext) => {
      logger.info('Managing database schema', { 
        action: input.action || 'get', 
        type: input.type || 'sqlite',
        target: input.target,
        sessionId: context?.sessionId,
      });
      
      try {
        // Determine connection details
        const connectionInfo = await resolveConnection(input, context);
        const dbType = connectionInfo.type as DatabaseType;
        
        // Execute schema operation based on database type
        switch (dbType) {
          case 'sqlite':
            return await manageSqliteSchema(
              connectionInfo.connection, 
              input.action || 'get',
              logger,
              input.target,
              input.definition
            );
            
          case 'mysql':
          case 'postgresql':
          case 'mongodb':
            return {
              type: dbType,
              action: input.action || 'get',
              target: input.target,
              error: `${dbType} schema management requires appropriate database drivers`,
              suggestion: `For ${dbType} schema management, install the appropriate database driver package`,
              timestamp: new Date().toISOString(),
            };
            
          default:
            throw new Error(`Unsupported database type: ${dbType}`);
        }
      } catch (error: any) {
        logger.error('Database schema operation failed', { 
          action: input.action, 
          type: input.type, 
          error: error.message 
        });
        throw new Error(`Failed to perform schema operation: ${error.message}`);
      }
    },
  };
}

/**
 * Performs database backups
 */
function createBackupTool(logger: ILogger): MCPTool {
  return {
    name: 'database/backup',
    description: 'Create database backups',
    inputSchema: {
      type: 'object',
      properties: {
        connection: {
          type: 'string',
          description: 'Connection string or connection name',
        },
        type: {
          type: 'string',
          enum: ['sqlite', 'mysql', 'postgresql', 'mongodb'],
          description: 'Database type',
          default: 'sqlite',
        },
        destination: {
          type: 'string',
          description: 'Backup destination path',
        },
        compress: {
          type: 'boolean',
          description: 'Compress the backup',
          default: true,
        },
        filename: {
          type: 'string',
          description: 'SQLite database filename (for sqlite type only)',
        },
      },
      required: ['destination'],
    },
    handler: async (input: any, context?: DatabaseToolContext) => {
      logger.info('Creating database backup', { 
        type: input.type || 'sqlite', 
        destination: input.destination,
        sessionId: context?.sessionId,
      });
      
      try {
        // Determine connection details
        const connectionInfo = await resolveConnection(input, context);
        const dbType = connectionInfo.type as DatabaseType;
        
        // Resolve destination path
        const resolvedDest = context?.workingDirectory ? 
          join(context.workingDirectory, input.destination) : input.destination;
        
        // Create parent directories if needed
        await fs.mkdir(dirname(resolvedDest), { recursive: true });
        
        // Execute backup based on database type
        switch (dbType) {
          case 'sqlite':
            return await backupSqliteDatabase(
              connectionInfo.connection,
              resolvedDest,
              input.compress === true,
              logger
            );
            
          case 'mysql':
          case 'postgresql':
          case 'mongodb':
            return {
              type: dbType,
              destination: input.destination,
              error: `${dbType} backups require appropriate database tools`,
              suggestion: `For ${dbType} backups, install ${dbType === 'mysql' ? 'mysqldump' : dbType === 'postgresql' ? 'pg_dump' : 'mongodump'}`,
              timestamp: new Date().toISOString(),
            };
            
          default:
            throw new Error(`Unsupported database type: ${dbType}`);
        }
      } catch (error: any) {
        logger.error('Database backup failed', { 
          type: input.type, 
          destination: input.destination, 
          error: error.message 
        });
        throw new Error(`Failed to create database backup: ${error.message}`);
      }
    },
  };
}

/**
 * Restores database from backups
 */
function createRestoreTool(logger: ILogger): MCPTool {
  return {
    name: 'database/restore',
    description: 'Restore database from a backup',
    inputSchema: {
      type: 'object',
      properties: {
        connection: {
          type: 'string',
          description: 'Connection string or connection name',
        },
        type: {
          type: 'string',
          enum: ['sqlite', 'mysql', 'postgresql', 'mongodb'],
          description: 'Database type',
          default: 'sqlite',
        },
        source: {
          type: 'string',
          description: 'Backup source path',
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite existing database',
          default: false,
        },
        filename: {
          type: 'string',
          description: 'SQLite database filename (for sqlite type only)',
        },
      },
      required: ['source'],
    },
    handler: async (input: any, context?: DatabaseToolContext) => {
      logger.info('Restoring database', { 
        type: input.type || 'sqlite', 
        source: input.source,
        sessionId: context?.sessionId,
      });
      
      try {
        // Determine connection details
        const connectionInfo = await resolveConnection(input, context);
        const dbType = connectionInfo.type as DatabaseType;
        
        // Resolve source path
        const resolvedSource = context?.workingDirectory ? 
          join(context.workingDirectory, input.source) : input.source;
        
        // Check if source exists
        await fs.access(resolvedSource);
        
        // Execute restore based on database type
        switch (dbType) {
          case 'sqlite':
            return await restoreSqliteDatabase(
              connectionInfo.connection,
              resolvedSource,
              input.overwrite === true,
              logger
            );
            
          case 'mysql':
          case 'postgresql':
          case 'mongodb':
            return {
              type: dbType,
              source: input.source,
              error: `${dbType} restore requires appropriate database tools`,
              suggestion: `For ${dbType} restore, install ${dbType === 'mysql' ? 'mysql client' : dbType === 'postgresql' ? 'pg_restore' : 'mongorestore'}`,
              timestamp: new Date().toISOString(),
            };
            
          default:
            throw new Error(`Unsupported database type: ${dbType}`);
        }
      } catch (error: any) {
        logger.error('Database restore failed', { 
          type: input.type, 
          source: input.source, 
          error: error.message 
        });
        throw new Error(`Failed to restore database: ${error.message}`);
      }
    },
  };
}

/**
 * Manages database connections
 */
function createConnectionTool(logger: ILogger): MCPTool {
  return {
    name: 'database/connection',
    description: 'Manage database connections',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['test', 'create', 'list', 'remove'],
          description: 'Connection action',
          default: 'test',
        },
        name: {
          type: 'string',
          description: 'Connection name',
        },
        type: {
          type: 'string',
          enum: ['sqlite', 'mysql', 'postgresql', 'mongodb'],
          description: 'Database type',
          default: 'sqlite',
        },
        connectionString: {
          type: 'string',
          description: 'Connection string',
        },
        filename: {
          type: 'string',
          description: 'SQLite database filename (for sqlite type only)',
        },
      },
      required: ['action'],
    },
    handler: async (input: any, context?: DatabaseToolContext) => {
      logger.info('Managing database connection', { 
        action: input.action || 'test', 
        type: input.type || 'sqlite',
        name: input.name,
        sessionId: context?.sessionId,
      });
      
      try {
        // Handle action based on database type
        const dbType = input.type || 'sqlite';
        
        switch (dbType) {
          case 'sqlite':
            return await manageSqliteConnection(
              input.action || 'test',
              input.name,
              input.filename || input.connectionString,
              context,
              logger
            );
            
          case 'mysql':
          case 'postgresql':
          case 'mongodb':
            return {
              type: dbType,
              action: input.action || 'test',
              name: input.name,
              error: `${dbType} connection management requires appropriate database drivers`,
              suggestion: `For ${dbType} connection management, install the appropriate database driver package`,
              timestamp: new Date().toISOString(),
            };
            
          default:
            throw new Error(`Unsupported database type: ${dbType}`);
        }
      } catch (error: any) {
        logger.error('Database connection operation failed', { 
          action: input.action, 
          type: input.type, 
          name: input.name, 
          error: error.message 
        });
        throw new Error(`Failed to perform connection operation: ${error.message}`);
      }
    },
  };
}

//
// Helper functions for database operations
//

/**
 * Resolves connection details from input and context
 */
async function resolveConnection(input: any, context?: DatabaseToolContext): Promise<{ 
  type: string; 
  connection: string;
}> {
  // Determine database type
  const dbType = input.type || 'sqlite';
  
  // Handle connection string
  let connection = input.connection;
  
  // If connection is a name, look it up in context
  if (connection && context?.connectionStrings && context.connectionStrings[connection]) {
    connection = context.connectionStrings[connection];
  } 
  // If no connection but there's a default, use it
  else if (!connection && context?.defaultConnection && context.connectionStrings) {
    connection = context.connectionStrings[context.defaultConnection];
  }
  
  // For SQLite, handle filename
  if (dbType === 'sqlite') {
    // If connection is not specified but filename is, use filename
    if (!connection && input.filename) {
      connection = input.filename;
    }
    
    // If neither is specified, use in-memory database
    if (!connection) {
      connection = ':memory:';
    }
    
    // Resolve path if not in-memory and working directory is provided
    if (connection !== ':memory:' && context?.workingDirectory) {
      connection = join(context.workingDirectory, connection);
    }
  }
  
  return { type: dbType, connection };
}

/**
 * Execute a query on SQLite database
 */
async function executeSqliteQuery(
  dbPath: string, 
  query: string, 
  logger: ILogger,
  params?: any[], 
  maxRows: number = 1000
): Promise<any> {
  try {
    // Use sqlite3 command-line interface for simplicity
    const isInMemory = dbPath === ':memory:';
    const dbPathArg = isInMemory ? '' : `"${dbPath}"`;
    
    // Ensure query is properly quoted
    const quotedQuery = query.replace(/"/g, '\\"');
    
    // Create command with limit if needed
    const limitedQuery = maxRows > 0 ? `${quotedQuery} LIMIT ${maxRows}` : quotedQuery;
    
    // Build command to execute query and format output as JSON
    const cmd = `sqlite3 ${dbPathArg} -json "${limitedQuery}"`;
    
    // Execute command
    const { stdout, stderr } = await execAsync(cmd);
    
    if (stderr) {
      logger.warn('SQLite query produced warnings', { warnings: stderr });
    }
    
    // Handle undefined or empty stdout
    const outputStr = stdout?.trim() || '';
    
    // Parse results
    let results: any[];
    try {
      results = outputStr ? JSON.parse(outputStr) : [];
    } catch (e) {
      results = outputStr ? [{ result: outputStr }] : [];
    }
    
    return {
      query,
      params,
      results,
      count: results.length,
      maxRows,
      truncated: results.length >= maxRows,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('SQLite query failed', { query, error: error.message });
    throw new Error(`SQLite query failed: ${error.message}`);
  }
}

/**
 * Execute a command on SQLite database
 */
async function executeSqliteCommand(
  dbPath: string, 
  command: string, 
  logger: ILogger,
  params?: any[]
): Promise<any> {
  try {
    // Use sqlite3 command-line interface for simplicity
    const isInMemory = dbPath === ':memory:';
    const dbPathArg = isInMemory ? '' : `"${dbPath}"`;
    
    // Ensure command is properly quoted
    const quotedCommand = command.replace(/"/g, '\\"');
    
    // Build command
    const cmd = `sqlite3 ${dbPathArg} "${quotedCommand}"`;
    
    // Execute command
    const { stdout, stderr } = await execAsync(cmd);
    
    if (stderr) {
      logger.warn('SQLite command produced warnings', { warnings: stderr });
    }
    
    return {
      command,
      params,
      changes: 1, // Simple approximation
      message: stdout.trim() || 'Command executed successfully',
      warnings: stderr ? stderr.trim() : undefined,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('SQLite command failed', { command, error: error.message });
    throw new Error(`SQLite command failed: ${error.message}`);
  }
}

/**
 * Manage SQLite schema
 */
async function manageSqliteSchema(
  dbPath: string,
  action: string,
  logger: ILogger,
  target?: string,
  definition?: string
): Promise<any> {
  try {
    // Handle different actions
    switch (action) {
      case 'get':
        // Get schema for target table or all tables
        const schemaQuery = target 
          ? `PRAGMA table_info("${target}");`
          : `SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;`;
        
        return await executeSqliteQuery(dbPath, schemaQuery, logger, undefined, 0);
        
      case 'create':
        // Create table
        if (!target || !definition) {
          throw new Error('Table name and definition required for create action');
        }
        
        return await executeSqliteCommand(dbPath, definition, logger, undefined);
        
      case 'alter':
        // SQLite has limited ALTER TABLE support
        if (!target || !definition) {
          throw new Error('Table name and definition required for alter action');
        }
        
        return await executeSqliteCommand(dbPath, definition, logger, undefined);
        
      case 'drop':
        // Drop table
        if (!target) {
          throw new Error('Table name required for drop action');
        }
        
        return await executeSqliteCommand(dbPath, `DROP TABLE IF EXISTS "${target}";`, logger, undefined);
        
      default:
        throw new Error(`Unsupported schema action: ${action}`);
    }
  } catch (error: any) {
    logger.error('SQLite schema operation failed', { action, target, error: error.message });
    throw new Error(`SQLite schema operation failed: ${error.message}`);
  }
}

/**
 * Backup SQLite database
 */
async function backupSqliteDatabase(
  dbPath: string,
  destination: string,
  compress: boolean,
  logger: ILogger
): Promise<any> {
  try {
    // For in-memory databases, first dump to file
    const isInMemory = dbPath === ':memory:';
    
    if (isInMemory) {
      throw new Error('Cannot backup in-memory SQLite database');
    }
    
    // Check if database file exists
    await fs.access(dbPath);
    
    // Create parent directories if needed
    await fs.mkdir(dirname(destination), { recursive: true });
    
    // Execute backup
    if (compress) {
      // Backup with compression
      const cmd = `sqlite3 "${dbPath}" .dump | gzip > "${destination}"`;
      await execAsync(cmd);
    } else {
      // Simple file copy for backup
      await fs.copyFile(dbPath, destination);
    }
    
    // Get file stats
    const stats = await fs.stat(destination);
    
    return {
      source: dbPath,
      destination,
      size: stats.size,
      compressed: compress,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('SQLite backup failed', { dbPath, destination, error: error.message });
    throw new Error(`SQLite backup failed: ${error.message}`);
  }
}

/**
 * Restore SQLite database
 */
async function restoreSqliteDatabase(
  dbPath: string,
  source: string,
  overwrite: boolean,
  logger: ILogger
): Promise<any> {
  try {
    // For in-memory databases, first dump to file
    const isInMemory = dbPath === ':memory:';
    
    if (isInMemory) {
      throw new Error('Cannot restore to in-memory SQLite database');
    }
    
    // Check if source file exists
    await fs.access(source);
    
    // Check if database file exists
    let dbExists = false;
    try {
      await fs.access(dbPath);
      dbExists = true;
    } catch (error) {
      // Database doesn't exist, which is fine
    }
    
    // Handle overwrite
    if (dbExists && !overwrite) {
      throw new Error(`Database ${dbPath} already exists and overwrite is not enabled`);
    }
    
    // Execute restore based on file type
    if (source.endsWith('.gz')) {
      // Restore from compressed dump
      const cmd = `gunzip -c "${source}" | sqlite3 "${dbPath}"`;
      await execAsync(cmd);
    } else {
      // Remove existing database if it exists
      if (dbExists) {
        await fs.unlink(dbPath);
      }
      
      // Create parent directories if needed
      await fs.mkdir(dirname(dbPath), { recursive: true });
      
      // Simple file copy for restore
      await fs.copyFile(source, dbPath);
    }
    
    return {
      source,
      destination: dbPath,
      overwrite: dbExists,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('SQLite restore failed', { dbPath, source, error: error.message });
    throw new Error(`SQLite restore failed: ${error.message}`);
  }
}

/**
 * Manage SQLite connection
 */
async function manageSqliteConnection(
  action: string,
  name: string | undefined,
  filename: string | undefined,
  context: DatabaseToolContext | undefined,
  logger: ILogger
): Promise<any> {
  try {
    switch (action) {
      case 'test':
        // Test connection
        if (!filename) {
          throw new Error('Filename required for test action');
        }
        
        // For in-memory database, always succeeds
        if (filename === ':memory:') {
          return {
            action: 'test',
            connection: filename,
            success: true,
            timestamp: new Date().toISOString(),
          };
        }
        
        // Check if file exists and is a valid SQLite database
        try {
          // Try to access file
          await fs.access(filename);
          
          // Check if it's a valid SQLite database
          const { stdout } = await execAsync(`sqlite3 "${filename}" "SELECT 1;"`);
          
          return {
            action: 'test',
            connection: filename,
            success: true,
            timestamp: new Date().toISOString(),
          };
        } catch (error: any) {
          return {
            action: 'test',
            connection: filename,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
        
      case 'list':
        // List connections
        if (!context?.connectionStrings) {
          return {
            action: 'list',
            connections: [],
            default: context?.defaultConnection,
            timestamp: new Date().toISOString(),
          };
        }
        
        const connections = Object.entries(context.connectionStrings).map(([key, value]) => ({
          name: key,
          connection: value,
          isDefault: key === context.defaultConnection,
        }));
        
        return {
          action: 'list',
          connections,
          default: context.defaultConnection,
          timestamp: new Date().toISOString(),
        };
        
      case 'create':
      case 'remove':
        // These operations would modify the context, which is beyond our scope in this minimal implementation
        return {
          action,
          name,
          connection: filename,
          error: 'Connection management not supported in this implementation',
          timestamp: new Date().toISOString(),
        };
        
      default:
        throw new Error(`Unsupported connection action: ${action}`);
    }
  } catch (error: any) {
    logger.error('SQLite connection operation failed', { action, name, filename, error: error.message });
    throw new Error(`SQLite connection operation failed: ${error.message}`);
  }
} 
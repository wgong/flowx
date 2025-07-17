/**
 * Cross-Session Todo Persistence System
 * SQLite backend that ensures todos survive restarts, maintains history,
 * supports undo/redo, and syncs across multiple Claude Code instances
 */

import { EventEmitter } from 'node:events';
import { Logger } from '../core/logger.js';
import { TodoItem } from './coordination.js';
import { TodoSyncService } from './todo-sync-service.js';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

export interface TodoHistoryEntry {
  historyId: string;
  todoId: string;
  operation: 'create' | 'update' | 'delete' | 'status_change' | 'priority_change' | 'assignment';
  previousState: Partial<TodoItem> | null;
  newState: Partial<TodoItem>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  metadata: {
    source: 'user' | 'system' | 'sync' | 'ai_suggestion';
    reason?: string;
    batchId?: string;
    undoable: boolean;
  };
}

export interface TodoSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  instanceId: string;
  userId?: string;
  todosCreated: number;
  todosCompleted: number;
  todosModified: number;
  sessionMetrics: {
    productivityScore: number;
    focusTime: number;
    interruptionCount: number;
    avgCompletionTime: number;
  };
  isActive: boolean;
}

export interface TodoSyncConflict {
  conflictId: string;
  todoId: string;
  localState: TodoItem;
  remoteState: TodoItem;
  conflictType: 'concurrent_edit' | 'delete_vs_edit' | 'priority_conflict' | 'assignment_conflict';
  detectedAt: Date;
  resolution?: 'auto_merge' | 'user_choice' | 'remote_wins' | 'local_wins';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface PersistenceConfig {
  dbPath: string;
  enableHistory: boolean;
  enableUndo: boolean;
  maxHistoryEntries: number;
  syncInterval: number;
  enableMultiInstance: boolean;
  enableConflictResolution: boolean;
  backupInterval: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export interface UndoRedoOperation {
  operationId: string;
  todoId: string;
  operationType: 'undo' | 'redo';
  targetHistoryId: string;
  canExecute: boolean;
  previewState: Partial<TodoItem>;
  dependentOperations: string[];
}

export class CrossSessionTodoPersistence extends EventEmitter {
  private logger: Logger;
  private todoSyncService: TodoSyncService;
  private db: any; // SQLite database instance
  private SQL: any; // sql.js instance
  
  private currentSession: TodoSession;
  private activeConnections = new Map<string, any>();
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private conflictQueue = new Map<string, TodoSyncConflict>();
  private syncTimer?: NodeJS.Timeout;
  private backupTimer?: NodeJS.Timeout;
  
  private config: PersistenceConfig;
  private isInitialized = false;
  private lastSyncTime = new Date();

  constructor(
    todoSyncService: TodoSyncService,
    config: Partial<PersistenceConfig> = {}
  ) {
    super();
    
    this.todoSyncService = todoSyncService;
    this.logger = new Logger('CrossSessionTodoPersistence');
    
    this.config = {
      dbPath: './data/todos.db',
      enableHistory: true,
      enableUndo: true,
      maxHistoryEntries: 10000,
      syncInterval: 5000, // 5 seconds
      enableMultiInstance: true,
      enableConflictResolution: true,
      backupInterval: 300000, // 5 minutes
      compressionEnabled: true,
      encryptionEnabled: false,
      ...config
    };
    
    this.currentSession = this.createNewSession();
    
    this.initializePersistence();
  }

  /**
   * Initialize the persistence system
   */
  private async initializePersistence(): Promise<void> {
    try {
      // Initialize SQLite database
      await this.initializeDatabase();
      
      // Set up database schema
      await this.createDatabaseSchema();
      
      // Load existing session state
      await this.loadSessionState();
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Start sync and backup timers
      this.startPeriodicOperations();
      
      // Register this instance
      await this.registerInstance();
      
      this.isInitialized = true;
      this.logger.info('Cross-session todo persistence initialized');
      
      this.emit('persistence:initialized', {
        sessionId: this.currentSession.sessionId,
        dbPath: this.config.dbPath
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize persistence system', error);
      throw error;
    }
  }

  /**
   * Initialize SQLite database
   */
  private async initializeDatabase(): Promise<void> {
    try {
      // Dynamic import for sql.js (since it's a large dependency)
      const initSqlJs = await import('sql.js');
      this.SQL = await initSqlJs.default();
      
      // Ensure database directory exists
      const dbDir = join(this.config.dbPath, '..');
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }
      
      // Load or create database
      if (existsSync(this.config.dbPath)) {
        const fs = await import('node:fs/promises');
        const data = await fs.readFile(this.config.dbPath);
        this.db = new this.SQL.Database(data);
        this.logger.info('Loaded existing todo database');
      } else {
        this.db = new this.SQL.Database();
        this.logger.info('Created new todo database');
      }
      
    } catch (error) {
      this.logger.error('Failed to initialize database', error);
      // Fallback to in-memory database
      this.db = new this.SQL.Database();
      this.logger.warn('Using in-memory database as fallback');
    }
  }

  /**
   * Create database schema
   */
  private async createDatabaseSchema(): Promise<void> {
    const schemas = [
      // Todos table
      `CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
        dependencies TEXT, -- JSON array
        assigned_agent TEXT,
        tags TEXT, -- JSON array
        estimated_time TEXT,
        batch_optimized INTEGER DEFAULT 0,
        parallel_execution INTEGER DEFAULT 0,
        memory_key TEXT,
        metadata TEXT, -- JSON object
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        is_deleted INTEGER DEFAULT 0
      )`,
      
      // Todo history table
      `CREATE TABLE IF NOT EXISTS todo_history (
        history_id TEXT PRIMARY KEY,
        todo_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        previous_state TEXT, -- JSON
        new_state TEXT NOT NULL, -- JSON
        timestamp INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        user_id TEXT,
        source TEXT NOT NULL,
        reason TEXT,
        batch_id TEXT,
        undoable INTEGER DEFAULT 1,
        FOREIGN KEY (todo_id) REFERENCES todos(id)
      )`,
      
      // Sessions table
      `CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        instance_id TEXT NOT NULL,
        user_id TEXT,
        todos_created INTEGER DEFAULT 0,
        todos_completed INTEGER DEFAULT 0,
        todos_modified INTEGER DEFAULT 0,
        productivity_score REAL DEFAULT 0,
        focus_time INTEGER DEFAULT 0,
        interruption_count INTEGER DEFAULT 0,
        avg_completion_time REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        last_heartbeat INTEGER
      )`,
      
      // Sync conflicts table
      `CREATE TABLE IF NOT EXISTS sync_conflicts (
        conflict_id TEXT PRIMARY KEY,
        todo_id TEXT NOT NULL,
        local_state TEXT NOT NULL, -- JSON
        remote_state TEXT NOT NULL, -- JSON
        conflict_type TEXT NOT NULL,
        detected_at INTEGER NOT NULL,
        resolution TEXT,
        resolved_at INTEGER,
        resolved_by TEXT,
        FOREIGN KEY (todo_id) REFERENCES todos(id)
      )`,
      
      // Instance registry table
      `CREATE TABLE IF NOT EXISTS instances (
        instance_id TEXT PRIMARY KEY,
        hostname TEXT,
        process_id INTEGER,
        start_time INTEGER NOT NULL,
        last_heartbeat INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        capabilities TEXT -- JSON array
      )`
    ];
    
    for (const schema of schemas) {
      this.db.run(schema);
    }
    
    // Create indices for better performance
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)',
      'CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority)',
      'CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_todos_session ON todos(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_history_todo_id ON todo_history(todo_id)',
      'CREATE INDEX IF NOT EXISTS idx_history_timestamp ON todo_history(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_conflicts_todo_id ON sync_conflicts(todo_id)',
      'CREATE INDEX IF NOT EXISTS idx_instances_active ON instances(is_active)'
    ];
    
    for (const index of indices) {
      this.db.run(index);
    }
    
    await this.saveDatabase();
    this.logger.info('Database schema created/verified');
  }

  /**
   * Set up event handlers for persistence
   */
  private setupEventHandlers(): void {
    // Listen to todo sync service events
    this.todoSyncService.on('todo:created-from-task', this.handleTodoCreated.bind(this));
    this.todoSyncService.on('task:created-from-todo', this.handleTaskCreated.bind(this));
    this.todoSyncService.on('status:synchronized', this.handleStatusChange.bind(this));
    
    // Listen to our own events
    this.on('todo:persisted', this.updateSessionMetrics.bind(this));
    this.on('conflict:detected', this.handleSyncConflict.bind(this));
    this.on('instance:heartbeat', this.updateInstanceHeartbeat.bind(this));
    
    this.logger.info('Persistence event handlers initialized');
  }

  /**
   * Persist a todo item
   */
  public async persistTodo(todo: TodoItem, operation: TodoHistoryEntry['operation'] = 'create'): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initializePersistence();
      }
      
      // Get previous state for history
      const previousState = await this.getTodoById(todo.id);
      
      // Insert or update todo
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO todos (
          id, content, status, priority, dependencies, assigned_agent, tags,
          estimated_time, batch_optimized, parallel_execution, memory_key,
          metadata, created_at, updated_at, session_id, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const version = previousState ? 2 : 1; // Simple versioning
      
      stmt.run([
        todo.id,
        todo.content,
        todo.status,
        todo.priority,
        JSON.stringify(todo.dependencies || []),
        todo.assignedAgent || null,
        JSON.stringify(todo.tags || []),
        todo.estimatedTime || null,
        todo.batchOptimized ? 1 : 0,
        todo.parallelExecution ? 1 : 0,
        todo.memoryKey || null,
        JSON.stringify(todo.metadata || {}),
        (todo.createdAt || new Date()).getTime(),
        (todo.updatedAt || new Date()).getTime(),
        this.currentSession.sessionId,
        version
      ]);
      
      stmt.free();
      
      // Record history entry
      if (this.config.enableHistory) {
        await this.recordHistoryEntry({
          historyId: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          todoId: todo.id,
          operation,
          previousState,
          newState: todo,
          timestamp: new Date(),
          sessionId: this.currentSession.sessionId,
          metadata: {
            source: 'user',
            undoable: true
          }
        });
      }
      
      // Update undo stack
      if (this.config.enableUndo && operation !== 'create') {
        this.addToUndoStack(todo.id);
      }
      
      await this.saveDatabase();
      
      this.emit('todo:persisted', {
        todo,
        operation,
        sessionId: this.currentSession.sessionId
      });
      
      this.logger.debug(`Todo ${todo.id} persisted with operation: ${operation}`);
      
    } catch (error) {
      this.logger.error('Failed to persist todo', error);
      throw error;
    }
  }

  /**
   * Retrieve a todo by ID
   */
  public async getTodoById(todoId: string): Promise<TodoItem | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM todos WHERE id = ? AND is_deleted = 0');
      stmt.bind([todoId]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return this.rowToTodoItem(row);
      }
      
      stmt.free();
      return null;
      
    } catch (error) {
      this.logger.error(`Failed to get todo ${todoId}`, error);
      return null;
    }
  }

  /**
   * Get all todos with optional filtering
   */
  public async getAllTodos(filters: {
    status?: string;
    priority?: string;
    sessionId?: string;
    includeDeleted?: boolean;
  } = {}): Promise<TodoItem[]> {
    try {
      let query = 'SELECT * FROM todos WHERE 1=1';
      const params: any[] = [];
      
      if (!filters.includeDeleted) {
        query += ' AND is_deleted = 0';
      }
      
      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }
      
      if (filters.priority) {
        query += ' AND priority = ?';
        params.push(filters.priority);
      }
      
      if (filters.sessionId) {
        query += ' AND session_id = ?';
        params.push(filters.sessionId);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const stmt = this.db.prepare(query);
      if (params.length > 0) {
        stmt.bind(params);
      }
      
      const todos: TodoItem[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        todos.push(this.rowToTodoItem(row));
      }
      
      stmt.free();
      return todos;
      
    } catch (error) {
      this.logger.error('Failed to get todos', error);
      return [];
    }
  }

  /**
   * Delete a todo (soft delete)
   */
  public async deleteTodo(todoId: string, hard: boolean = false): Promise<void> {
    try {
      if (hard) {
        // Hard delete - completely remove from database
        const stmt = this.db.prepare('DELETE FROM todos WHERE id = ?');
        stmt.run([todoId]);
        stmt.free();
      } else {
        // Soft delete - mark as deleted
        const stmt = this.db.prepare('UPDATE todos SET is_deleted = 1, updated_at = ? WHERE id = ?');
        stmt.run([Date.now(), todoId]);
        stmt.free();
      }
      
      // Record history entry
      if (this.config.enableHistory) {
        const previousState = await this.getTodoById(todoId);
        await this.recordHistoryEntry({
          historyId: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          todoId,
          operation: 'delete',
          previousState,
          newState: { id: todoId },
          timestamp: new Date(),
          sessionId: this.currentSession.sessionId,
          metadata: {
            source: 'user',
            undoable: !hard
          }
        });
      }
      
      await this.saveDatabase();
      
      this.emit('todo:deleted', {
        todoId,
        hard,
        sessionId: this.currentSession.sessionId
      });
      
    } catch (error) {
      this.logger.error(`Failed to delete todo ${todoId}`, error);
      throw error;
    }
  }

  /**
   * Get todo history
   */
  public async getTodoHistory(todoId: string, limit: number = 50): Promise<TodoHistoryEntry[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM todo_history 
        WHERE todo_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      stmt.bind([todoId, limit]);
      
      const history: TodoHistoryEntry[] = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        history.push(this.rowToHistoryEntry(row));
      }
      
      stmt.free();
      return history;
      
    } catch (error) {
      this.logger.error(`Failed to get history for todo ${todoId}`, error);
      return [];
    }
  }

  /**
   * Undo last operation
   */
  public async undoLastOperation(): Promise<UndoRedoOperation | null> {
    try {
      if (!this.config.enableUndo || this.undoStack.length === 0) {
        return null;
      }
      
      const lastTodoId = this.undoStack.pop()!;
      const history = await this.getTodoHistory(lastTodoId, 1);
      
      if (history.length === 0 || !history[0].metadata.undoable) {
        return null;
      }
      
      const historyEntry = history[0];
      const operation: UndoRedoOperation = {
        operationId: `undo-${Date.now()}`,
        todoId: lastTodoId,
        operationType: 'undo',
        targetHistoryId: historyEntry.historyId,
        canExecute: true,
        previewState: historyEntry.previousState || {},
        dependentOperations: []
      };
      
      // Restore previous state
      if (historyEntry.previousState) {
        await this.restoreTodoState(lastTodoId, historyEntry.previousState);
        this.redoStack.push(lastTodoId);
        
        this.emit('operation:undone', operation);
        this.logger.info(`Undone operation for todo ${lastTodoId}`);
      }
      
      return operation;
      
    } catch (error) {
      this.logger.error('Failed to undo operation', error);
      return null;
    }
  }

  /**
   * Redo last undone operation
   */
  public async redoLastOperation(): Promise<UndoRedoOperation | null> {
    try {
      if (!this.config.enableUndo || this.redoStack.length === 0) {
        return null;
      }
      
      const lastTodoId = this.redoStack.pop()!;
      const history = await this.getTodoHistory(lastTodoId, 2);
      
      if (history.length < 2) {
        return null;
      }
      
      const redoEntry = history[0]; // Most recent (what we undid)
      const operation: UndoRedoOperation = {
        operationId: `redo-${Date.now()}`,
        todoId: lastTodoId,
        operationType: 'redo',
        targetHistoryId: redoEntry.historyId,
        canExecute: true,
        previewState: redoEntry.newState,
        dependentOperations: []
      };
      
      // Restore the state that was undone
      await this.restoreTodoState(lastTodoId, redoEntry.newState);
      this.undoStack.push(lastTodoId);
      
      this.emit('operation:redone', operation);
      this.logger.info(`Redone operation for todo ${lastTodoId}`);
      
      return operation;
      
    } catch (error) {
      this.logger.error('Failed to redo operation', error);
      return null;
    }
  }

  /**
   * Sync with other instances
   */
  public async syncWithRemoteInstances(): Promise<void> {
    try {
      if (!this.config.enableMultiInstance) {
        return;
      }
      
      const activeInstances = await this.getActiveInstances();
      
      for (const instance of activeInstances) {
        if (instance.instance_id !== this.getInstanceId()) {
          await this.syncWithInstance(instance);
        }
      }
      
      this.lastSyncTime = new Date();
      this.emit('sync:completed', {
        instancesSynced: activeInstances.length - 1,
        syncTime: this.lastSyncTime
      });
      
    } catch (error) {
      this.logger.error('Failed to sync with remote instances', error);
    }
  }

  /**
   * Handle sync conflicts
   */
  public async resolveSyncConflict(
    conflictId: string, 
    resolution: 'auto_merge' | 'user_choice' | 'remote_wins' | 'local_wins',
    userChoice?: Partial<TodoItem>
  ): Promise<void> {
    try {
      const conflict = this.conflictQueue.get(conflictId);
      if (!conflict) {
        throw new Error(`Conflict ${conflictId} not found`);
      }
      
      let resolvedState: TodoItem;
      
      switch (resolution) {
        case 'local_wins':
          resolvedState = conflict.localState;
          break;
        case 'remote_wins':
          resolvedState = conflict.remoteState;
          break;
        case 'auto_merge':
          resolvedState = this.autoMergeStates(conflict.localState, conflict.remoteState);
          break;
        case 'user_choice':
          if (!userChoice) {
            throw new Error('User choice required for manual resolution');
          }
          resolvedState = { ...conflict.localState, ...userChoice };
          break;
        default:
          throw new Error(`Unknown resolution type: ${resolution}`);
      }
      
      // Apply resolved state
      await this.persistTodo(resolvedState, 'update');
      
      // Update conflict record
      const stmt = this.db.prepare(`
        UPDATE sync_conflicts 
        SET resolution = ?, resolved_at = ?, resolved_by = ?
        WHERE conflict_id = ?
      `);
      
      stmt.run([resolution, Date.now(), this.getInstanceId(), conflictId]);
      stmt.free();
      
      // Remove from conflict queue
      this.conflictQueue.delete(conflictId);
      
      await this.saveDatabase();
      
      this.emit('conflict:resolved', {
        conflictId,
        resolution,
        resolvedState
      });
      
      this.logger.info(`Conflict ${conflictId} resolved with strategy: ${resolution}`);
      
    } catch (error) {
      this.logger.error(`Failed to resolve conflict ${conflictId}`, error);
      throw error;
    }
  }

  /**
   * Create database backup
   */
  public async createBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.config.dbPath}.backup.${timestamp}`;
      
      // Export database data
      const data = this.db.export();
      
      const fs = await import('node:fs/promises');
      await fs.writeFile(backupPath, data);
      
      this.logger.info(`Database backup created: ${backupPath}`);
      
      this.emit('backup:created', {
        backupPath,
        timestamp: new Date(),
        size: data.length
      });
      
      return backupPath;
      
    } catch (error) {
      this.logger.error('Failed to create backup', error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      const data = await fs.readFile(backupPath);
      
      // Close current database
      this.db.close();
      
      // Create new database from backup
      this.db = new this.SQL.Database(data);
      
      // Verify schema
      await this.createDatabaseSchema();
      
      this.logger.info(`Database restored from backup: ${backupPath}`);
      
      this.emit('backup:restored', {
        backupPath,
        restoredAt: new Date()
      });
      
    } catch (error) {
      this.logger.error(`Failed to restore from backup ${backupPath}`, error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private createNewSession(): TodoSession {
    return {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      instanceId: this.getInstanceId(),
      todosCreated: 0,
      todosCompleted: 0,
      todosModified: 0,
      sessionMetrics: {
        productivityScore: 0,
        focusTime: 0,
        interruptionCount: 0,
        avgCompletionTime: 0
      },
      isActive: true
    };
  }

  private getInstanceId(): string {
    return `instance-${process.pid}-${Date.now()}`;
  }

  private rowToTodoItem(row: any): TodoItem {
    return {
      id: row.id,
      content: row.content,
      status: row.status,
      priority: row.priority,
      dependencies: JSON.parse(row.dependencies || '[]'),
      assignedAgent: row.assigned_agent,
      tags: JSON.parse(row.tags || '[]'),
      estimatedTime: row.estimated_time,
      batchOptimized: Boolean(row.batch_optimized),
      parallelExecution: Boolean(row.parallel_execution),
      memoryKey: row.memory_key,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private rowToHistoryEntry(row: any): TodoHistoryEntry {
    return {
      historyId: row.history_id,
      todoId: row.todo_id,
      operation: row.operation,
      previousState: row.previous_state ? JSON.parse(row.previous_state) : null,
      newState: JSON.parse(row.new_state),
      timestamp: new Date(row.timestamp),
      sessionId: row.session_id,
      userId: row.user_id,
      metadata: {
        source: row.source,
        reason: row.reason,
        batchId: row.batch_id,
        undoable: Boolean(row.undoable)
      }
    };
  }

  private async recordHistoryEntry(entry: TodoHistoryEntry): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO todo_history (
        history_id, todo_id, operation, previous_state, new_state,
        timestamp, session_id, user_id, source, reason, batch_id, undoable
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      entry.historyId,
      entry.todoId,
      entry.operation,
      entry.previousState ? JSON.stringify(entry.previousState) : null,
      JSON.stringify(entry.newState),
      entry.timestamp.getTime(),
      entry.sessionId,
      entry.userId || null,
      entry.metadata.source,
      entry.metadata.reason || null,
      entry.metadata.batchId || null,
      entry.metadata.undoable ? 1 : 0
    ]);
    
    stmt.free();
  }

  private addToUndoStack(todoId: string): void {
    this.undoStack.push(todoId);
    
    // Clear redo stack when new operation is performed
    this.redoStack = [];
    
    // Limit undo stack size
    const maxUndoSize = 50;
    if (this.undoStack.length > maxUndoSize) {
      this.undoStack.shift();
    }
  }

  private async restoreTodoState(todoId: string, state: Partial<TodoItem>): Promise<void> {
    if (!state.id) state.id = todoId;
    if (!state.updatedAt) state.updatedAt = new Date();
    
    await this.persistTodo(state as TodoItem, 'update');
  }

  private async saveDatabase(): Promise<void> {
    try {
      const data = this.db.export();
      const fs = await import('node:fs/promises');
      await fs.writeFile(this.config.dbPath, data);
    } catch (error) {
      this.logger.error('Failed to save database', error);
    }
  }

  private async loadSessionState(): Promise<void> {
    try {
      // Load current session from database
      const stmt = this.db.prepare(`
        SELECT * FROM sessions 
        WHERE instance_id = ? AND is_active = 1 
        ORDER BY start_time DESC 
        LIMIT 1
      `);
      
      stmt.bind([this.getInstanceId()]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        this.currentSession = {
          sessionId: row.session_id,
          startTime: new Date(row.start_time),
          endTime: row.end_time ? new Date(row.end_time) : undefined,
          instanceId: row.instance_id,
          userId: row.user_id,
          todosCreated: row.todos_created,
          todosCompleted: row.todos_completed,
          todosModified: row.todos_modified,
          sessionMetrics: {
            productivityScore: row.productivity_score,
            focusTime: row.focus_time,
            interruptionCount: row.interruption_count,
            avgCompletionTime: row.avg_completion_time
          },
          isActive: Boolean(row.is_active)
        };
      }
      
      stmt.free();
      
      // Update session in database
      await this.updateSessionInDatabase();
      
    } catch (error) {
      this.logger.error('Failed to load session state', error);
    }
  }

  private async updateSessionInDatabase(): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (
        session_id, start_time, end_time, instance_id, user_id,
        todos_created, todos_completed, todos_modified,
        productivity_score, focus_time, interruption_count, avg_completion_time,
        is_active, last_heartbeat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      this.currentSession.sessionId,
      this.currentSession.startTime.getTime(),
      this.currentSession.endTime?.getTime() || null,
      this.currentSession.instanceId,
      this.currentSession.userId || null,
      this.currentSession.todosCreated,
      this.currentSession.todosCompleted,
      this.currentSession.todosModified,
      this.currentSession.sessionMetrics.productivityScore,
      this.currentSession.sessionMetrics.focusTime,
      this.currentSession.sessionMetrics.interruptionCount,
      this.currentSession.sessionMetrics.avgCompletionTime,
      this.currentSession.isActive ? 1 : 0,
      Date.now()
    ]);
    
    stmt.free();
  }

  private async registerInstance(): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO instances (
        instance_id, hostname, process_id, start_time, last_heartbeat, is_active, capabilities
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const os = await import('node:os');
    
    stmt.run([
      this.getInstanceId(),
      os.hostname(),
      process.pid,
      Date.now(),
      Date.now(),
      1,
      JSON.stringify(['persistence', 'sync', 'backup'])
    ]);
    
    stmt.free();
    await this.saveDatabase();
  }

  private async getActiveInstances(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM instances 
      WHERE is_active = 1 AND last_heartbeat > ?
    `);
    
    const cutoff = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    stmt.bind([cutoff]);
    
    const instances: any[] = [];
    while (stmt.step()) {
      instances.push(stmt.getAsObject());
    }
    
    stmt.free();
    return instances;
  }

  private async syncWithInstance(instance: any): Promise<void> {
    // Simplified sync implementation
    // In real implementation, would use network communication
    this.logger.debug(`Syncing with instance ${instance.instance_id}`);
  }

  private autoMergeStates(local: TodoItem, remote: TodoItem): TodoItem {
    // Intelligent auto-merge strategy
    return {
      ...local,
      // Use most recent timestamp for updates
      updatedAt: (local.updatedAt || new Date()) > (remote.updatedAt || new Date()) ? (local.updatedAt || new Date()) : (remote.updatedAt || new Date()),
      // Merge non-conflicting fields
      tags: [...new Set([...(local.tags || []), ...(remote.tags || [])])],
      // Use higher priority
      priority: this.getHigherPriority(local.priority, remote.priority),
      // Prefer completed status
      status: local.status === 'completed' || remote.status === 'completed' ? 'completed' : 
              local.status === 'in_progress' || remote.status === 'in_progress' ? 'in_progress' : 'pending'
    };
  }

  private getHigherPriority(p1: string, p2: string): 'low' | 'medium' | 'high' {
    const priorities = { 'low': 1, 'medium': 2, 'high': 3 };
    const priority1 = priorities[p1 as keyof typeof priorities] || 1;
    const priority2 = priorities[p2 as keyof typeof priorities] || 1;
    
    const result = priority1 > priority2 ? p1 : p2;
    return result as 'low' | 'medium' | 'high';
  }

  private startPeriodicOperations(): void {
    // Sync timer
    if (this.config.enableMultiInstance) {
      this.syncTimer = setInterval(async () => {
        await this.syncWithRemoteInstances();
      }, this.config.syncInterval);
    }
    
    // Backup timer
    this.backupTimer = setInterval(async () => {
      await this.createBackup();
    }, this.config.backupInterval);
    
    // Heartbeat timer
    setInterval(async () => {
      await this.sendHeartbeat();
    }, 30000); // 30 seconds
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      const stmt = this.db.prepare('UPDATE instances SET last_heartbeat = ? WHERE instance_id = ?');
      stmt.run([Date.now(), this.getInstanceId()]);
      stmt.free();
      
      this.emit('instance:heartbeat', {
        instanceId: this.getInstanceId(),
        timestamp: new Date()
      });
      
    } catch (error) {
      this.logger.error('Failed to send heartbeat', error);
    }
  }

  /**
   * Event handlers
   */
  private async handleTodoCreated(data: { todo: TodoItem }): Promise<void> {
    await this.persistTodo(data.todo, 'create');
    this.currentSession.todosCreated++;
    await this.updateSessionInDatabase();
  }

  private async handleTaskCreated(data: any): Promise<void> {
    this.currentSession.todosModified++;
    await this.updateSessionInDatabase();
  }

  private async handleStatusChange(data: any): Promise<void> {
    if (data.status === 'completed') {
      this.currentSession.todosCompleted++;
    }
    this.currentSession.todosModified++;
    await this.updateSessionInDatabase();
  }

  private updateSessionMetrics(data: any): void {
    // Update session productivity metrics
    this.currentSession.sessionMetrics.productivityScore = this.calculateProductivityScore();
  }

  private calculateProductivityScore(): number {
    const { todosCreated, todosCompleted, todosModified } = this.currentSession;
    const completionRate = todosCreated > 0 ? todosCompleted / todosCreated : 0;
    const activityLevel = Math.min(1, todosModified / 10);
    
    return Math.round((completionRate * 0.7 + activityLevel * 0.3) * 100) / 100;
  }

  private async handleSyncConflict(conflict: TodoSyncConflict): Promise<void> {
    this.conflictQueue.set(conflict.conflictId, conflict);
    
    // Record conflict in database
    const stmt = this.db.prepare(`
      INSERT INTO sync_conflicts (
        conflict_id, todo_id, local_state, remote_state, conflict_type, detected_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      conflict.conflictId,
      conflict.todoId,
      JSON.stringify(conflict.localState),
      JSON.stringify(conflict.remoteState),
      conflict.conflictType,
      conflict.detectedAt.getTime()
    ]);
    
    stmt.free();
    await this.saveDatabase();
  }

  private async updateInstanceHeartbeat(data: any): Promise<void> {
    // Handle heartbeat from other instances
  }

  /**
   * Public API methods
   */
  public getCurrentSession(): TodoSession {
    return { ...this.currentSession };
  }

  public getUndoStack(): string[] {
    return [...this.undoStack];
  }

  public getRedoStack(): string[] {
    return [...this.redoStack];
  }

  public getPendingConflicts(): TodoSyncConflict[] {
    return Array.from(this.conflictQueue.values());
  }

  public getLastSyncTime(): Date {
    return this.lastSyncTime;
  }

  public async getSessionHistory(limit: number = 50): Promise<TodoSession[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      ORDER BY start_time DESC 
      LIMIT ?
    `);
    
    stmt.bind([limit]);
    
    const sessions: TodoSession[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      sessions.push({
        sessionId: row.session_id,
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        instanceId: row.instance_id,
        userId: row.user_id,
        todosCreated: row.todos_created,
        todosCompleted: row.todos_completed,
        todosModified: row.todos_modified,
        sessionMetrics: {
          productivityScore: row.productivity_score,
          focusTime: row.focus_time,
          interruptionCount: row.interruption_count,
          avgCompletionTime: row.avg_completion_time
        },
        isActive: Boolean(row.is_active)
      });
    }
    
    stmt.free();
    return sessions;
  }

  public async exportTodos(format: 'json' | 'csv' = 'json'): Promise<string> {
    const todos = await this.getAllTodos();
    
    if (format === 'json') {
      return JSON.stringify(todos, null, 2);
    } else {
      // CSV export
      const headers = ['id', 'content', 'status', 'priority', 'createdAt', 'updatedAt'];
      const csvRows = [headers.join(',')];
      
      for (const todo of todos) {
        const row = [
          todo.id,
          `"${todo.content.replace(/"/g, '""')}"`,
          todo.status,
          todo.priority,
          (todo.createdAt || new Date()).toISOString(),
          (todo.updatedAt || new Date()).toISOString()
        ];
        csvRows.push(row.join(','));
      }
      
      return csvRows.join('\n');
    }
  }

  public async shutdown(): Promise<void> {
    try {
      // Mark session as ended
      this.currentSession.endTime = new Date();
      this.currentSession.isActive = false;
      await this.updateSessionInDatabase();
      
      // Mark instance as inactive
      const stmt = this.db.prepare('UPDATE instances SET is_active = 0 WHERE instance_id = ?');
      stmt.run([this.getInstanceId()]);
      stmt.free();
      
      // Clear timers
      if (this.syncTimer) clearInterval(this.syncTimer);
      if (this.backupTimer) clearInterval(this.backupTimer);
      
      // Final database save and close
      await this.saveDatabase();
      this.db.close();
      
      this.logger.info('Cross-session todo persistence shutdown complete');
      
    } catch (error) {
      this.logger.error('Error during persistence shutdown', error);
    }
  }
} 
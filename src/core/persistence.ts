/**
 * Persistence layer for Claude-Flow using SQLite
 */

// @ts-ignore - sql.js doesn't have proper type definitions
import initSqlJs from 'sql.js';
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { Buffer } from "node:buffer";

// Simple type definitions for sql.ts
interface Database {
  run(sql: string, params?: any[]): void;
  exec(sql: string): any[];
  prepare(sql: string): Statement;
  export(): Uint8Array;
  close(): void;
}

interface Statement {
  step(): boolean;
  get(): any[];
  getAsObject(): any;
  bind(params?: any[]): void;
  reset(): void;
  free(): void;
}

interface SqlJsStatic {
  Database: new (data?: Uint8Array) => Database;
}

export interface PersistedAgent {
  id: string;
  type: string;
  name: string;
  status: string;
  capabilities: string;
  systemPrompt: string;
  maxConcurrentTasks: number;
  priority: number;
  createdAt: number;
}

export interface PersistedTask {
  id: string;
  type: string;
  description: string;
  status: string;
  priority: number;
  dependencies: string;
  metadata: string;
  assignedAgent?: string | undefined;
  progress: number;
  error?: string | undefined;
  createdAt: number;
  completedAt?: number | undefined;
}

export class PersistenceManager {
  public db: any; // sql.ts Database - made public for direct access
  private dbPath: string;
  private SQL: any;

  constructor(dataDir: string = "./memory") {
    this.dbPath = join(dataDir, "claude-flow.db");
  }

  async initialize(): Promise<void> {
    // Initialize sql.ts
    this.SQL = await initSqlJs();
    
    // Ensure directory exists
    await mkdir(join(this.dbPath, ".."), { recursive: true });
    
    // Load existing database or create new one
    if (existsSync(this.dbPath)) {
      const filebuffer = await readFile(this.dbPath);
      this.db = new this.SQL.Database(filebuffer);
    } else {
      this.db = new this.SQL.Database();
    }
    
    // Create tables if they don't exist
    this.createTables();
  }

  private createTables(): void {
    // Agents table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        max_concurrent_tasks INTEGER NOT NULL,
        priority INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // Tasks table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        priority INTEGER NOT NULL,
        dependencies TEXT NOT NULL,
        metadata TEXT NOT NULL,
        assigned_agent TEXT,
        progress INTEGER DEFAULT 0,
        error TEXT,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    `);

    // Sessions table for terminal sessions
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        terminal_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);

    // Save to disk after creating tables
    this.saveToFile();
  }

  public async saveToFile(): Promise<void> {
    const data = this.db.export();
    await writeFile(this.dbPath, Buffer.from(data));
  }

  // Agent operations
  async saveAgent(agent: PersistedAgent): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO agents 
       (id, type, name, status, capabilities, system_prompt, max_concurrent_tasks, priority, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run([
      agent.id,
      agent.type,
      agent.name,
      agent.status,
      agent.capabilities,
      agent.systemPrompt,
      agent.maxConcurrentTasks,
      agent.priority,
      agent.createdAt
    ]);
    stmt.free();
    await this.saveToFile();
  }

  async getAgent(id: string): Promise<PersistedAgent | null> {
    const stmt = this.db.prepare("SELECT * FROM agents WHERE id = ?");
    const result = stmt.getAsObject([id]);
    stmt.free();
    
    if (!result || Object.keys(result).length === 0) return null;
    
    return {
      id: result.id as string,
      type: result.type as string,
      name: result.name as string,
      status: result.status as string,
      capabilities: result.capabilities as string,
      systemPrompt: result.system_prompt as string,
      maxConcurrentTasks: result.max_concurrent_tasks as number,
      priority: result.priority as number,
      createdAt: result.created_at as number,
    };
  }

  async getActiveAgents(): Promise<PersistedAgent[]> {
    const stmt = this.db.prepare("SELECT * FROM agents WHERE status IN ('active', 'idle') ORDER BY created_at DESC");
    const results: PersistedAgent[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        type: row.type as string,
        name: row.name as string,
        status: row.status as string,
        capabilities: row.capabilities as string,
        systemPrompt: row.system_prompt as string,
        maxConcurrentTasks: row.max_concurrent_tasks as number,
        priority: row.priority as number,
        createdAt: row.created_at as number,
      });
    }
    stmt.free();
    
    return results;
  }

  async getAllAgents(): Promise<PersistedAgent[]> {
    const stmt = this.db.prepare("SELECT * FROM agents WHERE status != 'removed' ORDER BY created_at DESC");
    const results: PersistedAgent[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        type: row.type as string,
        name: row.name as string,
        status: row.status as string,
        capabilities: row.capabilities as string,
        systemPrompt: row.system_prompt as string,
        maxConcurrentTasks: row.max_concurrent_tasks as number,
        priority: row.priority as number,
        createdAt: row.created_at as number,
      });
    }
    stmt.free();
    
    return results;
  }

  async updateAgentStatus(id: string, status: string): Promise<void> {
    const stmt = this.db.prepare("UPDATE agents SET status = ? WHERE id = ?");
    stmt.run([status, id]);
    stmt.free();
    await this.saveToFile();
  }

  // Task operations
  async saveTask(task: PersistedTask): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO tasks 
       (id, type, description, status, priority, dependencies, metadata, assigned_agent, progress, error, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    stmt.run([
      task.id,
      task.type,
      task.description,
      task.status,
      task.priority,
      task.dependencies,
      task.metadata,
      task.assignedAgent || null,
      task.progress,
      task.error || null,
      task.createdAt,
      task.completedAt || null
    ]);
    stmt.free();
    await this.saveToFile();
  }

  async getTask(id: string): Promise<PersistedTask | null> {
    const stmt = this.db.prepare("SELECT * FROM tasks WHERE id = ?");
    const result = stmt.getAsObject([id]);
    stmt.free();
    
    if (!result || Object.keys(result).length === 0) return null;
    
    return {
      id: result.id as string,
      type: result.type as string,
      description: result.description as string,
      status: result.status as string,
      priority: result.priority as number,
      dependencies: result.dependencies as string,
      metadata: result.metadata as string,
      assignedAgent: result.assigned_agent ? (result.assigned_agent as string) : undefined,
      progress: result.progress as number,
      error: result.error ? (result.error as string) : undefined,
      createdAt: result.created_at as number,
      completedAt: result.completed_at ? (result.completed_at as number) : undefined,
    };
  }

  async getActiveTasks(): Promise<PersistedTask[]> {
    const stmt = this.db.prepare("SELECT * FROM tasks WHERE status IN ('pending', 'in_progress', 'assigned') ORDER BY priority DESC, created_at ASC");
    const results: PersistedTask[] = [];
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        type: row.type as string,
        description: row.description as string,
        status: row.status as string,
        priority: row.priority as number,
        dependencies: row.dependencies as string,
        metadata: row.metadata as string,
        assignedAgent: row.assigned_agent ? (row.assigned_agent as string) : undefined,
        progress: row.progress as number,
        error: row.error ? (row.error as string) : undefined,
        createdAt: row.created_at as number,
        completedAt: row.completed_at ? (row.completed_at as number) : undefined,
      });
    }
    stmt.free();
    
    return results;
  }

  async updateTaskStatus(id: string, status: string, assignedAgent?: string): Promise<void> {
    if (assignedAgent) {
      const stmt = this.db.prepare("UPDATE tasks SET status = ?, assigned_agent = ? WHERE id = ?");
      stmt.run([status, assignedAgent, id]);
      stmt.free();
    } else {
      const stmt = this.db.prepare("UPDATE tasks SET status = ? WHERE id = ?");
      stmt.run([status, id]);
      stmt.free();
    }
    await this.saveToFile();
  }

  async updateTaskProgress(id: string, progress: number): Promise<void> {
    const stmt = this.db.prepare("UPDATE tasks SET progress = ? WHERE id = ?");
    stmt.run([progress, id]);
    stmt.free();
    await this.saveToFile();
  }

  async getStats(): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
  }> {
    const stats = {
      totalAgents: 0,
      activeAgents: 0,
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
    };

    // Count agents
    let stmt = this.db.prepare("SELECT COUNT(*) as count FROM agents");
    let result = stmt.getAsObject();
    stats.totalAgents = result.count as number;
    stmt.free();

    stmt = this.db.prepare("SELECT COUNT(*) as count FROM agents WHERE status IN ('active', 'idle')");
    result = stmt.getAsObject();
    stats.activeAgents = result.count as number;
    stmt.free();

    // Count tasks
    stmt = this.db.prepare("SELECT COUNT(*) as count FROM tasks");
    result = stmt.getAsObject();
    stats.totalTasks = result.count as number;
    stmt.free();

    stmt = this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress', 'assigned')");
    result = stmt.getAsObject();
    stats.pendingTasks = result.count as number;
    stmt.free();

    stmt = this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'");
    result = stmt.getAsObject();
    stats.completedTasks = result.count as number;
    stmt.free();

    return stats;
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
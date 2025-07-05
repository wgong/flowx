/**
 * SQLite backend implementation for high-performance memory storage
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { IMemoryBackend } from "./base.js";
import { MemoryEntry, MemoryQuery } from "../../utils/types.js";
import { ILogger } from "../../core/logger.js";
import { MemoryBackendError } from "../../utils/errors.js";

/**
 * SQLite-based memory backend
 */
export class SQLiteBackend implements IMemoryBackend {
  private db: Database.Database | null = null;
  private initialized = false;

  constructor(
    private dbPath: string,
    private logger: ILogger,
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing SQLite backend', { dbPath: this.dbPath });

    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      await fs.promises.mkdir(dir, { recursive: true });

      // Open database without verbose callback to avoid type issues
      this.db = new Database(this.dbPath);

      // Create tables
      this.createTables();

      this.initialized = true;
      this.logger.info('SQLite backend initialized');
    } catch (error) {
      throw new MemoryBackendError('Failed to initialize SQLite backend', { error });
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down SQLite backend');

    if (this.db) {
      // Export database for backup
      const backupPath = `${this.dbPath}.backup`;
      const backup = this.db.serialize();
      await fs.promises.writeFile(backupPath, backup);
      
      this.db.close();
      this.db = null;
    }

    this.initialized = false;
  }

  async store(entry: MemoryEntry): Promise<void> {
    if (!this.db) {
      throw new MemoryBackendError('Database not initialized');
    }

    const sql = `
      INSERT OR REPLACE INTO memory_entries (
        id, agent_id, session_id, type, content, 
        context, timestamp, tags, version, parent_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      entry.id,
      entry.agentId,
      entry.sessionId,
      entry.type,
      entry.content,
      JSON.stringify(entry.context),
      entry.timestamp.toISOString(),
      JSON.stringify(entry.tags),
      entry.version,
      entry.parentId || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ];

    try {
      this.db.prepare(sql).run(params);
    } catch (error) {
      throw new MemoryBackendError('Failed to store entry', { error });
    }
  }

  async retrieve(id: string): Promise<MemoryEntry | undefined> {
    if (!this.db) {
      throw new MemoryBackendError('Database not initialized');
    }

    const sql = 'SELECT * FROM memory_entries WHERE id = ?';
    
    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get([id]);
      
      if (!result || Object.keys(result).length === 0) {
        return undefined;
      }

      return this.rowToEntry(result);
    } catch (error) {
      throw new MemoryBackendError('Failed to retrieve entry', { error });
    }
  }

  async update(id: string, entry: MemoryEntry): Promise<void> {
    // SQLite INSERT OR REPLACE handles updates
    await this.store(entry);
  }

  async delete(id: string): Promise<void> {
    if (!this.db) {
      throw new MemoryBackendError('Database not initialized');
    }

    const sql = 'DELETE FROM memory_entries WHERE id = ?';
    
    try {
      this.db.prepare(sql).run([id]);
    } catch (error) {
      throw new MemoryBackendError('Failed to delete entry', { error });
    }
  }

  async query(query: MemoryQuery): Promise<MemoryEntry[]> {
    if (!this.db) {
      throw new MemoryBackendError('Database not initialized');
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.agentId) {
      conditions.push('agent_id = ?');
      params.push(query.agentId);
    }

    if (query.sessionId) {
      conditions.push('session_id = ?');
      params.push(query.sessionId);
    }

    if (query.type) {
      conditions.push('type = ?');
      params.push(query.type);
    }

    if (query.startTime) {
      conditions.push('timestamp >= ?');
      params.push(query.startTime.toISOString());
    }

    if (query.endTime) {
      conditions.push('timestamp <= ?');
      params.push(query.endTime.toISOString());
    }

    if (query.search) {
      conditions.push('(content LIKE ? OR tags LIKE ?)');
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    if (query.tags && query.tags.length > 0) {
      const tagConditions = query.tags.map(() => 'tags LIKE ?');
      conditions.push(`(${tagConditions.join(' OR ')})`);
      query.tags.forEach((tag: string) => params.push(`%"${tag}"%`));
    }

    let sql = 'SELECT * FROM memory_entries';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      // SQLite requires LIMIT when using OFFSET
      if (!query.limit) {
        sql += ' LIMIT -1';  // -1 means no limit in SQLite
      }
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(params);
      
      return rows.map(row => this.rowToEntry(row));
    } catch (error) {
      throw new MemoryBackendError('Failed to query entries', { error });
    }
  }

  async getAllEntries(): Promise<MemoryEntry[]> {
    if (!this.db) {
      throw new MemoryBackendError('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM memory_entries ORDER BY timestamp DESC');
      const rows = stmt.all();
      
      return rows.map(row => this.rowToEntry(row));
    } catch (error) {
      throw new MemoryBackendError('Failed to get all entries', { error });
    }
  }

  async getHealthStatus(): Promise<{ 
    healthy: boolean; 
    error?: string; 
    metrics?: Record<string, number>;
  }> {
    try {
      if (!this.db) {
        return { healthy: false, error: 'Database not initialized' };
      }

      // Test basic query
      const stmt = this.db.prepare('SELECT COUNT(*) as count FROM memory_entries');
      const result = stmt.get();
      const count = result.count as number;

      // Get database file size
      let fileSize = 0;
      try {
        const stats = await fs.promises.stat(this.dbPath);
        fileSize = stats.size;
      } catch {
        // File might not exist yet
      }

      return {
        healthy: true,
        metrics: {
          totalEntries: count,
          fileSizeBytes: fileSize,
        }
      };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createTables(): void {
    if (!this.db) return;

    const sql = `
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        timestamp TEXT NOT NULL,
        tags TEXT,
        version INTEGER DEFAULT 1,
        parent_id TEXT,
        metadata TEXT
      )
    `;

    this.db.prepare(sql).run();
  }

  private rowToEntry(row: Record<string, unknown>): MemoryEntry {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      sessionId: row.session_id as string,
      type: (row.type as "error" | "observation" | "insight" | "decision" | "artifact"),
      content: row.content as string,
      context: row.context ? JSON.parse(row.context as string) : {},
      timestamp: new Date(row.timestamp as string),
      tags: row.tags ? JSON.parse(row.tags as string) : [],
      version: (row.version as number) || 1,
      parentId: row.parent_id as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    };
  }
}


/**
 * Comprehensive better-sqlite3 mock for Jest
 */

const { jest } = require('@jest/globals');

class MockStatement {
  constructor(sql) {
    this.source = sql;
    this.reader = false;
    this.run = jest.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 });
    this.get = jest.fn().mockReturnValue(null);
    this.all = jest.fn().mockReturnValue([]);
    this.iterate = jest.fn().mockReturnValue([]);
    this.finalize = jest.fn();
    this.columns = jest.fn().mockReturnValue([]);
    this.bind = jest.fn().mockReturnThis();
  }
}

class MockBackup {
  constructor() {
    this.transfer = jest.fn().mockReturnValue(0);
    this.close = jest.fn();
    this.remaining = 0;
    this.pageCount = 1;
  }
}

class MockDatabase {
  constructor(filename, options = {}) {
    this.filename = filename || ':memory:';
    this.options = options;
    this.open = true;
    this.readonly = options.readonly || false;
    this.name = filename || ':memory:';
    this.memory = filename === ':memory:' || !filename;
    this.inTransaction = false;
    
    // Mock data storage
    this._tables = new Map();
    this._data = new Map();
    this._lastInsertRowid = 0;
    
    // Core methods
    this.prepare = jest.fn().mockImplementation((sql) => {
      const stmt = new MockStatement(sql);
      
      // Enhanced mock behavior based on SQL
      if (sql.includes('INSERT') || sql.includes('UPDATE') || sql.includes('DELETE')) {
        stmt.run = jest.fn().mockImplementation(() => {
          this._lastInsertRowid += 1;
          return { changes: 1, lastInsertRowid: this._lastInsertRowid };
        });
      } else if (sql.includes('SELECT')) {
        if (sql.includes('COUNT(*)')) {
          stmt.get = jest.fn().mockReturnValue({ 'COUNT(*)': 0 });
        } else {
          stmt.get = jest.fn().mockReturnValue(null);
          stmt.all = jest.fn().mockReturnValue([]);
        }
      }
      
      return stmt;
    });
    
    this.exec = jest.fn().mockImplementation((sql) => {
      // Mock table creation
      if (sql.includes('CREATE TABLE')) {
        const tableName = sql.match(/CREATE TABLE\s+(\w+)/i)?.[1];
        if (tableName) {
          this._tables.set(tableName, new Map());
        }
      }
      return this;
    });
    
    this.close = jest.fn().mockImplementation(() => {
      this.open = false;
    });
    
    this.pragma = jest.fn().mockImplementation((pragma) => {
      if (pragma === 'user_version') {
        return [{ user_version: 1 }];
      }
      if (pragma === 'journal_mode') {
        return [{ journal_mode: 'wal' }];
      }
      if (pragma === 'synchronous') {
        return [{ synchronous: 1 }];
      }
      if (pragma === 'foreign_keys') {
        return [{ foreign_keys: 1 }];
      }
      return [];
    });
    
    this.backup = jest.fn().mockImplementation(() => new MockBackup());
    
    this.serialize = jest.fn(() => Buffer.from('mock-database-backup'));
    
    this.function = jest.fn().mockImplementation((name, fn) => {
      // Mock custom SQLite functions
      return this;
    });
    
    this.aggregate = jest.fn();
    this.table = jest.fn();
    this.loadExtension = jest.fn();
    this.defaultSafeIntegers = jest.fn();
    this.unsafeMode = jest.fn();
    
    // Transaction methods
    this.transaction = jest.fn().mockImplementation((fn) => {
      return (...args) => {
        this.inTransaction = true;
        try {
          const result = fn(...args);
          this.inTransaction = false;
          return result;
        } catch (error) {
          this.inTransaction = false;
          throw error;
        }
      };
    });
    
    // Additional mock methods for comprehensive support
    this.checkpoint = jest.fn();
    this.wal = jest.fn();
    this.vacuumInto = jest.fn();
  }
}

// Static properties and methods
MockDatabase.SqliteError = class extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'SqliteError';
    this.code = code || 'UNKNOWN';
  }
};

// Common SQLite error codes
MockDatabase.SQLITE_OK = 0;
MockDatabase.SQLITE_ERROR = 1;
MockDatabase.SQLITE_BUSY = 5;
MockDatabase.SQLITE_CONSTRAINT = 19;

MockDatabase.prototype.constructor = MockDatabase;

// Export as CommonJS module
module.exports = MockDatabase;
module.exports.default = MockDatabase; 
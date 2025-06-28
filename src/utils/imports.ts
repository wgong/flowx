/**
 * Import Compatibility Layer
 * Provides unified imports that work in both Deno and Node.js
 */

import { isDeno } from './runtime-env.ts';

// File system operations
export const fs = isDeno() 
  ? await import('node:fs/promises')
  : await import('node:fs/promises');

export const fsSync = isDeno()
  ? await import('node:fs')
  : await import('node:fs');

// Path utilities
export const path = isDeno()
  ? await import('node:path')
  : await import('node:path');

// OS utilities
export const os = isDeno()
  ? await import('node:os')
  : await import('node:os');

// Crypto utilities
export const crypto = isDeno()
  ? await import('node:crypto')
  : await import('node:crypto');

// URL utilities
export const url = isDeno()
  ? await import('node:url')
  : await import('node:url');

// Stream utilities
export const stream = isDeno()
  ? await import('node:stream')
  : await import('node:stream');

// Child process utilities
export const childProcess = isDeno()
  ? await import('node:child_process')
  : await import('node:child_process');

// Utility functions
export const util = isDeno()
  ? await import('node:util')
  : await import('node:util');

// Chalk for colors
export const chalk = isDeno()
  ? (await import('npm:chalk')).default
  : (await import('npm:chalk')).default;

// fs-extra
export const fsExtra = isDeno()
  ? await import('npm:fs-extra')
  : await import('npm:fs-extra');

// Inquirer
export const inquirer = isDeno()
  ? await import('npm:inquirer')
  : await import('npm:inquirer');

// Commander
export const commander = isDeno()
  ? await import('npm:commander')
  : await import('npm:commander');

// Ora (spinner)
export const ora = isDeno()
  ? (await import('npm:ora')).default
  : (await import('npm:ora')).default;

// CLI Table
export const cliTable = isDeno()
  ? (await import('npm:cli-table3')).default
  : (await import('npm:cli-table3')).default;

// Express (for web server)
export const express = isDeno()
  ? (await import('npm:express')).default
  : (await import('npm:express')).default;

// WebSocket
export const ws = isDeno()
  ? await import('npm:ws')
  : await import('npm:ws');

// Better SQLite3
export const betterSqlite3 = isDeno()
  ? (await import('npm:better-sqlite3')).default
  : (await import('npm:better-sqlite3')).default;

// Nanoid
export const nanoid = isDeno()
  ? (await import('npm:nanoid')).nanoid
  : (await import('npm:nanoid')).nanoid;

// Blessed (terminal UI)
export const blessed = isDeno()
  ? await import('npm:blessed')
  : await import('npm:blessed');

// Note: node-pty removed due to native binary requirements in bundled environments

// Helmet (security)
export const helmet = isDeno()
  ? (await import('npm:helmet')).default
  : (await import('npm:helmet')).default;

// CORS
export const cors = isDeno()
  ? (await import('npm:cors')).default
  : (await import('npm:cors')).default; 
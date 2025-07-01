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
  ? (await import('chalk')).default
  : (await import('chalk')).default;

// fs-extra
export const fsExtra = isDeno()
  ? await import('fs-extra')
  : await import('fs-extra');

// Inquirer
export const inquirer = isDeno()
  ? await import('inquirer')
  : await import('inquirer');

// Commander
export const commander = isDeno()
  ? await import('commander')
  : await import('commander');

// Ora (spinner)
export const ora = isDeno()
  ? (await import('ora')).default
  : (await import('ora')).default;

// CLI Table
export const cliTable = isDeno()
  ? (await import('cli-table3')).default
  : (await import('cli-table3')).default;

// Express (for web server)
export const express = isDeno()
  ? (await import('express')).default
  : (await import('express')).default;

// WebSocket
export const ws = isDeno()
  ? await import('ws')
  : await import('ws');

// Better SQLite3
export const betterSqlite3 = isDeno()
  ? (await import('better-sqlite3')).default
  : (await import('better-sqlite3')).default;

// Nanoid
export const nanoid = isDeno()
  ? (await import('nanoid')).nanoid
  : (await import('nanoid')).nanoid;

// Blessed (terminal UI)
export const blessed = isDeno()
  ? await import('blessed')
  : await import('blessed');

// Note: node-pty removed due to native binary requirements in bundled environments

// Helmet (security)
export const helmet = isDeno()
  ? (await import('helmet')).default
  : (await import('helmet')).default;

// CORS
export const cors = isDeno()
  ? (await import('cors')).default
  : (await import('cors')).default; 
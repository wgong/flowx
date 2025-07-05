/**
 * Types for Start Command
 */

export interface StartOptions {
  daemon?: boolean;
  port?: string;
  mcpTransport?: string;
  ui?: boolean;
  verbose?: boolean;
  autoStart?: boolean;
  config?: string;
  force?: boolean;
  healthCheck?: boolean;
  timeout?: number;
} 
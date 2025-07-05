/**
 * Simple event bus utility for claude-code-flow
 */

import { EventEmitter } from 'node:events';
import { IEventBus } from '../core/event-bus.ts';

/**
 * Create a simple event bus
 */
export function createSimpleEventBus(): IEventBus {
  const emitter = new EventEmitter();

  return {
    emit: (event: string, data?: unknown) => {
      emitter.emit(event, data);
    },
    on: (event: string, handler: (data?: unknown) => void) => {
      emitter.on(event, handler);
    },
    off: (event: string, handler: (data?: unknown) => void) => {
      emitter.off(event, handler);
    },
    once: (event: string, handler: (data?: unknown) => void) => {
      emitter.once(event, handler);
    }
  };
} 
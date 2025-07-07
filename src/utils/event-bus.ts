/**
 * Simple event bus utility for claude-code-flow
 */

import { EventEmitter } from 'node:events';
import { IEventBus } from '../core/event-bus.js';

/**
 * Create a simple event bus
 */
export function createSimpleEventBus(): IEventBus {
  const emitter = new EventEmitter();

  const eventBus = {
    emit: (event: string, data?: unknown): boolean => {
      return emitter.emit(event, data);
    },
    on: (event: string, listener: (...args: any[]) => void): IEventBus => {
      emitter.on(event, listener);
      return eventBus;
    },
    off: (event: string, listener: (...args: any[]) => void): IEventBus => {
      emitter.off(event, listener);
      return eventBus;
    },
    once: (event: string, listener: (...args: any[]) => void): IEventBus => {
      emitter.once(event, listener);
      return eventBus;
    },
    removeAllListeners: (event?: string): IEventBus => {
      emitter.removeAllListeners(event);
      return eventBus;
    },
    getMaxListeners: (): number => {
      return emitter.getMaxListeners();
    },
    setMaxListeners: (n: number): IEventBus => {
      emitter.setMaxListeners(n);
      return eventBus;
    },
    listeners: (event: string): Function[] => {
      return emitter.listeners(event);
    },
    listenerCount: (event: string): number => {
      return emitter.listenerCount(event);
    }
  };
  
  return eventBus;
} 
/**
 * Simple event bus utility for claude-code-flow
 */

import { EventEmitter } from 'events';

export interface IEventBus {
  emit: (event: string, data?: unknown) => boolean;
  on: (event: string, listener: (...args: unknown[]) => void) => IEventBus;
  off: (event: string, listener: (...args: unknown[]) => void) => IEventBus;
  once: (event: string, listener: (...args: unknown[]) => void) => IEventBus;
  removeAllListeners: (event?: string) => IEventBus;
  getMaxListeners: () => number;
  setMaxListeners: (n: number) => IEventBus;
  listeners: (event: string) => ((...args: unknown[]) => void)[];
  listenerCount: (event: string) => number;
}

export function createSimpleEventBus(): IEventBus {
  const emitter = new EventEmitter();
  
  const eventBus: IEventBus = {
    emit: (event: string, data?: unknown): boolean => {
      return emitter.emit(event, data);
    },
    on: (event: string, listener: (...args: unknown[]) => void): IEventBus => {
      emitter.on(event, listener);
      return eventBus;
    },
    off: (event: string, listener: (...args: unknown[]) => void): IEventBus => {
      emitter.off(event, listener);
      return eventBus;
    },
    once: (event: string, listener: (...args: unknown[]) => void): IEventBus => {
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
    listeners: (event: string): ((...args: unknown[]) => void)[] => {
      return emitter.listeners(event) as ((...args: unknown[]) => void)[];
    },
    listenerCount: (event: string): number => {
      return emitter.listenerCount(event);
    }
  };

  return eventBus;
} 
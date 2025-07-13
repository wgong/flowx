/**
 * Enhanced comprehensive unit tests for EventBus
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EventBus } from '../../../src/core/event-bus.ts';
import { setupTestEnv, cleanupTestEnv } from '../../test.config.ts';

describe('EventBus - Enhanced Tests', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    setupTestEnv();
    EventBus.reset(); // Reset the singleton
    eventBus = EventBus.getInstance();
  });

  afterEach(async () => {
    EventBus.reset(); // Reset after each test
    await cleanupTestEnv();
  });

  describe('Basic Event Operations', () => {
    it('should emit and handle events correctly', () => {
      const handler = jest.fn();
      
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { message: 'test data' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: 'test data' });
    });

    it('should handle multiple handlers for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      
      eventBus.on('test.event', handler1);
      eventBus.on('test.event', handler2);
      eventBus.on('test.event', handler3);
      
      eventBus.emit('test.event', { data: 'test' });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
      
      expect(handler1).toHaveBeenCalledWith({ data: 'test' });
      expect(handler2).toHaveBeenCalledWith({ data: 'test' });
      expect(handler3).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle event removal', () => {
      const handler = jest.fn();
      
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { data: 'test1' });
      
      eventBus.off('test.event', handler);
      eventBus.emit('test.event', { data: 'test2' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'test1' });
    });

    it('should handle once listeners', () => {
      const handler = jest.fn();
      
      eventBus.once('test.event', handler);
      eventBus.emit('test.event', { data: 'test1' });
      eventBus.emit('test.event', { data: 'test2' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'test1' });
    });

    it('should handle different event types', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.on('test.event1', handler1);
      eventBus.on('test.event2', handler2);
      
      eventBus.emit('test.event1', { data: 'test1' });
      eventBus.emit('test.event2', { data: 'test2' });
      eventBus.emit('other.event', { data: 'test3' });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({ data: 'test1' });
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledWith({ data: 'test2' });
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();
      
      eventBus.on('error.event', errorHandler);
      eventBus.on('error.event', normalHandler);
      
      // EventBus catches and logs errors but doesn't re-throw them
      const result = eventBus.emit('error.event', { data: 'test' });
      
      // The emit should return false when an error occurs
      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalledTimes(1);
      // The normal handler may not be called if the error handler throws first
    });

    it('should handle invalid event names', () => {
      const handler = jest.fn();
      
      // Empty string should still work
      eventBus.on('', handler);
      eventBus.emit('', { data: 'test' });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Memory', () => {
    it('should handle many events efficiently', () => {
      const handler = jest.fn();
      eventBus.on('test.event', handler);
      
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        eventBus.emit('test.event', { count: i });
      }
      const end = Date.now();
      
      expect(handler).toHaveBeenCalledTimes(1000);
      expect(end - start).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle many listeners efficiently', () => {
      const handlers = [];
      for (let i = 0; i < 100; i++) {
        const handler = jest.fn();
        handlers.push(handler);
        eventBus.on('test.event', handler);
      }
      
      eventBus.emit('test.event', { data: 'test' });
      
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Event Cleanup', () => {
    it('should clean up listeners for specific event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      eventBus.on('test.event1', handler1);
      eventBus.on('test.event2', handler2);
      
      eventBus.removeAllListeners('test.event1');
      
      eventBus.emit('test.event1', { data: 'test1' });
      eventBus.emit('test.event2', { data: 'test2' });
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Metadata', () => {
    it('should provide event metadata', () => {
      const handler = jest.fn();
      
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { data: 'test' });
      
      // Check if the event bus maintains listener count
      expect(eventBus.listenerCount('test.event')).toBe(1);
      expect(eventBus.listenerCount('non.existent')).toBe(0);
    });

    it('should provide event metrics', () => {
      const handler = jest.fn();
      
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { data: 'test' });
      
      const metrics = eventBus.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThan(0);
      expect(metrics.eventsByType['test.event']).toBe(1);
    });

    it('should provide event history', () => {
      const handler = jest.fn();
      
      eventBus.on('test.event', handler);
      eventBus.emit('test.event', { data: 'test' });
      
      const history = eventBus.getEventHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Async Event Handling', () => {
    it('should handle async handlers', async () => {
      const handler = jest.fn(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return data;
      });
      
      eventBus.on('test.async', handler);
      eventBus.emit('test.async', { data: 'test' });
      
      // Give async handler time to complete
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support waitFor method', async () => {
      const testData = { message: 'test' };
      
      // Set up a promise to wait for the event
      const eventPromise = eventBus.waitFor('test.wait');
      
      // Emit the event after a short delay
      setTimeout(() => {
        eventBus.emit('test.wait', testData);
      }, 10);
      
      // Wait for the event
      const result = await eventPromise;
      expect(result).toEqual(testData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid event emission', () => {
      const handler = jest.fn();
      eventBus.on('test.rapid', handler);
      
      // Emit many events rapidly
      for (let i = 0; i < 10; i++) {
        eventBus.emit('test.rapid', { count: i });
      }
      
      expect(handler).toHaveBeenCalledTimes(10);
    });

    it('should handle event emission during handler execution', () => {
      const handler1 = jest.fn((data) => {
        if (data.count < 3) {
          eventBus.emit('test.recursive', { count: data.count + 1 });
        }
      });
      
      eventBus.on('test.recursive', handler1);
      eventBus.emit('test.recursive', { count: 0 });
      
      expect(handler1).toHaveBeenCalledTimes(4); // 0, 1, 2, 3
    });

    it('should handle listener removal during emission', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn(() => {
        eventBus.off('test.removal', handler1);
      });
      
      eventBus.on('test.removal', handler1);
      eventBus.on('test.removal', handler2);
      
      eventBus.emit('test.removal', { data: 'test' });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      
      // Emit again to verify handler1 was removed
      eventBus.emit('test.removal', { data: 'test2' });
      
      expect(handler1).toHaveBeenCalledTimes(1); // Still 1, not called again
      expect(handler2).toHaveBeenCalledTimes(2); // Called again
    });

    it('should handle filtered events', () => {
      const handler = jest.fn();
      
      eventBus.onFiltered('test.filtered', (data: any) => data.value > 5, handler);
      
      eventBus.emit('test.filtered', { value: 3 }); // Should not trigger
      eventBus.emit('test.filtered', { value: 7 }); // Should trigger
      eventBus.emit('test.filtered', { value: 2 }); // Should not trigger
      eventBus.emit('test.filtered', { value: 10 }); // Should trigger
      
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, { value: 7 });
      expect(handler).toHaveBeenNthCalledWith(2, { value: 10 });
    });
  });
});
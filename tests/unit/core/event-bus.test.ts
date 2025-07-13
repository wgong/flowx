/**
 * Tests for the EventBus component aligned with the implementation
 */

import { EventBus } from './event-bus.cjs';
import { SystemEvents } from '../utils/types.cjs';

describe('EventBus', () => {
  let eventBus: EventBus;
  let singletonInstance: EventBus;
  
  beforeEach(() => {
    // Get a new instance for isolation in tests
    eventBus = new EventBus();
    
    // Save the singleton instance to restore later
    singletonInstance = EventBus.getInstance();
  });
  
  afterEach(() => {
    // Clean up all event handlers to prevent hanging tests
    if (eventBus) {
      eventBus.removeAllListeners();
      
      // Clear the cleanup interval in TypedEventBus
      const typedBus = (eventBus as any).typedBus;
      if (typedBus && typedBus.cleanupInterval) {
        clearInterval(typedBus.cleanupInterval);
      }
    }
  });
  
  // Clear intervals from any singletons when all tests are done
  afterAll(() => {
    // Get singleton instance
    const instance = EventBus.getInstance();
    
    // Clean up interval
    const typedBus = (instance as any).typedBus;
    if (typedBus && typedBus.cleanupInterval) {
      clearInterval(typedBus.cleanupInterval);
    }
  });
  
  test('should subscribe to events', () => {
    const handler = jest.fn();
    
    eventBus.on('test-event', handler);
    
    // Emit the event
    eventBus.emit('test-event', { data: 'test' });
    
    // Handler should have been called
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });
  
  test('should allow multiple subscribers to the same event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    eventBus.on('test-event', handler1);
    eventBus.on('test-event', handler2);
    
    // Emit the event
    eventBus.emit('test-event', { data: 'test' });
    
    // Both handlers should have been called
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
  
  test('should handle events with no subscribers', () => {
    // This should not throw
    expect(() => {
      eventBus.emit('unsubscribed-event', { data: 'test' });
    }).not.toThrow();
  });
  
  test('should allow unsubscribing from events', () => {
    const handler = jest.fn();
    
    // Subscribe
    eventBus.on('test-event', handler);
    
    // Emit once
    eventBus.emit('test-event', { data: 'first' });
    expect(handler).toHaveBeenCalledTimes(1);
    
    // Unsubscribe
    eventBus.off('test-event', handler);
    
    // Emit again
    eventBus.emit('test-event', { data: 'second' });
    
    // Handler should not have been called again
    expect(handler).toHaveBeenCalledTimes(1);
  });
  
  test('should support once subscription', () => {
    const handler = jest.fn();
    
    // Subscribe once
    eventBus.once('test-event', handler);
    
    // Emit twice
    eventBus.emit('test-event', { data: 'first' });
    eventBus.emit('test-event', { data: 'second' });
    
    // Handler should only have been called once
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ data: 'first' });
  });
  
  test('should support system events', () => {
    const handler = jest.fn();
    
    // Subscribe to system event
    eventBus.on(SystemEvents.SYSTEM_READY, handler);
    
    // Emit system event
    const payload = { timestamp: new Date() };
    eventBus.emit(SystemEvents.SYSTEM_READY, payload);
    
    // Handler should have been called
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });
  
  test('should get event statistics', () => {
    // Emit a few events
    eventBus.emit('event1', { data: '1' });
    eventBus.emit('event1', { data: '2' });
    eventBus.emit('event2', { data: '3' });
    
    // Get statistics
    const metrics = eventBus.getMetrics();
    
    // Should contain total events
    expect(metrics.totalEvents).toBeGreaterThanOrEqual(3);
    
    // Verify counts by type
    expect(metrics.eventsByType['event1']).toBe(2);
    expect(metrics.eventsByType['event2']).toBe(1);
  });
  
  test('should reset statistics', () => {
    // Emit a few events
    eventBus.emit('event1', { data: '1' });
    eventBus.emit('event2', { data: '2' });
    
    // Reset metrics
    eventBus.resetMetrics();
    
    // Get statistics
    const metrics = eventBus.getMetrics();
    
    // Should be reset
    expect(metrics.totalEvents).toBe(0);
    expect(Object.keys(metrics.eventsByType).length).toBe(0);
  });
  
  test('should remove all listeners for an event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    
    eventBus.on('event1', handler1);
    eventBus.on('event1', handler2);
    eventBus.on('event2', handler1);
    
    // Remove all listeners for event1
    eventBus.removeAllListeners('event1');
    
    // Emit events
    eventBus.emit('event1', { data: '1' });
    eventBus.emit('event2', { data: '2' });
    
    // Handlers for event1 should not be called
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
  });

  test('should have waitFor method', () => {
    // Just verify the method exists and is a function
    expect(typeof eventBus.waitFor).toBe('function');
  });
  
  test('should wait for events asynchronously', async () => {
    // Set up a promise that will resolve when the event is emitted
    const waitPromise = eventBus.waitFor('async-test-event');
    
    // Emit the event after a short delay
    setTimeout(() => {
      eventBus.emit('async-test-event', { data: 'async-data' });
    }, 100);
    
    // Wait for the event and check the result
    const result = await waitPromise;
    expect(result).toEqual({ data: 'async-data' });
  }, 1000); // Increase timeout for this test
  
  test('should timeout when waiting for events that do not occur', async () => {
    // Set up a promise that should timeout
    const waitPromise = eventBus.waitFor('timeout-test-event', 200);
    
    // Expect it to reject with a timeout error
    await expect(waitPromise).rejects.toThrow('Timeout waiting for event');
  }, 1000); // Increase timeout for this test

  test('should support filtered event listeners', () => {
    const handler = jest.fn();
    
    // Only handle events where data.id === 2
    eventBus.onFiltered('filtered-event', 
      (data: any) => data.id === 2, 
      handler);
    
    // Emit events
    eventBus.emit('filtered-event', { id: 1, data: 'first' });
    eventBus.emit('filtered-event', { id: 2, data: 'second' });
    eventBus.emit('filtered-event', { id: 3, data: 'third' });
    
    // Only matching event should trigger handler
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ id: 2, data: 'second' });
  });
});
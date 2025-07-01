/**
 * Tests for the EventBus component aligned with the implementation
 */

import { EventBus } from './event-bus.js';
import { SystemEvents } from '../utils/types.js';

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
    const stats = eventBus.getEventStats();
    
    // Should contain the events
    expect(stats.length).toBeGreaterThanOrEqual(2);
    
    // Find each event
    const event1Stat = stats.find(s => s.event === 'event1');
    const event2Stat = stats.find(s => s.event === 'event2');
    
    // Verify counts
    expect(event1Stat?.count).toBe(2);
    expect(event2Stat?.count).toBe(1);
  });
  
  test('should reset statistics', () => {
    // Emit a few events
    eventBus.emit('event1', { data: '1' });
    eventBus.emit('event2', { data: '2' });
    
    // Reset stats
    eventBus.resetStats();
    
    // Get statistics
    const stats = eventBus.getEventStats();
    
    // Should be empty
    expect(stats.length).toBe(0);
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
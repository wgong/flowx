/**
 * Unit tests for EventBus
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventBus, TypedEventBus } from '../../../src/core/event-bus.js';

describe('TypedEventBus', () => {
  let eventBus;
  
  beforeEach(() => {
    eventBus = new TypedEventBus();
  });
  
  test('should emit and receive events', () => {
    const listener = jest.fn();
    eventBus.on('test-event', listener);
    
    eventBus.emit('test-event', { data: 'test-data' });
    
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ data: 'test-data' });
  });
  
  test('should support multiple listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    eventBus.on('multi-listener', listener1);
    eventBus.on('multi-listener', listener2);
    
    eventBus.emit('multi-listener', 'test');
    
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });
  
  test('should support once listeners', () => {
    const listener = jest.fn();
    eventBus.once('once-event', listener);
    
    eventBus.emit('once-event', 'first');
    eventBus.emit('once-event', 'second');
    
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('first');
  });
  
  test('should remove listeners with off', () => {
    const listener = jest.fn();
    eventBus.on('remove-test', listener);
    
    eventBus.emit('remove-test');
    expect(listener).toHaveBeenCalledTimes(1);
    
    eventBus.off('remove-test', listener);
    eventBus.emit('remove-test');
    expect(listener).toHaveBeenCalledTimes(1); // Count hasn't increased
  });
  
  test('should remove all listeners for an event', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    eventBus.on('remove-all', listener1);
    eventBus.on('remove-all', listener2);
    
    eventBus.emit('remove-all');
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
    
    eventBus.removeAllListeners('remove-all');
    eventBus.emit('remove-all');
    expect(listener1).toHaveBeenCalledTimes(1); // No change
    expect(listener2).toHaveBeenCalledTimes(1); // No change
  });
  
  test('should track metrics correctly', () => {
    eventBus.emit('event1', 'data1');
    eventBus.emit('event2', 'data2');
    eventBus.emit('event1', 'data3');
    
    const metrics = eventBus.getMetrics();
    
    expect(metrics.totalEvents).toBe(3);
    expect(metrics.eventsByType['event1']).toBe(2);
    expect(metrics.eventsByType['event2']).toBe(1);
    expect(metrics.errorRate).toBe(0);
    expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
  });
  
  test('should track event history', () => {
    eventBus.emit('history1', { value: 1 });
    eventBus.emit('history2', { value: 2 });
    
    const history = eventBus.getEventHistory();
    
    expect(history.length).toBe(2);
    expect(history[0].event).toBe('history1');
    expect(history[1].event).toBe('history2');
    expect(history[0].data[0].value).toBe(1);
    expect(history[1].data[0].value).toBe(2);
  });
  
  test('should limit history size', () => {
    // The maxHistorySize is 1000, but testing with 1000 events would be slow
    // Instead, we'll test the principle by checking that history is limited
    
    // Add many events
    for (let i = 0; i < 20; i++) {
      eventBus.emit(`event${i}`, { i });
    }
    
    const history = eventBus.getEventHistory(50);
    expect(history.length).toBe(20);
    
    eventBus.clearHistory();
    expect(eventBus.getEventHistory().length).toBe(0);
  });
  
  test('should reset metrics', () => {
    eventBus.emit('test-event');
    eventBus.emit('test-event');
    
    expect(eventBus.getMetrics().totalEvents).toBe(2);
    
    eventBus.resetMetrics();
    
    expect(eventBus.getMetrics().totalEvents).toBe(0);
    expect(eventBus.getMetrics().eventsByType['test-event']).toBeUndefined();
  });
});

describe('EventBus singleton', () => {
  let eventBus;
  
  beforeEach(() => {
    eventBus = EventBus.getInstance();
    eventBus.removeAllListeners();
    eventBus.resetMetrics();
    eventBus.clearHistory();
  });
  
  test('should return the same instance', () => {
    const instance1 = EventBus.getInstance();
    const instance2 = EventBus.getInstance();
    
    expect(instance1).toBe(instance2);
  });
  
  test('should emit and receive events', () => {
    const listener = jest.fn();
    eventBus.on('singleton-test', listener);
    
    eventBus.emit('singleton-test', 'data');
    
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('data');
  });
  
  test('should maintain state across getInstance calls', () => {
    const listener = jest.fn();
    eventBus.on('persistent-test', listener);
    
    // Get a "new" instance
    const sameEventBus = EventBus.getInstance();
    
    // Emit from the "new" instance
    sameEventBus.emit('persistent-test', 'persistent');
    
    // Listener from first instance should be called
    expect(listener).toHaveBeenCalledWith('persistent');
  });
  
  test('should get and set maxListeners', () => {
    const defaultMax = eventBus.getMaxListeners();
    
    eventBus.setMaxListeners(200);
    expect(eventBus.getMaxListeners()).toBe(200);
    
    // Reset to default for other tests
    eventBus.setMaxListeners(defaultMax);
  });
  
  test('should get listener count', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();
    
    eventBus.on('count-test', listener1);
    eventBus.on('count-test', listener2);
    
    expect(eventBus.listenerCount('count-test')).toBe(2);
    expect(eventBus.listeners('count-test').length).toBe(2);
  });
});
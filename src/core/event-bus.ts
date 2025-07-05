/**
 * Event bus implementation with typed events
 */

import { EventEmitter } from 'node:events';
import { generateId } from "../utils/helpers.js";

export interface IEventBus {
  emit(event: string, data?: any): boolean;
  on(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  removeAllListeners(event?: string): this;
  getMaxListeners(): number;
  setMaxListeners(n: number): this;
  listeners(event: string): Function[];
  listenerCount(event: string): number;
}

export interface EventMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  averageProcessingTime: number;
  errorRate: number;
  lastEventTime: Date;
}

/**
 * Typed event bus with metrics and error handling
 */
export class TypedEventBus extends EventEmitter implements IEventBus {
  private metrics: EventMetrics;
  private eventHistory: Array<{ event: string; timestamp: Date; data?: any }> = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      averageProcessingTime: 0,
      errorRate: 0,
      lastEventTime: new Date()
    };
    
    this.setMaxListeners(100); // Increase default limit
  }

  emit(event: string, data?: any): boolean {
    const startTime = Date.now();
    
    try {
      // Update metrics
      this.metrics.totalEvents++;
      this.metrics.eventsByType[event] = (this.metrics.eventsByType[event] || 0) + 1;
      this.metrics.lastEventTime = new Date();
      
      // Add to history
      this.addToHistory(event, data);
      
      // Emit the event
      const result = super.emit(event, data);
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);
      
      return result;
      
    } catch (error) {
      this.metrics.errorRate++;
      console.error('Event emission error:', error);
      return false;
    }
  }

  /**
   * Get event metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit: number = 50): Array<{ event: string; timestamp: Date; data?: any }> {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      averageProcessingTime: 0,
      errorRate: 0,
      lastEventTime: new Date()
    };
  }

  private addToHistory(event: string, data?: any): void {
    this.eventHistory.push({
      event,
      timestamp: new Date(),
      data
    });
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private updateAverageProcessingTime(newTime: number): void {
    const currentAvg = this.metrics.averageProcessingTime;
    const totalEvents = this.metrics.totalEvents;
    
    // Calculate running average
    this.metrics.averageProcessingTime = 
      ((currentAvg * (totalEvents - 1)) + newTime) / totalEvents;
  }
}

/**
 * Global event bus for system-wide communication
 */
export class EventBus implements IEventBus {
  private static instance: EventBus;
  private typedBus: TypedEventBus;

  private constructor() {
    this.typedBus = new TypedEventBus();
  }

  /**
   * Gets the singleton instance of the event bus
   */
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(event: string, data?: any): boolean {
    return this.typedBus.emit(event, data);
  }

  on(event: string, listener: (...args: any[]) => void): this {
    this.typedBus.on(event, listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    this.typedBus.off(event, listener);
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    this.typedBus.once(event, listener);
    return this;
  }

  removeAllListeners(event?: string): this {
    this.typedBus.removeAllListeners(event);
    return this;
  }

  getMaxListeners(): number {
    return this.typedBus.getMaxListeners();
  }

  setMaxListeners(n: number): this {
    this.typedBus.setMaxListeners(n);
    return this;
  }

  listeners(event: string): Function[] {
    return this.typedBus.listeners(event);
  }

  listenerCount(event: string): number {
    return this.typedBus.listenerCount(event);
  }

  /**
   * Get event metrics
   */
  getMetrics(): EventMetrics {
    return this.typedBus.getMetrics();
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit?: number): Array<{ event: string; timestamp: Date; data?: any }> {
    return this.typedBus.getEventHistory(limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.typedBus.clearHistory();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.typedBus.resetMetrics();
  }
}

// Create and export a default instance
export const eventBus = EventBus.getInstance();
export default eventBus;
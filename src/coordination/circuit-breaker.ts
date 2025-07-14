/**
 * Circuit breaker pattern for fault tolerance
 */

import { EventEmitter } from 'events';
import type { IEventBus } from '../core/event-bus.js';
import type { ILogger } from '../core/logger.js';

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Number of successes before closing
  timeout: number; // Time in ms before attempting to close
  halfOpenLimit: number; // Max requests in half-open state
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  rejectedRequests: number;
  halfOpenRequests: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt?: Date;
  private halfOpenRequests = 0;
  private totalRequests = 0;
  private rejectedRequests = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig,
    private logger: ILogger,
    private eventBus?: IEventBus,
  ) {
    super();
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (!this.canExecute()) {
      this.rejectedRequests++;
      const error = new Error(`Circuit breaker '${this.name}' is ${this.state}`);
      this.logger.warn('Circuit breaker rejected request', {
        name: this.name,
        state: this.state,
        reason: 'Circuit breaker open'
      });
      throw error;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequests++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private canExecute(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
      
      case CircuitState.OPEN:
        if (this.nextAttempt && new Date() >= this.nextAttempt) {
          this.transitionTo(CircuitState.HALF_OPEN);
          return true;
        }
        return false;
      
      case CircuitState.HALF_OPEN:
        return this.halfOpenRequests < this.config.halfOpenLimit;
      
      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    switch (this.state) {
      case CircuitState.HALF_OPEN:
        if (this.successes >= this.config.successThreshold) {
          this.transitionTo(CircuitState.CLOSED);
        }
        break;
      
      case CircuitState.CLOSED:
        // Reset failure count on success
        this.failures = 0;
        break;
    }

    this.logger.debug('Circuit breaker success', {
      name: this.name,
      state: this.state,
      successes: this.successes,
      failures: this.failures
    });
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    switch (this.state) {
      case CircuitState.CLOSED:
        if (this.failures >= this.config.failureThreshold) {
          this.transitionTo(CircuitState.OPEN);
        }
        break;
      
      case CircuitState.HALF_OPEN:
        this.transitionTo(CircuitState.OPEN);
        break;
    }

    this.logger.warn('Circuit breaker failure', {
      name: this.name,
      state: this.state,
      failures: this.failures,
      threshold: this.config.failureThreshold
    });
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    switch (newState) {
      case CircuitState.OPEN:
        this.nextAttempt = new Date(Date.now() + this.config.timeout);
        this.logStateChange(`Circuit breaker '${this.name}' opened due to ${this.failures} failures`);
        break;
      
      case CircuitState.HALF_OPEN:
        this.halfOpenRequests = 0;
        this.successes = 0;
        this.logStateChange(`Circuit breaker '${this.name}' half-opened for testing`);
        break;
      
      case CircuitState.CLOSED:
        this.failures = 0;
        this.successes = 0;
        this.nextAttempt = undefined;
        this.logStateChange(`Circuit breaker '${this.name}' closed after ${this.successes} successes`);
        break;
    }

    // Emit state change event
    this.emit('stateChange', {
      name: this.name,
      oldState,
      newState,
      timestamp: new Date()
    });

    if (this.eventBus) {
      this.eventBus.emit('circuit_breaker:state_changed', {
        name: this.name,
        oldState,
        newState,
        metrics: this.getMetrics()
      });
    }
  }

  forceState(state: CircuitState): void {
    this.logger.info('Forcing circuit breaker state', {
      name: this.name,
      from: this.state,
      to: state
    });
    this.transitionTo(state);
  }

  getState(): CircuitState {
    return this.state;
  }

  getName(): string {
    return this.name;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests,
      halfOpenRequests: this.halfOpenRequests
    };
  }

  reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.halfOpenRequests = 0;
    this.totalRequests = 0;
    this.rejectedRequests = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttempt = undefined;
    this.transitionTo(CircuitState.CLOSED);
    
    this.logger.info('Circuit breaker reset', { name: this.name });
  }

  private logStateChange(message: string): void {
    this.logger.info(message, {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      rejectedRequests: this.rejectedRequests
    });
  }
}

export class CircuitBreakerManager extends EventEmitter {
  private breakers = new Map<string, CircuitBreaker>();

  constructor(
    private defaultConfig: CircuitBreakerConfig,
    private logger: ILogger,
    private eventBus?: IEventBus,
  ) {
    super();
  }

  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breakerConfig = { ...this.defaultConfig, ...config };
      const breaker = new CircuitBreaker(name, breakerConfig, this.logger, this.eventBus);
      
      // Forward breaker events
      breaker.on('stateChange', (data) => {
        this.emit('stateChange', data);
      });
      
      this.breakers.set(name, breaker);
      this.logger.info('Created circuit breaker', { name, config: breakerConfig });
    }
    
    return this.breakers.get(name)!;
  }

  async execute<T>(
    name: string, 
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const breaker = this.getBreaker(name, config);
    return breaker.execute(fn);
  }

  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    
    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }
    
    return metrics;
  }

  resetBreaker(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.reset();
      this.logger.info('Reset circuit breaker', { name });
    } else {
      this.logger.warn('Circuit breaker not found for reset', { name });
    }
  }

  resetAll(): void {
    for (const [name, breaker] of this.breakers) {
      breaker.reset();
    }
    this.logger.info('Reset all circuit breakers');
  }

  forceState(name: string, state: CircuitState): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.forceState(state);
    } else {
      this.logger.warn('Circuit breaker not found for state change', { name });
    }
  }

  getHealthStatus(): {
    healthy: boolean;
    openBreakers: string[];
    halfOpenBreakers: string[];
    totalBreakers: number;
  } {
    const openBreakers: string[] = [];
    const halfOpenBreakers: string[] = [];

    for (const [name, breaker] of this.breakers) {
      const state = breaker.getState();
      if (state === CircuitState.OPEN) {
        openBreakers.push(name);
      } else if (state === CircuitState.HALF_OPEN) {
        halfOpenBreakers.push(name);
      }
    }

    return {
      healthy: openBreakers.length === 0,
      openBreakers,
      halfOpenBreakers,
      totalBreakers: this.breakers.size
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Circuit Breaker Manager initialized', {
      defaultConfig: this.defaultConfig,
      totalBreakers: this.breakers.size
    });
  }

  async shutdown(): Promise<void> {
    this.logger.info('Circuit Breaker Manager shutting down');
    this.breakers.clear();
    this.removeAllListeners();
  }

  performMaintenance(): void {
    this.logger.debug('Performing circuit breaker maintenance');
    
    // Reset breakers that have been open for too long
    for (const [name, breaker] of this.breakers) {
      const metrics = breaker.getMetrics();
      if (metrics.state === CircuitState.OPEN && metrics.lastFailureTime) {
        const timeSinceFailure = Date.now() - metrics.lastFailureTime.getTime();
        if (timeSinceFailure > this.defaultConfig.timeout * 2) {
          this.logger.info('Auto-resetting circuit breaker after extended timeout', { name });
          breaker.reset();
        }
      }
    }
  }

  getOverallStats(): Record<string, number> {
    const allMetrics = this.getAllMetrics();
    const stats = {
      totalBreakers: this.breakers.size,
      openBreakers: 0,
      halfOpenBreakers: 0,
      closedBreakers: 0,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      rejectedRequests: 0
    };

    for (const metrics of Object.values(allMetrics)) {
      if (metrics.state === CircuitState.OPEN) stats.openBreakers++;
      else if (metrics.state === CircuitState.HALF_OPEN) stats.halfOpenBreakers++;
      else stats.closedBreakers++;

      stats.totalRequests += metrics.totalRequests;
      stats.totalFailures += metrics.failures;
      stats.totalSuccesses += metrics.successes;
      stats.rejectedRequests += metrics.rejectedRequests;
    }

    return stats;
  }
}
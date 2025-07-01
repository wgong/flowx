/**
 * Dependency Injection Container
 * Provides IoC for clean architecture and testability
 */

export interface ServiceDefinition<T = any> {
  factory: (...args: any[]) => T | Promise<T>;
  dependencies?: string[];
  singleton?: boolean;
  lazy?: boolean;
}

export interface ContainerConfig {
  enableCircularDependencyDetection?: boolean;
  enableMetrics?: boolean;
  maxResolutionDepth?: number;
}

export class Container {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, any>();
  private resolutionStack: string[] = [];
  private metrics = {
    resolutions: 0,
    cacheHits: 0,
    circularDependencies: 0
  };

  constructor(private config: ContainerConfig = {}) {
    this.config = {
      enableCircularDependencyDetection: true,
      enableMetrics: true,
      maxResolutionDepth: 50,
      ...config
    };
  }

  /**
   * Register a service with the container
   */
  register<T>(
    name: string, 
    definition: ServiceDefinition<T> | ((...args: any[]) => T)
  ): this {
    if (typeof definition === 'function') {
      definition = { factory: definition, singleton: true };
    }

    this.services.set(name, definition);
    return this;
  }

  /**
   * Register a singleton service
   */
  singleton<T>(name: string, factory: (...args: any[]) => T | Promise<T>): this {
    return this.register(name, { factory, singleton: true });
  }

  /**
   * Register a transient service (new instance each time)
   */
  transient<T>(name: string, factory: (...args: any[]) => T | Promise<T>): this {
    return this.register(name, { factory, singleton: false });
  }

  /**
   * Resolve a service by name
   */
  async resolve<T>(name: string): Promise<T> {
    this.metrics.resolutions++;

    // Check for circular dependencies
    if (this.config.enableCircularDependencyDetection && this.resolutionStack.includes(name)) {
      this.metrics.circularDependencies++;
      throw new Error(`Circular dependency detected: ${this.resolutionStack.join(' -> ')} -> ${name}`);
    }

    // Check resolution depth
    if (this.resolutionStack.length >= this.config.maxResolutionDepth!) {
      throw new Error(`Maximum resolution depth exceeded: ${this.config.maxResolutionDepth}`);
    }

    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service not registered: ${name}`);
    }

    // Return cached instance for singletons
    if (definition.singleton !== false && this.instances.has(name)) {
      this.metrics.cacheHits++;
      return this.instances.get(name);
    }

    this.resolutionStack.push(name);

    try {
      // Resolve dependencies
      const dependencies = [];
      if (definition.dependencies) {
        for (const depName of definition.dependencies) {
          dependencies.push(await this.resolve(depName));
        }
      }

      // Create instance
      const instance = await definition.factory(...dependencies);

      // Cache if singleton
      if (definition.singleton !== false) {
        this.instances.set(name, instance);
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all instances (useful for testing)
   */
  clear(): void {
    this.instances.clear();
    this.resolutionStack = [];
  }

  /**
   * Get container metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Create a child container with inherited services
   */
  createChild(): Container {
    const child = new Container(this.config);
    // Copy service definitions
    for (const [name, definition] of this.services) {
      child.services.set(name, definition);
    }
    return child;
  }
} 
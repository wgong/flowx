/**
 * Node.js compatible memory test utilities
 */

/**
 * Memory management utilities for tests in Node.js
 */
export class MemoryTestUtils {
  /**
   * Monitor memory usage during test execution
   */
  static async monitorMemory<T>(
    operation: () => Promise<T>,
    options: { sampleInterval?: number; maxSamples?: number } = {}
  ): Promise<{ result: T; memoryStats: Array<{ timestamp: number; heapUsed: number; external: number }> }> {
    const { sampleInterval = 100, maxSamples = 100 } = options;
    const memoryStats: Array<{ timestamp: number; heapUsed: number; external: number }> = [];
    
    // Start sampling
    const startMemory = process.memoryUsage();
    memoryStats.push({
      timestamp: Date.now(),
      heapUsed: startMemory.heapUsed,
      external: startMemory.external || 0
    });

    let monitoring = true;
    let sampleCount = 1;

    // Start memory monitoring
    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));
    
    // Start memory monitoring
    const monitoringPromise = (async () => {
      while (monitoring && sampleCount < maxSamples) {
        await delay(sampleInterval);
        const memInfo = process.memoryUsage();
        memoryStats.push({
          timestamp: Date.now(),
          heapUsed: memInfo.heapUsed,
          external: memInfo.external || 0,
        });
        sampleCount++;
      }
    })();

    try {
      const result = await operation();
      monitoring = false;
      await monitoringPromise;
      return { result, memoryStats };
    } catch (error) {
      monitoring = false;
      await monitoringPromise;
      throw error;
    }
  }

  /**
   * Trigger garbage collection (if available)
   */
  static async forceGC(): Promise<void> {
    // Node.js doesn't expose GC directly, but we can try to encourage it
    if (global.gc) {
      global.gc();
    }
    
    // Give time for GC to run
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Check for memory leaks by comparing before/after memory usage
   */
  static async checkMemoryLeak<T>(
    operation: () => Promise<T>,
    options: { threshold?: number; samples?: number } = {}
  ): Promise<{ result: T; memoryIncrease: number; leaked: boolean }> {
    const { threshold = 1024 * 1024, samples = 3 } = options; // 1MB threshold

    // Take baseline measurements
    await this.forceGC();
    const baselineMemory = this.getAverageMemoryUsage(samples);

    // Run operation
    const result = await operation();

    // Take post-operation measurements
    await this.forceGC();
    const postMemory = this.getAverageMemoryUsage(samples);

    const memoryIncrease = postMemory - baselineMemory;
    const leaked = memoryIncrease > threshold;

    return { result, memoryIncrease, leaked };
  }

  private static getAverageMemoryUsage(samples: number): number {
    let total = 0;
    for (let i = 0; i < samples; i++) {
      total += process.memoryUsage().heapUsed;
    }
    return total / samples;
  }
}

export default MemoryTestUtils;
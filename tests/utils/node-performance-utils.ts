/**
 * Node.js compatible performance test utilities
 */

/**
 * Performance testing utilities for Node.js
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of operation
   */
  static async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /**
   * Run performance benchmark with multiple iterations
   */
  static async benchmark<T>(
    operation: () => Promise<T>,
    options: {
      iterations?: number;
      warmupIterations?: number;
      concurrency?: number;
    } = {}
  ): Promise<{
    results: T[];
    stats: {
      mean: number;
      median: number;
      min: number;
      max: number;
      stdDev: number;
      p95: number;
      p99: number;
    };
  }> {
    const { iterations = 100, warmupIterations = 10, concurrency = 1 } = options;

    // Warmup
    for (let i = 0; i < warmupIterations; i++) {
      await operation();
    }

    // Run benchmark
    const durations: number[] = [];
    const results: T[] = [];

    const runBatch = async (batchSize: number) => {
      const promises = Array.from({ length: batchSize }, async () => {
        const start = Date.now();
        const result = await operation();
        const duration = Date.now() - start;
        return { result, duration };
      });

      const batchResults = await Promise.all(promises);
      
      for (const { result, duration } of batchResults) {
        results.push(result);
        durations.push(duration);
      }
    };

    // Run in batches based on concurrency
    const batches = Math.ceil(iterations / concurrency);
    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(concurrency, iterations - i * concurrency);
      await runBatch(batchSize);
    }

    // Calculate statistics
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const median = sortedDurations[Math.floor(sortedDurations.length / 2)];
    const min = sortedDurations[0];
    const max = sortedDurations[sortedDurations.length - 1];
    
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    
    const p95 = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)];

    return {
      results,
      stats: { mean, median, min, max, stdDev, p95, p99 }
    };
  }

  /**
   * Load testing utility
   */
  static async loadTest<T>(
    operation: () => Promise<T>,
    options: {
      duration?: number; // ms
      rampUpTime?: number; // ms
      maxConcurrency?: number;
      requestsPerSecond?: number;
    } = {}
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    errors: Error[];
  }> {
    const {
      duration = 30000,
      rampUpTime = 5000,
      maxConcurrency = 10,
      requestsPerSecond = 10
    } = options;

    const results: Array<{ success: boolean; duration: number; error?: Error }> = [];
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    let currentConcurrency = 1;
    const targetInterval = 1000 / requestsPerSecond;

    const rampUpIncrement = (maxConcurrency - 1) / (rampUpTime / 1000);
    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    const runRequest = async () => {
      const requestStart = Date.now();
      try {
        await operation();
        results.push({ success: true, duration: Date.now() - requestStart });
      } catch (error) {
        results.push({
          success: false,
          duration: Date.now() - requestStart,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    };

    const activeRequests = new Set<Promise<void>>();

    while (Date.now() < endTime) {
      // Ramp up concurrency
      const elapsed = Date.now() - startTime;
      if (elapsed < rampUpTime) {
        currentConcurrency = Math.min(
          maxConcurrency,
          1 + Math.floor((elapsed / 1000) * rampUpIncrement)
        );
      } else {
        currentConcurrency = maxConcurrency;
      }

      // Start new requests up to current concurrency
      while (activeRequests.size < currentConcurrency && Date.now() < endTime) {
        const requestPromise = runRequest().finally(() => {
          activeRequests.delete(requestPromise);
        });
        
        activeRequests.add(requestPromise);
        
        // Wait for interval
        await delay(targetInterval);
      }
    }

    // Wait for all active requests to complete
    await Promise.all(activeRequests);

    // Calculate results
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / (successfulRequests || 1);
    const actualDuration = Date.now() - startTime;
    const actualRequestsPerSecond = totalRequests / (actualDuration / 1000);
    const errors = results.filter(r => r.error).map(r => r.error!);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      requestsPerSecond: actualRequestsPerSecond,
      errors,
    };
  }
}

export default PerformanceTestUtils;
/**
 * Node.js compatible async test utilities
 */

/**
 * Test utilities for async operations in Node.js
 */
export class AsyncTestUtils {
  /**
   * Wait for condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number; message?: string } = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100, message = 'Condition not met' } = options;
    const start = Date.now();

    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await delay(interval);
    }

    throw new Error(`${message} (timeout: ${timeout}ms)`);
  }

  /**
   * Wait for multiple conditions to be true
   */
  static async waitForAll(
    conditions: Array<() => boolean | Promise<boolean>>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    await this.waitFor(
      async () => {
        const results = await Promise.all(conditions.map(c => c()));
        return results.every(r => r);
      },
      options
    );
  }

  /**
   * Wait for any of the conditions to be true
   */
  static async waitForAny(
    conditions: Array<() => boolean | Promise<boolean>>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    await this.waitFor(
      async () => {
        const results = await Promise.all(conditions.map(c => c()));
        return results.some(r => r);
      },
      options
    );
  }

  /**
   * Race a promise against a timeout
   */
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(message || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Retry operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelay = 100,
      maxDelay = 5000,
      backoffFactor = 2
    } = options;

    let lastError: Error | null = null;
    let currentDelay = initialDelay;

    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          break;
        }

        await delay(Math.min(currentDelay, maxDelay));
        currentDelay *= backoffFactor;
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }
  
  /**
   * Simple delay function
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default AsyncTestUtils;
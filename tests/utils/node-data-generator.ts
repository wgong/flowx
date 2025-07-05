/**
 * Node.js compatible test data generators
 */

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate random string
   */
  static randomString(length = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random number in range
   */
  static randomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random boolean
   */
  static randomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  /**
   * Generate array of random data
   */
  static randomArray<T>(generator: () => T, length?: number): T[] {
    const arrayLength = length || this.randomNumber(1, 10);
    return Array.from({ length: arrayLength }, generator);
  }

  /**
   * Generate random object
   */
  static randomObject(schema: Record<string, () => any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, generator] of Object.entries(schema)) {
      result[key] = generator();
    }
    return result;
  }

  /**
   * Generate large dataset for performance testing
   */
  static largeDataset(size: number): Array<{ id: string; name: string; value: number; data: string }> {
    return Array.from({ length: size }, (_, i) => ({
      id: `item-${i}`,
      name: this.randomString(20),
      value: this.randomNumber(1, 1000),
      data: this.randomString(100),
    }));
  }
}

export default TestDataGenerator;
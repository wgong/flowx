/**
 * Simple test suite to validate test infrastructure
 */

describe('Basic Tests', () => {
  test('simple math operations', () => {
    expect(1 + 1).toBe(2);
    expect(10 - 5).toBe(5);
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
  });

  test('string operations', () => {
    expect('hello ' + 'world').toBe('hello world');
    expect('hello world'.split(' ')).toEqual(['hello', 'world']);
    expect('hello world'.includes('hello')).toBe(true);
  });

  test('array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr[0]).toBe(1);
    expect(arr.map(x => x * 2)).toEqual([2, 4, 6, 8, 10]);
  });
});
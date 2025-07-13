/**
 * Test infrastructure validation
 */

import { jest } from '@jest/globals';
import { 
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
  spy,
  assertSpyCalls,
  FakeTime,
  createDeferred,
  waitFor,
  captureConsole
} from '../test.utils.ts';

describe('Test Infrastructure', () => {
  describe('Assertions', () => {
    it('should handle assertEquals', () => {
      assertEquals(1 + 1, 2);
      assertEquals('hello', 'hello');
      assertEquals([1, 2, 3], [1, 2, 3]);
    });

    it('should handle assertExists', () => {
      assertExists('hello');
      assertExists(123);
      assertExists({ key: 'value' });
    });

    it('should handle assertThrows', () => {
      assertThrows(() => {
        throw new Error('test error');
      });
    });

    it('should handle assertRejects', async () => {
      await assertRejects(async () => {
        throw new Error('async error');
      });
      
      await assertRejects(async () => {
        throw new Error('specific error');
      }, Error, 'specific error');
    });
  });

  describe('Spies and Mocks', () => {
    it('should create and track spies', () => {
      const mockFn = spy(() => 'result');
      
      const result = mockFn('arg1', 'arg2');
      
      assertEquals(result, 'result');
      assertSpyCalls(mockFn, 1);
    });

    it('should track multiple calls', () => {
      const mockFn = spy((x: number) => x * 2);
      
      mockFn(5);
      mockFn(10);
      mockFn(15);
      
      assertSpyCalls(mockFn, 3);
      expect(mockFn).toHaveBeenCalledWith(5);
      expect(mockFn).toHaveBeenCalledWith(10);
      expect(mockFn).toHaveBeenCalledWith(15);
    });
  });

  describe('FakeTime', () => {
    it('should mock time correctly', () => {
      const startTime = 1000000;
      const time = new FakeTime(startTime);
      
      assertEquals(time.now(), startTime);
      
      time.tick(5000);
      assertEquals(time.now(), startTime + 5000);
      
      time.restore();
    });

    it('should support async tick', async () => {
      const time = new FakeTime(0);
      
      time.tick(1000);
      await time.tickAsync(2000);
      
      assertEquals(time.now(), 3000);
      
      time.restore();
    });
  });

  describe('Utility Functions', () => {
    it('should create deferred promises', async () => {
      const deferred = createDeferred<string>();
      
      // Resolve the promise
      setTimeout(() => deferred.resolve('test value'), 10);
      
      const result = await deferred.promise;
      assertEquals(result, 'test value');
    });

    it('should wait for conditions', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };
      
      await waitFor(condition, { timeout: 1000, interval: 10 });
      
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should capture console output', () => {
      const capture = captureConsole();
      
      console.log('test message 1');
      console.error('error message');
      console.log('test message 2');
      
      const output = capture.getOutput();
      const errors = capture.getErrors();
      
      capture.restore();
      
      expect(output).toContain('test message 1');
      expect(output).toContain('test message 2');
      expect(errors).toContain('error message');
    });
  });
}); 
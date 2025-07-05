/**
 * Mock for Deno modules used in tests
 */

// Mock for testing modules
const mockDescribe = (name, fn) => {
  describe(name, fn);
};

const mockIt = (name, fn) => {
  test(name, fn);
};

const mockBeforeEach = (fn) => {
  beforeEach(fn);
};

const mockAfterEach = (fn) => {
  afterEach(fn);
};

const mockBeforeAll = (fn) => {
  beforeAll(fn);
};

const mockAfterAll = (fn) => {
  afterAll(fn);
};

// Mock for assertions
const mockAssertEquals = (actual, expected, msg) => {
  expect(actual).toEqual(expected);
};

const mockAssertExists = (actual, msg) => {
  expect(actual).toBeTruthy();
};

const mockAssertThrows = (fn, errorClass, msgIncludes) => {
  expect(fn).toThrow();
};

const mockAssertRejects = async (fn, errorClass, msgIncludes) => {
  await expect(fn).rejects.toThrow();
};

const mockAssertStringIncludes = (actual, expected, msg) => {
  expect(actual).toContain(expected);
};

// Mock for spy and stub
const mockSpy = jest.fn;

const mockStub = (obj, method) => {
  const original = obj[method];
  const stub = jest.spyOn(obj, method).mockImplementation(() => {});
  stub.restore = () => {
    obj[method] = original;
  };
  return stub;
};

const mockAssertSpyCall = (spy, callIndex, args) => {
  expect(spy.mock.calls[callIndex]).toEqual(args);
};

const mockAssertSpyCalls = (spy, expectedCalls) => {
  expect(spy.mock.calls.length).toBe(expectedCalls);
};

// Mock for fake time
class MockFakeTime {
  constructor() {
    this.originalNow = Date.now;
    this.originalSetTimeout = global.setTimeout;
    this.originalClearTimeout = global.clearTimeout;
    this.originalSetInterval = global.setInterval;
    this.originalClearInterval = global.clearInterval;
    this.now = Date.now();
    this.timers = [];
  }

  tick(ms) {
    this.now += ms;
    Date.now = () => this.now;
    
    const expired = this.timers.filter(timer => timer.expiry <= this.now);
    this.timers = this.timers.filter(timer => timer.expiry > this.now);
    
    expired.forEach(timer => {
      if (timer.active) {
        timer.callback();
      }
    });
  }

  restore() {
    Date.now = this.originalNow;
    global.setTimeout = this.originalSetTimeout;
    global.clearTimeout = this.originalClearTimeout;
    global.setInterval = this.originalSetInterval;
    global.clearInterval = this.originalClearInterval;
  }
}

// Mock delay function
const mockDelay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports = {
  'https://deno.land/std@0.208.0/assert/mod.ts': {
    assertEquals: mockAssertEquals,
    assertExists: mockAssertExists,
    assertThrows: mockAssertThrows,
    assertRejects: mockAssertRejects,
    assertStringIncludes: mockAssertStringIncludes,
  },
  'https://deno.land/std@0.220.0/assert/mod.ts': {
    assertEquals: mockAssertEquals,
    assertExists: mockAssertExists,
    assertThrows: mockAssertThrows,
    assertRejects: mockAssertRejects,
    assertStringIncludes: mockAssertStringIncludes,
  },
  'https://deno.land/std@0.208.0/testing/bdd.ts': {
    describe: mockDescribe,
    it: mockIt,
    beforeEach: mockBeforeEach,
    afterEach: mockAfterEach,
    beforeAll: mockBeforeAll,
    afterAll: mockAfterAll,
  },
  'https://deno.land/std@0.220.0/testing/bdd.ts': {
    describe: mockDescribe,
    it: mockIt,
    beforeEach: mockBeforeEach,
    afterEach: mockAfterEach,
    beforeAll: mockBeforeAll,
    afterAll: mockAfterAll,
  },
  'https://deno.land/std@0.208.0/testing/mock.ts': {
    spy: mockSpy,
    stub: mockStub,
    assertSpyCall: mockAssertSpyCall,
    assertSpyCalls: mockAssertSpyCalls,
  },
  'https://deno.land/std@0.220.0/testing/mock.ts': {
    spy: mockSpy,
    stub: mockStub,
    assertSpyCall: mockAssertSpyCall,
    assertSpyCalls: mockAssertSpyCalls,
  },
  'https://deno.land/std@0.208.0/testing/time.ts': {
    FakeTime: MockFakeTime,
  },
  'https://deno.land/std@0.220.0/testing/time.ts': {
    FakeTime: MockFakeTime,
  },
  'https://deno.land/std@0.208.0/async/delay.ts': {
    delay: mockDelay
  },
  'https://deno.land/std@0.220.0/async/delay.ts': {
    delay: mockDelay
  },
};
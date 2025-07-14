/**
 * Mock for sql.js module
 */

module.exports = {
  Database: jest.fn(() => ({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    exec: jest.fn(),
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      finalize: jest.fn()
    })),
    close: jest.fn()
  })),
  default: {
    Database: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      exec: jest.fn(),
      prepare: jest.fn(() => ({
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn(),
        finalize: jest.fn()
      })),
      close: jest.fn()
    }))
  }
}; 
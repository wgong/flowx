/**
 * Mock for ipaddr.js module
 */

module.exports = {
  isValid: jest.fn(() => true),
  process: jest.fn((addr) => addr),
  IPv4: {
    isValid: jest.fn(() => true),
    parse: jest.fn((addr) => ({ toString: () => addr }))
  },
  IPv6: {
    isValid: jest.fn(() => true),
    parse: jest.fn((addr) => ({ toString: () => addr }))
  }
}; 
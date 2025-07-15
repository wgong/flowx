/**
 * Manual mock for node:child_process module
 */

const mockExec = jest.fn((cmd, callback) => {
  if (callback) {
    // For execAsync (promisified), callback expects (error, stdout, stderr)
    callback(null, '<html><body><h1>Test Page</h1></body></html>', '');
  }
  return {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    on: jest.fn(),
  };
});

module.exports = {
  exec: mockExec,
}; 
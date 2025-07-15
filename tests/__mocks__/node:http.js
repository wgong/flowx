/**
 * Manual mock for node:http module
 */

const mockRequest = jest.fn((url, options, callback) => {
  const req = {
    on: jest.fn((event, handler) => {
      // Don't trigger error events in successful test cases
      if (event === 'error') {
        // Store the error handler but don't call it for successful cases
      }
    }),
    write: jest.fn(),
    end: jest.fn(() => {
      // Simulate async response
      setImmediate(() => {
        const res = {
          statusCode: 200,
          statusMessage: 'OK',
          headers: { 'content-type': 'application/json' },
          on: jest.fn((event, handler) => {
            if (event === 'data') {
              setImmediate(() => handler(Buffer.from(JSON.stringify({ success: true, data: 'test' }))));
            }
            if (event === 'end') {
              setImmediate(() => handler());
            }
          }),
        };
        
        if (callback) {
          callback(res);
        }
      });
    }),
  };
  
  return req;
});

module.exports = {
  request: mockRequest,
}; 
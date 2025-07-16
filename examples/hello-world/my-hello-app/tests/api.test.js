const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  // Test the hello endpoint with default name
  test('GET /api/hello should return default greeting', async () => {
    const response = await request(app).get('/api/hello');
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Hello, World!');
    expect(response.body).toHaveProperty('timestamp');
  });

  // Test the hello endpoint with custom name
  test('GET /api/hello?name=Claude should return personalized greeting', async () => {
    const response = await request(app).get('/api/hello?name=Claude');
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Hello, Claude!');
    expect(response.body).toHaveProperty('timestamp');
  });

  // Test health check endpoint
  test('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });
});
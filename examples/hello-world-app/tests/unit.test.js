const request = require('supertest');
const app = require('../server');

describe('Hello World API', () => {
    test('GET /api/greeting should return greeting', async () => {
        const response = await request(app)
            .get('/api/greeting?name=Test&lang=en')
            .expect(200);
        
        expect(response.body.message).toBe('Hello, Test!');
        expect(response.body.language).toBe('en');
        expect(response.body.recipient).toBe('Test');
    });
    
    test('GET /api/greeting should default to World', async () => {
        const response = await request(app)
            .get('/api/greeting')
            .expect(200);
        
        expect(response.body.message).toBe('Hello, World!');
        expect(response.body.recipient).toBe('World');
    });
    
    test('GET /api/info should return app info', async () => {
        const response = await request(app)
            .get('/api/info')
            .expect(200);
        
        expect(response.body.name).toBe('Hello World App');
        expect(response.body.agents).toBe(12);
        expect(Array.isArray(response.body.technologies)).toBe(true);
    });
    
    test('GET /health should return health status', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);
        
        expect(response.body.status).toBe('healthy');
        expect(response.body.timestamp).toBeDefined();
    });
});

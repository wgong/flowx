const request = require('supertest');
const app = require('../server');

describe('Integration Tests', () => {
    test('Full greeting workflow', async () => {
        // Test English greeting
        const enResponse = await request(app)
            .get('/api/greeting?name=Integration&lang=en')
            .expect(200);
        
        expect(enResponse.body.message).toBe('Hello, Integration!');
        
        // Test Spanish greeting
        const esResponse = await request(app)
            .get('/api/greeting?name=Integración&lang=es')
            .expect(200);
        
        expect(esResponse.body.message).toBe('¡Hola, Integración!');
    });
    
    test('API endpoints respond correctly', async () => {
        const endpoints = ['/health', '/api/info', '/api/greeting'];
        
        for (const endpoint of endpoints) {
            await request(app)
                .get(endpoint)
                .expect(200);
        }
    });
    
    test('Static files are served', async () => {
        await request(app)
            .get('/')
            .expect(200)
            .expect('Content-Type', /html/);
    });
});

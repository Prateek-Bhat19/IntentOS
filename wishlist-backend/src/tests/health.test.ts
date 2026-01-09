import request from 'supertest';
import app from '../app'; // Assuming you export 'app' from src/app.ts

describe('Health Check API', () => {
    it('should return 200 OK', async () => {
        const res = await request(app).get('/health'); // Adjust route if needed
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok'); // Adjust based on your actual response
    });
});

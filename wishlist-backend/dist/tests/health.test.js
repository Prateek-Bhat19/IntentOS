"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app")); // Assuming you export 'app' from src/app.ts
describe('Health Check API', () => {
    it('should return 200 OK', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/health'); // Adjust route if needed
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok'); // Adjust based on your actual response
    });
});

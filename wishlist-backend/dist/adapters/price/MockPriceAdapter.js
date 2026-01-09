"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockPriceAdapter = void 0;
/**
 * Mock price adapter for development and testing
 */
class MockPriceAdapter {
    constructor() {
        this.name = 'Mock';
    }
    canHandle(url) {
        // Mock adapter can handle any URL
        return true;
    }
    async checkPrice(url) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        const price = Math.floor(Math.random() * 10000) + 1000;
        const originalPrice = price + Math.floor(Math.random() * 2000);
        return {
            success: true,
            data: {
                price,
                currency: 'INR',
                availability: Math.random() > 0.1 ? 'IN_STOCK' : 'OUT_OF_STOCK',
                checkedAt: new Date().toISOString(),
                source: this.name,
                originalPrice,
            },
        };
    }
}
exports.MockPriceAdapter = MockPriceAdapter;

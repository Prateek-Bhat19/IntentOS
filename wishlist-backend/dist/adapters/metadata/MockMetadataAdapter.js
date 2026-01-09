"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockMetadataAdapter = void 0;
/**
 * Mock metadata adapter for development and testing
 */
class MockMetadataAdapter {
    constructor() {
        this.name = 'Mock';
    }
    canHandle(url) {
        // Mock adapter can handle any URL
        return true;
    }
    async fetchMetadata(url) {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
            success: true,
            data: {
                title: 'Mock Product Title',
                description: 'This is a mock product description for testing',
                imageUrl: 'https://via.placeholder.com/300',
                price: Math.floor(Math.random() * 10000) + 1000,
                currency: 'INR',
                availability: 'IN_STOCK',
                brand: 'Mock Brand',
                source: this.name,
                fetchedAt: new Date().toISOString(),
                rawData: {
                    mockUrl: url,
                    mockData: true,
                },
            },
        };
    }
}
exports.MockMetadataAdapter = MockMetadataAdapter;

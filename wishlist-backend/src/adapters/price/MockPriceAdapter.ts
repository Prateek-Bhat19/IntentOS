import { IPriceAdapter, PriceCheckResult } from './IPriceAdapter';

/**
 * Mock price adapter for development and testing
 */
export class MockPriceAdapter implements IPriceAdapter {
  readonly name = 'Mock';

  canHandle(url: string): boolean {
    // Mock adapter can handle any URL
    return true;
  }

  async checkPrice(url: string): Promise<PriceCheckResult> {
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

import { IPriceAdapter } from './IPriceAdapter';
import { MockPriceAdapter } from './MockPriceAdapter';
import { OpenGraphPriceAdapter } from './OpenGraphPriceAdapter';
import { AmazonPriceAdapter } from './AmazonPriceAdapter';
import { FlipkartPriceAdapter } from './FlipkartPriceAdapter';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';

/**
 * Factory for creating and managing price adapters.
 *
 * Priority order:
 * 1. AmazonPriceAdapter   — Puppeteer+Stealth for amazon.in / amazon.com
 * 2. FlipkartPriceAdapter — Puppeteer+Stealth for flipkart.com
 * 3. OpenGraphPriceAdapter — HTML scraping fallback for other sites
 * 4. MockPriceAdapter      — dev / testing
 */
export class PriceAdapterFactory {
  private static adapters: IPriceAdapter[] = [];
  private static initialized = false;

  /**
   * Initialize all available adapters based on configuration
   */
  static initialize() {
    if (this.initialized) {
      logger.warn('PriceAdapterFactory already initialized');
      return;
    }

    // Always include mock adapter
    this.adapters.push(new MockPriceAdapter());

    // Add real adapters based on environment
    if (adapterConfig.enableRealAdapters) {
      logger.info('Real price adapters enabled');

      // Site-specific Puppeteer scrapers (higher priority — bypass bot detection)
      this.adapters.push(new AmazonPriceAdapter());
      this.adapters.push(new FlipkartPriceAdapter());

      // OpenGraph HTML scraping as a generic fallback for other sites
      this.adapters.push(new OpenGraphPriceAdapter());
    } else {
      logger.info('Using mock price adapters only');
    }

    this.initialized = true;
    logger.info(
      { adapters: this.adapters.map((a) => a.name) },
      'PriceAdapterFactory initialized'
    );
  }

  /**
   * Get the best adapter for a given URL
   */
  static getAdapter(url: string): IPriceAdapter {
    if (!this.initialized) {
      this.initialize();
    }

    // Try specific adapters first
    const specificAdapter = this.adapters.find(
      (adapter) => adapter.name !== 'Mock' && adapter.canHandle(url)
    );

    if (specificAdapter) {
      logger.debug({ adapter: specificAdapter.name, url }, 'Using specific price adapter');
      return specificAdapter;
    }

    // Fallback to Mock
    const mockAdapter = this.adapters.find((adapter) => adapter.name === 'Mock')!;
    logger.debug({ adapter: mockAdapter.name, url }, 'Using mock price adapter');
    return mockAdapter;
  }

  /**
   * Get all registered adapters
   */
  static getAllAdapters(): IPriceAdapter[] {
    if (!this.initialized) {
      this.initialize();
    }
    return [...this.adapters];
  }

  /**
   * Reset factory (useful for testing)
   */
  static reset() {
    this.adapters = [];
    this.initialized = false;
  }
}

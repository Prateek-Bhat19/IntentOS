import { IPriceAdapter } from './IPriceAdapter';
import { MockPriceAdapter } from './MockPriceAdapter';
import { OpenGraphPriceAdapter } from './OpenGraphPriceAdapter';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';

/**
 * Factory for creating and managing price adapters
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
      
      // Add OpenGraph price adapter (universal fallback)
      this.adapters.push(new OpenGraphPriceAdapter());
      
      // TODO: Add real price adapters when implemented
      // if (adapterConfig.canopyApiKey) {
      //   this.adapters.push(new CanopyPriceAdapter());
      // }
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

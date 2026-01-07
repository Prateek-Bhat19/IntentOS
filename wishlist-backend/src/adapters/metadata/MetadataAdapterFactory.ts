import { IMetadataAdapter } from './IMetadataAdapter';
import { MockMetadataAdapter } from './MockMetadataAdapter';
import { OpenGraphAdapter } from './OpenGraphAdapter';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';

/**
 * Factory for creating and managing metadata adapters
 * Implements adapter selection based on URL and configuration
 */
export class MetadataAdapterFactory {
  private static adapters: IMetadataAdapter[] = [];
  private static initialized = false;

  /**
   * Initialize all available adapters based on configuration
   */
  static initialize() {
    if (this.initialized) {
      logger.warn('MetadataAdapterFactory already initialized');
      return;
    }

    // Always include mock adapter
    this.adapters.push(new MockMetadataAdapter());

    // Add real adapters based on environment
    if (adapterConfig.enableRealAdapters) {
      logger.info('Real adapters enabled');
      
      // Add OpenGraph adapter (universal fallback)
      this.adapters.push(new OpenGraphAdapter());
      
      // TODO: Add specific adapters when API keys are available
      // if (adapterConfig.canopyApiKey) {
      //   this.adapters.push(new CanopyAdapter());
      // }
    } else {
      logger.info('Using mock adapters only');
    }

    this.initialized = true;
    logger.info(
      { adapters: this.adapters.map((a) => a.name) },
      'MetadataAdapterFactory initialized'
    );
  }

  /**
   * Get the best adapter for a given URL
   * Priority: Specific adapter (Canopy/Amazon/Flipkart) > Generic (OpenGraph) > Mock
   */
  static getAdapter(url: string): IMetadataAdapter {
    if (!this.initialized) {
      this.initialize();
    }

    // Try specific adapters first (not Mock or OpenGraph)
    const specificAdapter = this.adapters.find(
      (adapter) =>
        adapter.name !== 'OpenGraph' &&
        adapter.name !== 'Mock' &&
        adapter.canHandle(url)
    );

    if (specificAdapter) {
      logger.debug({ adapter: specificAdapter.name, url }, 'Using specific adapter');
      return specificAdapter;
    }

    // Fallback to OpenGraph
    const openGraphAdapter = this.adapters.find(
      (adapter) => adapter.name === 'OpenGraph' && adapter.canHandle(url)
    );

    if (openGraphAdapter) {
      logger.debug({ adapter: openGraphAdapter.name, url }, 'Using OpenGraph adapter');
      return openGraphAdapter;
    }

    // Last resort: Mock
    const mockAdapter = this.adapters.find((adapter) => adapter.name === 'Mock')!;
    logger.debug({ adapter: mockAdapter.name, url }, 'Using mock adapter');
    return mockAdapter;
  }

  /**
   * Get all registered adapters
   */
  static getAllAdapters(): IMetadataAdapter[] {
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

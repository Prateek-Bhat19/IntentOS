import { IMetadataAdapter, MetadataFetchResult } from './IMetadataAdapter';
import { MockMetadataAdapter } from './MockMetadataAdapter';
import { OpenGraphAdapter } from './OpenGraphAdapter';
import { CanopyAdapter } from './CanopyAdapter';
import { AmazonScraperAdapter } from './AmazonScraperAdapter';
import { FlipkartScraperAdapter } from './FlipkartScraperAdapter';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';
import { RateLimiters } from '../utils/rateLimiter';
import { getCachedMetadata, setCachedMetadata } from '../utils/productCache';

/**
 * Wrapper that adds rate limiting and caching to any metadata adapter
 */
class RateLimitedCachedMetadataAdapter implements IMetadataAdapter {
  constructor(
    private adapter: IMetadataAdapter,
    private rateLimiterName: keyof typeof RateLimiters
  ) {}

  get name(): string {
    return this.adapter.name;
  }

  canHandle(url: string): boolean {
    return this.adapter.canHandle(url);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    // 1. Check cache first
    const cached = await getCachedMetadata(url);
    if (cached) {
      logger.info(
        { adapter: this.name, url },
        'Returning cached metadata'
      );
      return {
        success: true,
        data: cached,
      };
    }

    // 2. Check rate limit
    const rateLimiter = RateLimiters[this.rateLimiterName];
    try {
      await rateLimiter.acquire();
    } catch (error: any) {
      logger.warn(
        { adapter: this.name, url, error: error.message },
        'Rate limit exceeded'
      );
      return {
        success: false,
        error,
      };
    }

    // 3. Fetch from adapter
    logger.info(
      { adapter: this.name, url },
      'Fetching metadata from adapter'
    );
    const result = await this.adapter.fetchMetadata(url);

    // 4. Cache successful results
    if (result.success && result.data) {
      await setCachedMetadata(url, result.data);
    }

    return result;
  }
}

/**
 * Factory for creating and managing metadata adapters
 * Implements adapter selection based on URL and configuration
 * 
 * Priority order:
 * 1. CanopyAdapter (if API key + supported URL)
 * 2. AmazonScraperAdapter (if Amazon URL)
 * 3. FlipkartScraperAdapter (if Flipkart URL)
 * 4. OpenGraphAdapter (universal fallback)
 * 5. MockAdapter (dev/testing)
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

    // Add real adapters based on environment
    if (adapterConfig.enableRealAdapters) {
      logger.info('Real adapters enabled');
      
      // Add Canopy API adapter (highest priority for supported sites)
      if (adapterConfig.canopyApiKey) {
        this.adapters.push(
          new RateLimitedCachedMetadataAdapter(
            new CanopyAdapter(),
            'Canopy'
          )
        );
        logger.info('Canopy API adapter registered with rate limiting');
      } else {
        logger.warn('Canopy API key not configured, skipping Canopy adapter');
      }
      
      // Add site-specific scrapers
      this.adapters.push(
        new RateLimitedCachedMetadataAdapter(
          new AmazonScraperAdapter(),
          'AmazonScraper'
        )
      );
      this.adapters.push(
        new RateLimitedCachedMetadataAdapter(
          new FlipkartScraperAdapter(),
          'FlipkartScraper'
        )
      );
      
      // Add OpenGraph as universal fallback
      this.adapters.push(
        new RateLimitedCachedMetadataAdapter(
          new OpenGraphAdapter(),
          'OpenGraph'
        )
      );
      
      logger.info('All scraper adapters registered with rate limiting and caching');
    } else {
      // Only use mock adapter when real adapters are disabled
      logger.info('Using mock adapters only');
      this.adapters.push(
        new RateLimitedCachedMetadataAdapter(
          new MockMetadataAdapter(),
          'Mock'
        )
      );
    }

    this.initialized = true;
    logger.info(
      { adapters: this.adapters.map((a) => a.name) },
      'MetadataAdapterFactory initialized'
    );
  }

  /**
   * Get the best adapter for a given URL
   * Priority: Canopy > Site-specific scrapers > OpenGraph > Mock
   */
  static getAdapter(url: string): IMetadataAdapter {
    if (!this.initialized) {
      this.initialize();
    }

    // Try all adapters in order, return first that can handle the URL
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url)) {
        logger.debug(
          { adapter: adapter.name, url },
          'Selected adapter'
        );
        return adapter;
      }
    }

    // Fallback to Mock if nothing else works (shouldn't happen)
    const mockAdapter = this.adapters.find((adapter) => adapter.name === 'Mock')!;
    logger.warn({ url }, 'No adapter found, using Mock');
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

import { IMetadataAdapter, MetadataFetchResult } from './IMetadataAdapter';
import { MockMetadataAdapter } from './MockMetadataAdapter';
import { OpenGraphAdapter } from './OpenGraphAdapter';
import { CanopyAdapter } from './CanopyAdapter';
import { AmazonPuppeteerAdapter } from './AmazonPuppeteerAdapter';
import { FlipkartPuppeteerAdapter } from './FlipkartPuppeteerAdapter';
import { PlaywrightAdapter } from './PlaywrightAdapter';
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

    // 4. Cache successful results; refund token on failure
    if (result.success && result.data) {
      await setCachedMetadata(url, result.data);
    } else {
      // Refund the token — failures shouldn't drain the rate limit bucket
      await rateLimiter.release();
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
 * 2. AmazonPuppeteerAdapter (Puppeteer with stealth for Amazon)
 * 3. FlipkartPuppeteerAdapter (Puppeteer with stealth for Flipkart)
 * 4. PlaywrightAdapter (modern universal fallback)
 * 5. OpenGraphAdapter (basic fallback)
 * 6. MockAdapter (dev/testing)
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
      
      // Add site-specific Puppeteer scrapers with stealth mode
      this.adapters.push(
        new RateLimitedCachedMetadataAdapter(
          new AmazonPuppeteerAdapter(),
          'AmazonScraper'
        )
      );
      this.adapters.push(
        new RateLimitedCachedMetadataAdapter(
          new FlipkartPuppeteerAdapter(),
          'FlipkartScraper'
        )
      );
      
      // PlaywrightAdapter disabled — requires separate `npx playwright install` download.
      // Amazon & Flipkart are covered by Puppeteer above; other sites use OpenGraph below.
      // Uncomment below if you want Playwright as a universal fallback for other sites:
      // this.adapters.push(
      //   new RateLimitedCachedMetadataAdapter(new PlaywrightAdapter(), 'Playwright')
      // );
      
      // Add OpenGraph as basic fallback
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
   * Try all matching adapters in priority order, falling back on failure.
   * This is the recommended method to use instead of getAdapter() + fetchMetadata().
   */
  static async fetchWithFallback(url: string): Promise<MetadataFetchResult> {
    if (!this.initialized) {
      this.initialize();
    }

    const matching = this.adapters.filter(a => a.canHandle(url));

    if (matching.length === 0) {
      logger.warn({ url }, 'No adapters can handle URL');
      return {
        success: false,
        error: new (await import('../errors/AdapterError')).AdapterError(
          'UNKNOWN_ERROR' as any,
          `No adapter found for URL: ${url}`,
          false
        )
      };
    }

    let lastError: any;
    for (const adapter of matching) {
      logger.info({ adapter: adapter.name, url }, 'Trying adapter');
      const result = await adapter.fetchMetadata(url);
      if (result.success) {
        return result;
      }
      logger.warn(
        { adapter: adapter.name, url, error: result.error?.message },
        'Adapter failed, trying next'
      );
      lastError = result.error;
    }

    logger.error({ url, error: lastError?.message }, 'All adapters failed');
    return { success: false, error: lastError };
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

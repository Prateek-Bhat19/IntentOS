"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataAdapterFactory = void 0;
const MockMetadataAdapter_1 = require("./MockMetadataAdapter");
const OpenGraphAdapter_1 = require("./OpenGraphAdapter");
const CanopyAdapter_1 = require("./CanopyAdapter");
const AmazonPuppeteerAdapter_1 = require("./AmazonPuppeteerAdapter");
const FlipkartPuppeteerAdapter_1 = require("./FlipkartPuppeteerAdapter");
const PlaywrightAdapter_1 = require("./PlaywrightAdapter");
const adapterConfig_1 = require("../config/adapterConfig");
const logger_1 = require("../../logger");
const rateLimiter_1 = require("../utils/rateLimiter");
const productCache_1 = require("../utils/productCache");
/**
 * Wrapper that adds rate limiting and caching to any metadata adapter
 */
class RateLimitedCachedMetadataAdapter {
    constructor(adapter, rateLimiterName) {
        this.adapter = adapter;
        this.rateLimiterName = rateLimiterName;
    }
    get name() {
        return this.adapter.name;
    }
    canHandle(url) {
        return this.adapter.canHandle(url);
    }
    async fetchMetadata(url) {
        // 1. Check cache first
        const cached = await (0, productCache_1.getCachedMetadata)(url);
        if (cached) {
            logger_1.logger.info({ adapter: this.name, url }, 'Returning cached metadata');
            return {
                success: true,
                data: cached,
            };
        }
        // 2. Check rate limit
        const rateLimiter = rateLimiter_1.RateLimiters[this.rateLimiterName];
        try {
            await rateLimiter.acquire();
        }
        catch (error) {
            logger_1.logger.warn({ adapter: this.name, url, error: error.message }, 'Rate limit exceeded');
            return {
                success: false,
                error,
            };
        }
        // 3. Fetch from adapter
        logger_1.logger.info({ adapter: this.name, url }, 'Fetching metadata from adapter');
        const result = await this.adapter.fetchMetadata(url);
        // 4. Cache successful results
        if (result.success && result.data) {
            await (0, productCache_1.setCachedMetadata)(url, result.data);
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
class MetadataAdapterFactory {
    /**
     * Initialize all available adapters based on configuration
     */
    static initialize() {
        if (this.initialized) {
            logger_1.logger.warn('MetadataAdapterFactory already initialized');
            return;
        }
        // Add real adapters based on environment
        if (adapterConfig_1.adapterConfig.enableRealAdapters) {
            logger_1.logger.info('Real adapters enabled');
            // Add Canopy API adapter (highest priority for supported sites)
            if (adapterConfig_1.adapterConfig.canopyApiKey) {
                this.adapters.push(new RateLimitedCachedMetadataAdapter(new CanopyAdapter_1.CanopyAdapter(), 'Canopy'));
                logger_1.logger.info('Canopy API adapter registered with rate limiting');
            }
            else {
                logger_1.logger.warn('Canopy API key not configured, skipping Canopy adapter');
            }
            // Add site-specific Puppeteer scrapers with stealth mode
            this.adapters.push(new RateLimitedCachedMetadataAdapter(new AmazonPuppeteerAdapter_1.AmazonPuppeteerAdapter(), 'AmazonScraper'));
            this.adapters.push(new RateLimitedCachedMetadataAdapter(new FlipkartPuppeteerAdapter_1.FlipkartPuppeteerAdapter(), 'FlipkartScraper'));
            // Add Playwright as modern universal fallback
            this.adapters.push(new RateLimitedCachedMetadataAdapter(new PlaywrightAdapter_1.PlaywrightAdapter(), 'Playwright'));
            // Add OpenGraph as basic fallback
            this.adapters.push(new RateLimitedCachedMetadataAdapter(new OpenGraphAdapter_1.OpenGraphAdapter(), 'OpenGraph'));
            logger_1.logger.info('All scraper adapters registered with rate limiting and caching');
        }
        else {
            // Only use mock adapter when real adapters are disabled
            logger_1.logger.info('Using mock adapters only');
            this.adapters.push(new RateLimitedCachedMetadataAdapter(new MockMetadataAdapter_1.MockMetadataAdapter(), 'Mock'));
        }
        this.initialized = true;
        logger_1.logger.info({ adapters: this.adapters.map((a) => a.name) }, 'MetadataAdapterFactory initialized');
    }
    /**
     * Get the best adapter for a given URL
     * Priority: Canopy > Site-specific scrapers > OpenGraph > Mock
     */
    static getAdapter(url) {
        if (!this.initialized) {
            this.initialize();
        }
        // Try all adapters in order, return first that can handle the URL
        for (const adapter of this.adapters) {
            if (adapter.canHandle(url)) {
                logger_1.logger.debug({ adapter: adapter.name, url }, 'Selected adapter');
                return adapter;
            }
        }
        // Fallback to Mock if nothing else works (shouldn't happen)
        const mockAdapter = this.adapters.find((adapter) => adapter.name === 'Mock');
        logger_1.logger.warn({ url }, 'No adapter found, using Mock');
        return mockAdapter;
    }
    /**
     * Get all registered adapters
     */
    static getAllAdapters() {
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
exports.MetadataAdapterFactory = MetadataAdapterFactory;
MetadataAdapterFactory.adapters = [];
MetadataAdapterFactory.initialized = false;

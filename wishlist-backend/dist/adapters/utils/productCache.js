"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTTL = void 0;
exports.getCachedMetadata = getCachedMetadata;
exports.setCachedMetadata = setCachedMetadata;
exports.getCachedPrice = getCachedPrice;
exports.setCachedPrice = setCachedPrice;
exports.invalidateMetadataCache = invalidateMetadataCache;
exports.invalidatePriceCache = invalidatePriceCache;
const cache_1 = require("../../redis/cache");
const urlParser_1 = require("./urlParser");
const logger_1 = require("../../logger");
/**
 * Cache TTL configuration (in seconds)
 */
exports.CacheTTL = {
    METADATA: 7 * 24 * 60 * 60, // 7 days
    PRICE: 60 * 60, // 1 hour
};
/**
 * Get cached product metadata
 */
async function getCachedMetadata(url) {
    try {
        const normalizedUrl = (0, urlParser_1.normalizeUrl)(url);
        const cacheKey = `product:metadata:${normalizedUrl}`;
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            logger_1.logger.debug({ url, cacheKey }, 'Metadata cache HIT');
            return cached;
        }
        logger_1.logger.debug({ url, cacheKey }, 'Metadata cache MISS');
        return null;
    }
    catch (error) {
        logger_1.logger.error({ error, url }, 'Error getting cached metadata');
        return null;
    }
}
/**
 * Cache product metadata
 */
async function setCachedMetadata(url, metadata, ttl = exports.CacheTTL.METADATA) {
    try {
        const normalizedUrl = (0, urlParser_1.normalizeUrl)(url);
        const cacheKey = `product:metadata:${normalizedUrl}`;
        await (0, cache_1.setCache)(cacheKey, metadata, ttl);
        logger_1.logger.debug({ url, cacheKey, ttl }, 'Metadata cached successfully');
    }
    catch (error) {
        logger_1.logger.error({ error, url }, 'Error caching metadata');
    }
}
/**
 * Get cached price data
 */
async function getCachedPrice(url) {
    try {
        const normalizedUrl = (0, urlParser_1.normalizeUrl)(url);
        const cacheKey = `product:price:${normalizedUrl}`;
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            logger_1.logger.debug({ url, cacheKey }, 'Price cache HIT');
            return cached;
        }
        logger_1.logger.debug({ url, cacheKey }, 'Price cache MISS');
        return null;
    }
    catch (error) {
        logger_1.logger.error({ error, url }, 'Error getting cached price');
        return null;
    }
}
/**
 * Cache price data
 */
async function setCachedPrice(url, priceData, ttl = exports.CacheTTL.PRICE) {
    try {
        const normalizedUrl = (0, urlParser_1.normalizeUrl)(url);
        const cacheKey = `product:price:${normalizedUrl}`;
        await (0, cache_1.setCache)(cacheKey, priceData, ttl);
        logger_1.logger.debug({ url, cacheKey, ttl }, 'Price cached successfully');
    }
    catch (error) {
        logger_1.logger.error({ error, url }, 'Error caching price');
    }
}
/**
 * Invalidate cached metadata for a URL
 */
async function invalidateMetadataCache(url) {
    try {
        const normalizedUrl = (0, urlParser_1.normalizeUrl)(url);
        const cacheKey = `product:metadata:${normalizedUrl}`;
        // Note: deleteByPattern not available, so we'd need to implement cache invalidation
        // For now, just log - cache will expire naturally
        logger_1.logger.debug({ url, cacheKey }, 'Metadata cache invalidation requested');
    }
    catch (error) {
        logger_1.logger.error({ error, url }, 'Error invalidating metadata cache');
    }
}
/**
 * Invalidate cached price for a URL
 */
async function invalidatePriceCache(url) {
    try {
        const normalizedUrl = (0, urlParser_1.normalizeUrl)(url);
        const cacheKey = `product:price:${normalizedUrl}`;
        logger_1.logger.debug({ url, cacheKey }, 'Price cache invalidation requested');
    }
    catch (error) {
        logger_1.logger.error({ error, url }, 'Error invalidating price cache');
    }
}

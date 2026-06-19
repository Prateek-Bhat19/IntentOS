import { getCache, setCache, deleteByPattern } from '../../redis/cache';
import { normalizeUrl } from './urlParser';
import { logger } from '../../logger';
import type { ProductMetadata } from '../metadata/IMetadataAdapter';
import type { PriceCheckData } from '../price/IPriceAdapter';

/**
 * Cache TTL configuration (in seconds)
 */
export const CacheTTL = {
  METADATA: 7 * 24 * 60 * 60,  // 7 days
  PRICE: 60 * 60,              // 1 hour
};

/**
 * Get cached product metadata
 */
export async function getCachedMetadata(url: string): Promise<ProductMetadata | null> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `product:metadata:${normalizedUrl}`;

    const cached = await getCache<ProductMetadata>(cacheKey);

    if (cached) {
      logger.debug({ url, cacheKey }, 'Metadata cache HIT');
      return cached;
    }

    logger.debug({ url, cacheKey }, 'Metadata cache MISS');
    return null;
  } catch (error) {
    logger.error({ error, url }, 'Error getting cached metadata');
    return null;
  }
}

/**
 * Cache product metadata
 */
export async function setCachedMetadata(
  url: string,
  metadata: ProductMetadata,
  ttl: number = CacheTTL.METADATA
): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `product:metadata:${normalizedUrl}`;

    await setCache(cacheKey, metadata, ttl);

    logger.debug(
      { url, cacheKey, ttl },
      'Metadata cached successfully'
    );
  } catch (error) {
    logger.error({ error, url }, 'Error caching metadata');
  }
}

/**
 * Get cached price data
 */
export async function getCachedPrice(url: string): Promise<PriceCheckData | null> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `product:price:${normalizedUrl}`;

    const cached = await getCache<PriceCheckData>(cacheKey);

    if (cached) {
      logger.debug({ url, cacheKey }, 'Price cache HIT');
      return cached;
    }

    logger.debug({ url, cacheKey }, 'Price cache MISS');
    return null;
  } catch (error) {
    logger.error({ error, url }, 'Error getting cached price');
    return null;
  }
}

/**
 * Cache price data
 */
export async function setCachedPrice(
  url: string,
  priceData: PriceCheckData,
  ttl: number = CacheTTL.PRICE
): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `product:price:${normalizedUrl}`;

    await setCache(cacheKey, priceData, ttl);

    logger.debug(
      { url, cacheKey, ttl },
      'Price cached successfully'
    );
  } catch (error) {
    logger.error({ error, url }, 'Error caching price');
  }
}

/**
 * Invalidate cached metadata for a URL
 */
export async function invalidateMetadataCache(url: string): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `product:metadata:${normalizedUrl}`;
    await deleteByPattern(cacheKey);
    logger.debug({ url, cacheKey }, 'Metadata cache invalidated');
  } catch (error) {
    logger.error({ error, url }, 'Error invalidating metadata cache');
  }
}

/**
 * Invalidate cached price for a URL
 */
export async function invalidatePriceCache(url: string): Promise<void> {
  try {
    const normalizedUrl = normalizeUrl(url);
    const cacheKey = `product:price:${normalizedUrl}`;
    await deleteByPattern(cacheKey);
    logger.debug({ url, cacheKey }, 'Price cache invalidated');
  } catch (error) {
    logger.error({ error, url }, 'Error invalidating price cache');
  }
}

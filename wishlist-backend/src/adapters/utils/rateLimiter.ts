import { redis } from '../../redis/client';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { logger } from '../../logger';

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  maxTokens: number;      // Maximum number of tokens (requests)
  refillRate: number;     // Tokens added per refill interval
  refillInterval: number; // Interval in milliseconds
}

/**
 * Token bucket rate limiter with Redis backend
 * Supports distributed rate limiting across multiple workers
 */
export class RateLimiter {
  private tokensKey: string;
  private lastRefillKey: string;

  constructor(
    private name: string,
    private config: RateLimitConfig
  ) {
    this.tokensKey = `ratelimit:${name}:tokens`;
    this.lastRefillKey = `ratelimit:${name}:lastRefill`;
  }

  /**
   * Acquire a token (allow one request)
   * Throws AdapterError if rate limit exceeded
   */
  async acquire(): Promise<void> {
    await this.refillTokens();

    // Try to decrement token count atomically
    const tokens = await redis.get(this.tokensKey);
    const currentTokens = tokens ? parseFloat(tokens) : this.config.maxTokens;

    if (currentTokens < 1) {
      const waitTime = await this.calculateWaitTime();
      logger.warn(
        { adapter: this.name, waitTime },
        'Rate limit exceeded'
      );
      throw AdapterError.rateLimited(waitTime);
    }

    // Decrement token count
    await redis.set(this.tokensKey, (currentTokens - 1).toString());
  }

  /**
   * Refill tokens based on time elapsed
   */
  private async refillTokens(): Promise<void> {
    const now = Date.now();
    const lastRefillStr = await redis.get(this.lastRefillKey);
    const lastRefill = lastRefillStr ? parseInt(lastRefillStr) : now;

    const timeSinceRefill = now - lastRefill;
    const intervalsElapsed = Math.floor(timeSinceRefill / this.config.refillInterval);

    if (intervalsElapsed > 0) {
      const tokensStr = await redis.get(this.tokensKey);
      const currentTokens = tokensStr ? parseFloat(tokensStr) : this.config.maxTokens;

      const tokensToAdd = intervalsElapsed * this.config.refillRate;
      const newTokens = Math.min(currentTokens + tokensToAdd, this.config.maxTokens);

      await redis.set(this.tokensKey, newTokens.toString());
      await redis.set(this.lastRefillKey, now.toString());

      logger.debug(
        {
          adapter: this.name,
          tokensAdded: tokensToAdd,
          newTokens,
          intervalsElapsed,
        },
        'Tokens refilled'
      );
    }
  }

  /**
   * Calculate time to wait until next token is available
   */
  private async calculateWaitTime(): Promise<number> {
    const now = Date.now();
    const lastRefillStr = await redis.get(this.lastRefillKey);
    const lastRefill = lastRefillStr ? parseInt(lastRefillStr) : now;

    const timeSinceRefill = now - lastRefill;
    const timeUntilNextRefill = this.config.refillInterval - timeSinceRefill;

    return Math.max(timeUntilNextRefill, 0);
  }

  /**
   * Get current token count (for monitoring)
   */
  async getTokens(): Promise<number> {
    const tokensStr = await redis.get(this.tokensKey);
    return tokensStr ? parseFloat(tokensStr) : this.config.maxTokens;
  }

  /**
   * Reset rate limiter (for testing)
   */
  async reset(): Promise<void> {
    await redis.del(this.tokensKey);
    await redis.del(this.lastRefillKey);
  }
}

/**
 * Predefined rate limiters for each adapter
 */
export const RateLimiters = {
  Canopy: new RateLimiter('Canopy', {
    maxTokens: 100,
    refillRate: 100,
    refillInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
  }),

  AmazonScraper: new RateLimiter('AmazonScraper', {
    maxTokens: 60,
    refillRate: 60,
    refillInterval: 60 * 1000, // 1 minute
  }),

  FlipkartScraper: new RateLimiter('FlipkartScraper', {
    maxTokens: 60,
    refillRate: 60,
    refillInterval: 60 * 1000, // 1 minute
  }),

  Playwright: new RateLimiter('Playwright', {
    maxTokens: 100,
    refillRate: 100,
    refillInterval: 60 * 1000, // 1 minute
  }),

  OpenGraph: new RateLimiter('OpenGraph', {
    maxTokens: 120,
    refillRate: 120,
    refillInterval: 60 * 1000, // 1 minute
  }),

  Mock: new RateLimiter('Mock', {
    maxTokens: 1000,
    refillRate: 1000,
    refillInterval: 1000, // Effectively unlimited
  }),
};

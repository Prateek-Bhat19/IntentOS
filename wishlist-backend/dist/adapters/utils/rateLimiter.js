"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiters = exports.RateLimiter = void 0;
const client_1 = require("../../redis/client");
const AdapterError_1 = require("../errors/AdapterError");
const logger_1 = require("../../logger");
/**
 * Token bucket rate limiter with Redis backend
 * Supports distributed rate limiting across multiple workers
 */
class RateLimiter {
    constructor(name, config) {
        this.name = name;
        this.config = config;
        this.tokensKey = `ratelimit:${name}:tokens`;
        this.lastRefillKey = `ratelimit:${name}:lastRefill`;
    }
    /**
     * Acquire a token (allow one request)
     * Throws AdapterError if rate limit exceeded
     */
    async acquire() {
        await this.refillTokens();
        // Try to decrement token count atomically
        const tokens = await client_1.redis.get(this.tokensKey);
        const currentTokens = tokens ? parseFloat(tokens) : this.config.maxTokens;
        if (currentTokens < 1) {
            const waitTime = await this.calculateWaitTime();
            logger_1.logger.warn({ adapter: this.name, waitTime }, 'Rate limit exceeded');
            throw AdapterError_1.AdapterError.rateLimited(waitTime);
        }
        // Decrement token count
        await client_1.redis.set(this.tokensKey, (currentTokens - 1).toString());
    }
    /**
     * Refill tokens based on time elapsed
     */
    async refillTokens() {
        const now = Date.now();
        const lastRefillStr = await client_1.redis.get(this.lastRefillKey);
        const lastRefill = lastRefillStr ? parseInt(lastRefillStr) : now;
        const timeSinceRefill = now - lastRefill;
        const intervalsElapsed = Math.floor(timeSinceRefill / this.config.refillInterval);
        if (intervalsElapsed > 0) {
            const tokensStr = await client_1.redis.get(this.tokensKey);
            const currentTokens = tokensStr ? parseFloat(tokensStr) : this.config.maxTokens;
            const tokensToAdd = intervalsElapsed * this.config.refillRate;
            const newTokens = Math.min(currentTokens + tokensToAdd, this.config.maxTokens);
            await client_1.redis.set(this.tokensKey, newTokens.toString());
            await client_1.redis.set(this.lastRefillKey, now.toString());
            logger_1.logger.debug({
                adapter: this.name,
                tokensAdded: tokensToAdd,
                newTokens,
                intervalsElapsed,
            }, 'Tokens refilled');
        }
    }
    /**
     * Calculate time to wait until next token is available
     */
    async calculateWaitTime() {
        const now = Date.now();
        const lastRefillStr = await client_1.redis.get(this.lastRefillKey);
        const lastRefill = lastRefillStr ? parseInt(lastRefillStr) : now;
        const timeSinceRefill = now - lastRefill;
        const timeUntilNextRefill = this.config.refillInterval - timeSinceRefill;
        return Math.max(timeUntilNextRefill, 0);
    }
    /**
     * Get current token count (for monitoring)
     */
    async getTokens() {
        const tokensStr = await client_1.redis.get(this.tokensKey);
        return tokensStr ? parseFloat(tokensStr) : this.config.maxTokens;
    }
    /**
     * Reset rate limiter (for testing)
     */
    async reset() {
        await client_1.redis.del(this.tokensKey);
        await client_1.redis.del(this.lastRefillKey);
    }
}
exports.RateLimiter = RateLimiter;
/**
 * Predefined rate limiters for each adapter
 */
exports.RateLimiters = {
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

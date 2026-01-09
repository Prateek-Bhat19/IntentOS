"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapterConfig = void 0;
const env_1 = require("../../config/env");
/**
 * Adapter configuration
 */
exports.adapterConfig = {
    // Feature flags
    enableRealAdapters: true,
    // API keys
    canopyApiKey: undefined, // Disabled as per user request
    // Timeouts and retries
    timeoutMs: env_1.env.ADAPTER_TIMEOUT_MS,
    maxRetries: env_1.env.ADAPTER_MAX_RETRIES,
    // Rate limiting (requests per minute)
    rateLimitRpm: env_1.env.ADAPTER_RATE_LIMIT_RPM,
    // Price check frequency by priority (in hours)
    priceCheckFrequency: {
        HIGH: 2, // Every 2 hours
        MEDIUM: 6, // Every 6 hours
        LOW: 24, // Every 24 hours
    },
};

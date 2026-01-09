import { env } from '../../config/env';

/**
 * Adapter configuration
 */
export const adapterConfig = {
  // Feature flags
  enableRealAdapters: true,
  
  // API keys
  canopyApiKey: undefined, // Disabled as per user request
  
  // Timeouts and retries
  timeoutMs: env.ADAPTER_TIMEOUT_MS,
  maxRetries: env.ADAPTER_MAX_RETRIES,
  
  // Rate limiting (requests per minute)
  rateLimitRpm: env.ADAPTER_RATE_LIMIT_RPM,
  
  // Price check frequency by priority (in hours)
  priceCheckFrequency: {
    HIGH: 2,    // Every 2 hours
    MEDIUM: 6,  // Every 6 hours
    LOW: 24,    // Every 24 hours
  },
} as const;

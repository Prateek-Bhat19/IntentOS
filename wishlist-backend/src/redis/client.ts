import IORedis from "ioredis";
import { env } from "../config/env";
import { logger } from "../logger";

let _redis: IORedis | null = null;

/**
 * Returns a Redis client if REDIS_URL is configured, otherwise null.
 * All operations should check for null and skip gracefully.
 */
function createRedisClient(): IORedis | null {
  if (!env.REDIS_URL) {
    logger.warn("REDIS_URL not configured — caching and job queues disabled");
    return null;
  }

  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,       // Don't queue commands when disconnected
    connectTimeout: 5000,
    lazyConnect: true,               // Don't connect until first command
  });

  client.on("error", (err: Error) => {
    // Log but don't crash — Redis is optional
    logger.warn({ err: err.message }, "Redis connection error (non-fatal)");
  });

  client.on("connect", () => {
    logger.info("Redis connected");
  });

  return client;
}

// Singleton
export const redis: IORedis = (() => {
  if (!_redis) {
    _redis = createRedisClient();
  }
  // BullMQ requires a non-null IORedis, so if null we return a dummy
  // that will fail silently — queue operations are wrapped in try/catch
  return _redis as IORedis;
})();

/** True only when Redis is actually configured and available */
export function isRedisAvailable(): boolean {
  return _redis !== null;
}

import { RateLimiterRedis } from "rate-limiter-flexible";
import { redis } from "../redis/client";

export const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "auth_rl",
  points: 5,        // max attempts
  duration: 60,     // per 60 seconds
});

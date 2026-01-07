import IORedis from "ioredis";
import { env } from "../config/env";
export const redis = new IORedis({
  host: env.REDIS_HOST || "127.0.0.1",
  port: Number(env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

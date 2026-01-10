import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(8000),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),

  JWT_SECRET: z.string().min(32),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug"]).default("info"),

  // Adapter configuration
  ENABLE_REAL_ADAPTERS: z.coerce.boolean().default(false),
  
  // API keys (optional - only needed for specific adapters)
  CANOPY_API_KEY: z.string().optional(),
  
  // Adapter timeouts and limits
  ADAPTER_TIMEOUT_MS: z.coerce.number().default(10000),
  ADAPTER_MAX_RETRIES: z.coerce.number().default(3),
  
  // Rate limiting per adapter (requests per minute)
  ADAPTER_RATE_LIMIT_RPM: z.coerce.number().default(60),

  // Security
  CORS_ORIGIN: z.string().default("*"),
});

export const env = envSchema.parse(process.env);

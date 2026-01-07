import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().default(8000),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),

  JWT_SECRET: z.string().min(32),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug"]).default("info"),
});

export const env = envSchema.parse(process.env);

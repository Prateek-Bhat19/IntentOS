"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]),
    PORT: zod_1.z.coerce.number().default(8000),
    DATABASE_URL: zod_1.z.string().url(),
    REDIS_HOST: zod_1.z.string(),
    REDIS_PORT: zod_1.z.coerce.number(),
    JWT_SECRET: zod_1.z.string().min(32),
    LOG_LEVEL: zod_1.z.enum(["fatal", "error", "warn", "info", "debug"]).default("info"),
    // Adapter configuration
    ENABLE_REAL_ADAPTERS: zod_1.z.coerce.boolean().default(false),
    // API keys (optional - only needed for specific adapters)
    CANOPY_API_KEY: zod_1.z.string().optional(),
    // Adapter timeouts and limits
    ADAPTER_TIMEOUT_MS: zod_1.z.coerce.number().default(10000),
    ADAPTER_MAX_RETRIES: zod_1.z.coerce.number().default(3),
    // Rate limiting per adapter (requests per minute)
    ADAPTER_RATE_LIMIT_RPM: zod_1.z.coerce.number().default(60),
});
exports.env = envSchema.parse(process.env);

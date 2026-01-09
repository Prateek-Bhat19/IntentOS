"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimiter = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const client_1 = require("../redis/client");
exports.authRateLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
    storeClient: client_1.redis,
    keyPrefix: "auth_rl",
    points: 5, // max attempts
    duration: 60, // per 60 seconds
});

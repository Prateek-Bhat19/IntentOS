"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimit = authRateLimit;
const auth_rateLimit_1 = require("../rateLimit/auth.rateLimit");
async function authRateLimit(req, res, next) {
    try {
        const key = req.ip ?? "unknown-ip";
        await auth_rateLimit_1.authRateLimiter.consume(key);
        next();
    }
    catch {
        res.status(429).json({
            message: "Too many attempts. Please try again later.",
        });
    }
}

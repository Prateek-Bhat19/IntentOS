"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
exports.sleep = sleep;
/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, config) {
    const { maxAttempts, delayMs, backoffMultiplier = 2, shouldRetry = () => true, } = config;
    let lastError;
    let currentDelay = delayMs;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            // Check if we should retry
            if (attempt === maxAttempts || !shouldRetry(error)) {
                throw error;
            }
            // Wait before retry
            await sleep(currentDelay);
            currentDelay *= backoffMultiplier;
        }
    }
    throw lastError;
}
/**
 * Sleep utility
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterError = exports.ErrorType = void 0;
/**
 * Error types for adapter failures
 * Classified as retryable or unrecoverable
 */
var ErrorType;
(function (ErrorType) {
    // Unrecoverable - do NOT retry
    ErrorType["INVALID_URL"] = "INVALID_URL";
    ErrorType["UNSUPPORTED_SOURCE"] = "UNSUPPORTED_SOURCE";
    ErrorType["PRODUCT_NOT_FOUND"] = "PRODUCT_NOT_FOUND";
    ErrorType["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    ErrorType["FORBIDDEN"] = "FORBIDDEN";
    // Retryable - safe to retry
    ErrorType["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorType["TIMEOUT"] = "TIMEOUT";
    ErrorType["RATE_LIMITED"] = "RATE_LIMITED";
    ErrorType["SERVER_ERROR"] = "SERVER_ERROR";
    ErrorType["PARSING_ERROR"] = "PARSING_ERROR";
    ErrorType["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
/**
 * Custom error class for adapter failures
 * Includes error classification for retry logic
 */
class AdapterError extends Error {
    constructor(type, message, isRetryable, originalError) {
        super(message);
        this.type = type;
        this.isRetryable = isRetryable;
        this.originalError = originalError;
        this.name = 'AdapterError';
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AdapterError);
        }
    }
    // Factory methods for common error types
    static invalidUrl(url) {
        return new AdapterError(ErrorType.INVALID_URL, `Invalid URL: ${url}`, false);
    }
    static unsupportedSource(source) {
        return new AdapterError(ErrorType.UNSUPPORTED_SOURCE, `Unsupported source: ${source}`, false);
    }
    static productNotFound(url) {
        return new AdapterError(ErrorType.PRODUCT_NOT_FOUND, `Product not found at: ${url}`, false);
    }
    static authenticationFailed(message) {
        return new AdapterError(ErrorType.AUTHENTICATION_FAILED, message || 'Authentication failed', false);
    }
    static networkError(err) {
        return new AdapterError(ErrorType.NETWORK_ERROR, `Network request failed: ${err.message}`, true, err);
    }
    static timeout(timeoutMs) {
        return new AdapterError(ErrorType.TIMEOUT, `Request timed out after ${timeoutMs}ms`, true);
    }
    static rateLimited(retryAfter) {
        const message = retryAfter
            ? `Rate limited. Retry after ${retryAfter}s`
            : 'Rate limited';
        return new AdapterError(ErrorType.RATE_LIMITED, message, true);
    }
    static serverError(statusCode, err) {
        return new AdapterError(ErrorType.SERVER_ERROR, `Server error (${statusCode})`, true, err);
    }
    static parsingError(message, err) {
        return new AdapterError(ErrorType.PARSING_ERROR, `Failed to parse response: ${message}`, true, err);
    }
    static unknown(err) {
        return new AdapterError(ErrorType.UNKNOWN_ERROR, `Unknown error: ${err.message}`, true, err);
    }
}
exports.AdapterError = AdapterError;

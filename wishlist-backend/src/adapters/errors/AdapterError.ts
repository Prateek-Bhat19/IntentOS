/**
 * Error types for adapter failures
 * Classified as retryable or unrecoverable
 */
export enum ErrorType {
  // Unrecoverable - do NOT retry
  INVALID_URL = 'INVALID_URL',
  UNSUPPORTED_SOURCE = 'UNSUPPORTED_SOURCE',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Retryable - safe to retry
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for adapter failures
 * Includes error classification for retry logic
 */
export class AdapterError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly isRetryable: boolean,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AdapterError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AdapterError);
    }
  }

  // Factory methods for common error types
  
  static invalidUrl(url: string): AdapterError {
    return new AdapterError(
      ErrorType.INVALID_URL,
      `Invalid URL: ${url}`,
      false
    );
  }

  static unsupportedSource(source: string): AdapterError {
    return new AdapterError(
      ErrorType.UNSUPPORTED_SOURCE,
      `Unsupported source: ${source}`,
      false
    );
  }

  static productNotFound(url: string): AdapterError {
    return new AdapterError(
      ErrorType.PRODUCT_NOT_FOUND,
      `Product not found at: ${url}`,
      false
    );
  }

  static authenticationFailed(message?: string): AdapterError {
    return new AdapterError(
      ErrorType.AUTHENTICATION_FAILED,
      message || 'Authentication failed',
      false
    );
  }

  static networkError(err: Error): AdapterError {
    return new AdapterError(
      ErrorType.NETWORK_ERROR,
      `Network request failed: ${err.message}`,
      true,
      err
    );
  }

  static timeout(timeoutMs: number): AdapterError {
    return new AdapterError(
      ErrorType.TIMEOUT,
      `Request timed out after ${timeoutMs}ms`,
      true
    );
  }

  static rateLimited(retryAfter?: number): AdapterError {
    const message = retryAfter 
      ? `Rate limited. Retry after ${retryAfter}s`
      : 'Rate limited';
    
    return new AdapterError(
      ErrorType.RATE_LIMITED,
      message,
      true
    );
  }

  static serverError(statusCode: number, err?: Error): AdapterError {
    return new AdapterError(
      ErrorType.SERVER_ERROR,
      `Server error (${statusCode})`,
      true,
      err
    );
  }

  static parsingError(message: string, err?: Error): AdapterError {
    return new AdapterError(
      ErrorType.PARSING_ERROR,
      `Failed to parse response: ${message}`,
      true,
      err
    );
  }

  static unknown(err: Error): AdapterError {
    return new AdapterError(
      ErrorType.UNKNOWN_ERROR,
      `Unknown error: ${err.message}`,
      true,
      err
    );
  }
}

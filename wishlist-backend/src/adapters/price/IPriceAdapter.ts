import { AdapterError } from '../errors/AdapterError';

/**
 * Price check result structure
 */
export interface PriceCheckData {
  price: number;
  currency: string;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  checkedAt: string;
  source: string;
  originalPrice?: number; // For discount tracking
}

/**
 * Result of price check operation
 */
export interface PriceCheckResult {
  success: boolean;
  data?: PriceCheckData;
  error?: AdapterError;
}

/**
 * Interface for price checking adapters
 */
export interface IPriceAdapter {
  /**
   * Adapter name for logging/debugging
   */
  readonly name: string;

  /**
   * Check if this adapter can handle the given URL
   * @param url - URL to check
   * @returns true if adapter can handle this URL
   */
  canHandle(url: string): boolean;

  /**
   * Check current price for the product
   * @param url - Product URL
   * @returns PriceCheckResult with data or error
   */
  checkPrice(url: string): Promise<PriceCheckResult>;
}

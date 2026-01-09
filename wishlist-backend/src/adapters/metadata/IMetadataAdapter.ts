import { AdapterError } from '../errors/AdapterError';

/**
 * Product metadata structure
 */
export interface ProductMetadata {
  title?: string;
  description?: string;
  imageUrl?: string; // Deprecated: use images[0] instead, kept for backward compatibility
  images?: string[]; // Multiple product images (main + gallery)
  price?: number;
  currency?: string;
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  brand?: string;
  specifications?: Record<string, string>; // Product specifications (e.g., {"Color": "Black", "Weight": "200g"})
  rating?: number; // Average product rating (e.g., 4.5)
  reviewCount?: number; // Number of reviews
  highlights?: string[]; // Product highlights/key features
  source: string;
  fetchedAt: string;
  rawData?: Record<string, unknown>; // For debugging
}

/**
 * Result of metadata fetch operation
 */
export interface MetadataFetchResult {
  success: boolean;
  data?: ProductMetadata;
  error?: AdapterError;
}

/**
 * Interface for metadata adapters
 * Implements ports & adapters pattern
 */
export interface IMetadataAdapter {
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
   * Fetch metadata from the URL
   * @param url - Product URL
   * @returns MetadataFetchResult with data or error
   */
  fetchMetadata(url: string): Promise<MetadataFetchResult>;
}

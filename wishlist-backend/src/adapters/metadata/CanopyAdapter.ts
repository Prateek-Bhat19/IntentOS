import axios from 'axios';
import { IMetadataAdapter, MetadataFetchResult, ProductMetadata } from './IMetadataAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { adapterConfig } from '../config/adapterConfig';
import { matchesDomain } from '../utils/urlParser';
import { logger } from '../../logger';

/**
 * Canopy API adapter for Amazon product data
 * Uses official Canopy API for high-quality structured data
 * Free tier: 100 requests/month
 */
export class CanopyAdapter implements IMetadataAdapter {
  readonly name = 'Canopy';
  private apiKey = adapterConfig.canopyApiKey;
  private baseUrl = 'https://rest.canopyapi.co/api';

  canHandle(url: string): boolean {
    // Canopy supports Amazon only
    return matchesDomain(url, [
      '*.amazon.in',
      '*.amazon.com',
      '*.amazon.co.uk',
      '*.amazon.de',
      '*.amazon.fr',
      '*.amazon.ca',
    ]);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    if (!this.apiKey) {
      logger.warn('Canopy API key not configured, skipping adapter');
      return {
        success: false,
        error: AdapterError.authenticationFailed('Canopy API key not configured'),
      };
    }

    try {
      // Extract ASIN from Amazon URL
      const asin = this.extractAsin(url);
      if (!asin) {
        return {
          success: false,
          error: AdapterError.parsingError('Could not extract ASIN from URL'),
        };
      }

      // Determine domain from URL
      const domain = this.getDomain(url);

      logger.debug({ asin, domain, adapter: this.name }, 'Fetching from Canopy API');

      const response = await axios.get(`${this.baseUrl}/amazon/product`, {
        params: { asin, domain },
        headers: {
          'API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: adapterConfig.timeoutMs,
      });

      const data = response.data;

      logger.debug(
        { title: data.title, price: data.price },
        'Canopy API response received'
      );

      return {
        success: true,
        data: {
          title: data.title,
          description: data.description,
          imageUrl: data.image,
          price: data.price,
          currency: data.currency || this.getCurrencyForDomain(domain),
          availability: data.in_stock ? 'IN_STOCK' : 'OUT_OF_STOCK',
          brand: data.brand,
          source: this.name,
          fetchedAt: new Date().toISOString(),
          rawData: {
            canopyData: data,
          },
        },
      };
    } catch (error: any) {
      logger.error(
        { error: error.message, url },
        'Canopy API request failed'
      );

      return {
        success: false,
        error: this.classifyError(error),
      };
    }
  }

  /**
   * Extract ASIN from Amazon URL
   */
  private extractAsin(url: string): string | null {
    // Amazon ASIN patterns:
    // /dp/ASIN
    // /gp/product/ASIN
    // /product/ASIN
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /\/product\/([A-Z0-9]{10})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Get Canopy domain code from URL
   */
  private getDomain(url: string): string {
    if (url.includes('amazon.in')) return 'IN';
    if (url.includes('amazon.com')) return 'US';
    if (url.includes('amazon.co.uk')) return 'UK';
    if (url.includes('amazon.de')) return 'DE';
    if (url.includes('amazon.fr')) return 'FR';
    if (url.includes('amazon.ca')) return 'CA';
    return 'US'; // Default
  }

  /**
   * Get currency for domain
   */
  private getCurrencyForDomain(domain: string): string {
    const currencyMap: Record<string, string> = {
      'IN': 'INR',
      'US': 'USD',
      'UK': 'GBP',
      'DE': 'EUR',
      'FR': 'EUR',
      'CA': 'CAD',
    };
    return currencyMap[domain] || 'USD';
  }

  private classifyError(error: any): AdapterError {
    if (error instanceof AdapterError) {
      return error;
    }

    // Authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return AdapterError.authenticationFailed('Invalid Canopy API key');
    }

    // Rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      return AdapterError.rateLimited(retryAfter ? parseInt(retryAfter) : undefined);
    }

    // Product not found
    if (error.response?.status === 404) {
      return AdapterError.productNotFound(error.config?.params?.url || 'unknown');
    }

    // Server errors
    if (error.response?.status >= 500) {
      return AdapterError.serverError(error.response.status, error);
    }

    // Timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return AdapterError.timeout(adapterConfig.timeoutMs);
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return AdapterError.networkError(error);
    }

    // Unknown error
    return AdapterError.unknown(error);
  }
}

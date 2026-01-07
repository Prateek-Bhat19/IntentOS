import * as cheerio from 'cheerio';
import { IMetadataAdapter, MetadataFetchResult, ProductMetadata } from './IMetadataAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { createHttpClient } from '../utils/httpClient';
import { isValidUrl } from '../utils/urlParser';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';

/**
 * OpenGraph metadata adapter
 * Fetches metadata from any website using Open Graph meta tags
 * Works as a universal fallback for e-commerce sites
 */
export class OpenGraphAdapter implements IMetadataAdapter {
  readonly name = 'OpenGraph';
  private httpClient = createHttpClient({ timeout: adapterConfig.timeoutMs });

  canHandle(url: string): boolean {
    // Can handle any valid HTTP(S) URL
    return isValidUrl(url);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    try {
      // Validate URL first
      if (!this.canHandle(url)) {
        return {
          success: false,
          error: AdapterError.invalidUrl(url),
        };
      }

      logger.debug({ url, adapter: this.name }, 'Fetching metadata');

      // Fetch HTML with timeout
      const response = await this.httpClient.get(url);

      // Check response status
      if (response.status === 404) {
        return {
          success: false,
          error: AdapterError.productNotFound(url),
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          error: AdapterError.serverError(response.status),
        };
      }

      if (response.status >= 400) {
        return {
          success: false,
          error: new AdapterError(
            ErrorType.FORBIDDEN,
            `Access forbidden (${response.status})`,
            false
          ),
        };
      }

      const html = response.data;

      // Parse HTML
      const $ = cheerio.load(html) as unknown as cheerio.CheerioAPI;
      const metadata = this.parseMetadata($, url);

      logger.debug(
        { url, title: metadata.title, price: metadata.price },
        'Metadata fetched successfully'
      );

      return {
        success: true,
        data: {
          ...metadata,
          source: this.name,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error({ url, error: error.message }, 'Metadata fetch failed');
      
      return {
        success: false,
        error: this.classifyError(error),
      };
    }
  }

  /**
   * Parse metadata from HTML using multiple strategies
   */
  private parseMetadata($: cheerio.CheerioAPI, url: string): Partial<ProductMetadata> {
    return {
      title: this.extractTitle($),
      description: this.extractDescription($),
      imageUrl: this.extractImage($),
      price: this.extractPrice($),
      currency: this.extractCurrency($),
      availability: this.extractAvailability($),
      brand: this.extractBrand($),
      rawData: {
        url,
        extractedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Extract title from multiple sources
   */
  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try Open Graph first
    let title = $('meta[property="og:title"]').attr('content');
    
    // Try Twitter Card
    if (!title) {
      title = $('meta[name="twitter:title"]').attr('content');
    }
    
    // Try standard title tag
    if (!title) {
      title = $('title').text();
    }
    
    // Try product schema
    if (!title) {
      title = $('meta[itemprop="name"]').attr('content');
    }

    return title?.trim();
  }

  /**
   * Extract description
   */
  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    let description = $('meta[property="og:description"]').attr('content');
    
    if (!description) {
      description = $('meta[name="description"]').attr('content');
    }
    
    if (!description) {
      description = $('meta[name="twitter:description"]').attr('content');
    }

    return description?.trim();
  }

  /**
   * Extract image URL
   */
  private extractImage($: cheerio.CheerioAPI): string | undefined {
    let imageUrl = $('meta[property="og:image"]').attr('content');
    
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content');
    }
    
    if (!imageUrl) {
      imageUrl = $('meta[itemprop="image"]').attr('content');
    }

    return imageUrl?.trim();
  }

  /**
   * Extract price from multiple sources
   */
  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    // Try product:price:amount (Open Graph)
    let priceStr = $('meta[property="product:price:amount"]').attr('content');
    
    // Try schema.org price
    if (!priceStr) {
      priceStr = $('meta[itemprop="price"]').attr('content');
    }
    
    // Try common price selectors
    if (!priceStr) {
      priceStr = $('[itemprop="price"]').attr('content');
    }

    if (!priceStr) {
      // Try to find price in common CSS classes
      const priceSelectors = [
        '.price',
        '.product-price',
        '[data-price]',
        '.a-price-whole', // Amazon
        '.selling-price', // Flipkart
      ];

      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length) {
          priceStr = element.text() || element.attr('content') || element.attr('data-price');
          if (priceStr) break;
        }
      }
    }

    if (!priceStr) return undefined;

    // Clean and parse price
    const cleanPrice = priceStr.replace(/[^\d.]/g, '');
    const price = parseFloat(cleanPrice);

    return isNaN(price) ? undefined : price;
  }

  /**
   * Extract currency
   */
  private extractCurrency($: cheerio.CheerioAPI): string | undefined {
    let currency = $('meta[property="product:price:currency"]').attr('content');
    
    if (!currency) {
      currency = $('meta[itemprop="priceCurrency"]').attr('content');
    }

    // Default to INR for Indian sites
    return currency?.trim() || 'INR';
  }

  /**
   * Extract availability
   */
  private extractAvailability($: cheerio.CheerioAPI): 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' {
    const availability = $('meta[property="product:availability"]').attr('content')?.toLowerCase();
    
    if (!availability) {
      // Try schema.org
      const schemaAvailability = $('link[itemprop="availability"]').attr('href')?.toLowerCase();
      
      if (schemaAvailability?.includes('instock')) return 'IN_STOCK';
      if (schemaAvailability?.includes('outofstock')) return 'OUT_OF_STOCK';
      
      return 'UNKNOWN';
    }

    if (availability.includes('instock') || availability.includes('in stock')) {
      return 'IN_STOCK';
    }
    
    if (availability.includes('outofstock') || availability.includes('out of stock')) {
      return 'OUT_OF_STOCK';
    }

    return 'UNKNOWN';
  }

  /**
   * Extract brand
   */
  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    let brand = $('meta[property="og:brand"]').attr('content');
    
    if (!brand) {
      brand = $('meta[itemprop="brand"]').attr('content');
    }
    
    if (!brand) {
      brand = $('[itemprop="brand"]').text();
    }

    return brand?.trim();
  }

  /**
   * Classify errors for retry logic
   */
  private classifyError(error: any): AdapterError {
    if (error instanceof AdapterError) {
      return error;
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return AdapterError.timeout(adapterConfig.timeoutMs);
    }

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
      return AdapterError.networkError(error);
    }

    // Rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      return AdapterError.rateLimited(retryAfter ? parseInt(retryAfter) : undefined);
    }

    // Server errors (5xx)
    if (error.response?.status >= 500) {
      return AdapterError.serverError(error.response.status, error);
    }

    // Client errors (4xx) - mostly unrecoverable
    if (error.response?.status === 404) {
      return AdapterError.productNotFound(error.config?.url || 'unknown');
    }

    if (error.response?.status === 403 || error.response?.status === 401) {
      return new AdapterError(
        ErrorType.FORBIDDEN,
        `Access forbidden (${error.response.status})`,
        false,
        error
      );
    }

    // Parsing errors
    if (error.name === 'ParserError' || error.message?.includes('parse')) {
      return AdapterError.parsingError(error.message, error);
    }

    // Unknown errors - default to retryable
    return AdapterError.unknown(error);
  }
}

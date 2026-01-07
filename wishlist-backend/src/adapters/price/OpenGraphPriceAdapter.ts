import * as cheerio from 'cheerio';
import { IPriceAdapter, PriceCheckResult, PriceCheckData } from './IPriceAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { createHttpClient } from '../utils/httpClient';
import { isValidUrl } from '../utils/urlParser';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';

/**
 * OpenGraph price checking adapter
 * Checks prices from any website using HTML parsing
 */
export class OpenGraphPriceAdapter implements IPriceAdapter {
  readonly name = 'OpenGraph';
  private httpClient = createHttpClient({ timeout: adapterConfig.timeoutMs });

  canHandle(url: string): boolean {
    return isValidUrl(url);
  }

  async checkPrice(url: string): Promise<PriceCheckResult> {
    try {
      if (!this.canHandle(url)) {
        return {
          success: false,
          error: AdapterError.invalidUrl(url),
        };
      }

      logger.debug({ url, adapter: this.name }, 'Checking price');

      const response = await this.httpClient.get(url);

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
      const $ = cheerio.load(html) as unknown as cheerio.CheerioAPI;
      
      const priceData = this.extractPriceData($);

      if (!priceData.price) {
        return {
          success: false,
          error: AdapterError.parsingError('Could not extract price from page'),
        };
      }

      logger.debug(
        { url, price: priceData.price, availability: priceData.availability },
        'Price checked successfully'
      );

      return {
        success: true,
        data: {
          price: priceData.price!,
          currency: priceData.currency!,
          availability: priceData.availability!,
          originalPrice: priceData.originalPrice,
          source: this.name,
          checkedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error({ url, error: error.message }, 'Price check failed');
      
      return {
        success: false,
        error: this.classifyError(error),
      };
    }
  }

  /**
   * Extract price data from HTML
   */
  private extractPriceData($: cheerio.CheerioAPI): Partial<PriceCheckData> {
    const price = this.extractPrice($);
    const originalPrice = this.extractOriginalPrice($);
    
    return {
      price: price!,
      currency: this.extractCurrency($),
      availability: this.extractAvailability($),
      originalPrice: originalPrice && originalPrice > price! ? originalPrice : undefined,
    };
  }

  /**
   * Extract current price
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
        '.current-price',
        '.sale-price',
        '[data-price]',
        '.a-price-whole', // Amazon
        '.selling-price', // Flipkart
        '.pdp-price', // Common pattern
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
   * Extract original price (for discount tracking)
   */
  private extractOriginalPrice($: cheerio.CheerioAPI): number | undefined {
    const originalPriceSelectors = [
      '.original-price',
      '.list-price',
      '.was-price',
      '.regular-price',
      '[data-original-price]',
      '.a-text-price', // Amazon
      '.original-price-value', // Flipkart
    ];

    for (const selector of originalPriceSelectors) {
      const element = $(selector).first();
      if (element.length) {
        const priceStr = element.text() || element.attr('content') || element.attr('data-original-price');
        if (priceStr) {
          const cleanPrice = priceStr.replace(/[^\d.]/g, '');
          const price = parseFloat(cleanPrice);
          if (!isNaN(price)) return price;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract currency
   */
  private extractCurrency($: cheerio.CheerioAPI): string {
    let currency = $('meta[property="product:price:currency"]').attr('content');
    
    if (!currency) {
      currency = $('meta[itemprop="priceCurrency"]').attr('content');
    }

    return currency?.trim() || 'INR';
  }

  /**
   * Extract availability
   */
  private extractAvailability($: cheerio.CheerioAPI): 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' {
    const availability = $('meta[property="product:availability"]').attr('content')?.toLowerCase();
    
    if (!availability) {
      const schemaAvailability = $('link[itemprop="availability"]').attr('href')?.toLowerCase();
      
      if (schemaAvailability?.includes('instock')) return 'IN_STOCK';
      if (schemaAvailability?.includes('outofstock')) return 'OUT_OF_STOCK';
      
      // Check for common out of stock indicators
      const pageText = $('body').text().toLowerCase();
      if (pageText.includes('out of stock') || pageText.includes('sold out')) {
        return 'OUT_OF_STOCK';
      }
      
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
   * Classify errors for retry logic
   */
  private classifyError(error: any): AdapterError {
    if (error instanceof AdapterError) {
      return error;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return AdapterError.timeout(adapterConfig.timeoutMs);
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
      return AdapterError.networkError(error);
    }

    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      return AdapterError.rateLimited(retryAfter ? parseInt(retryAfter) : undefined);
    }

    if (error.response?.status >= 500) {
      return AdapterError.serverError(error.response.status, error);
    }

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

    if (error.name === 'ParserError' || error.message?.includes('parse')) {
      return AdapterError.parsingError(error.message, error);
    }

    return AdapterError.unknown(error);
  }
}

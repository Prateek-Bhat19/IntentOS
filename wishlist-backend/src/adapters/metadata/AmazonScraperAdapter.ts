import * as cheerio from 'cheerio';
import { IMetadataAdapter, MetadataFetchResult, ProductMetadata } from './IMetadataAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { createHttpClient } from '../utils/httpClient';
import { matchesDomain } from '../utils/urlParser';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';

/**
 * Amazon-specific scraper adapter
 * Uses Amazon-specific CSS selectors for better data extraction
 * Fallback when Canopy API is not available or rate limited
 */
export class AmazonScraperAdapter implements IMetadataAdapter {
  readonly name = 'AmazonScraper';
  private httpClient = createHttpClient({ timeout: adapterConfig.timeoutMs });

  canHandle(url: string): boolean {
    return matchesDomain(url, ['*.amazon.in', '*.amazon.com', '*.amazon.co.uk']);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    try {
      if (!this.canHandle(url)) {
        return {
          success: false,
          error: AdapterError.invalidUrl(url),
        };
      }

      logger.debug({ url, adapter: this.name }, 'Scraping Amazon product');

      const response = await this.httpClient.get(url);

      if (response.status >= 400) {
        return {
          success: false,
          error: this.handleHttpError(response.status, url),
        };
      }

      const html = response.data;
      const $ = cheerio.load(html) as unknown as cheerio.CheerioAPI;

      const metadata = {
        title: this.extractTitle($),
        description: this.extractDescription($),
        imageUrl: this.extractImage($),
        price: this.extractPrice($),
        currency: 'INR', // Default for amazon.in
        availability: this.extractAvailability($),
        brand: this.extractBrand($),
        source: this.name,
        fetchedAt: new Date().toISOString(),
      };

      // Validate that we got meaningful data
      if (!metadata.title || !metadata.price) {
        logger.warn({ url, title: metadata.title, price: metadata.price }, 'Low quality data extracted');
      }

      logger.debug(
        { title: metadata.title, price: metadata.price },
        'Amazon scraping successful'
      );

      return {
        success: true,
        data: metadata,
      };
    } catch (error: any) {
      logger.error({ error: error.message, url }, 'Amazon scraping failed');
      
      return {
        success: false,
        error: this.classifyError(error),
      };
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try multiple Amazon title selectors
    const selectors = [
      '#productTitle',
      'h1.product-title',
      'h1#title',
      'span#productTitle',
    ];

    for (const selector of selectors) {
      const title = $(selector).first().text().trim();
      if (title) return title;
    }

    // Fallback to Open Graph
    return $('meta[property="og:title"]').attr('content')?.trim();
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    // Try feature bullets first
    const bullets = $('#feature-bullets li').map((_, el) => $(el).text().trim()).get().join(' ');
    if (bullets) return bullets;

    // Try product description
    const desc = $('#productDescription').text().trim();
    if (desc) return desc;

    // Fallback to Open Graph
    return $('meta[property="og:description"]').attr('content')?.trim();
  }

  private extractImage($: cheerio.CheerioAPI): string | undefined {
    // Try main product image
    const selectors = [
      '#landingImage',
      '#imgBlkFront',
      '#main-image',
      'img.a-dynamic-image',
    ];

    for (const selector of selectors) {
      const src = $(selector).first().attr('src') || $(selector).first().attr('data-old-hires');
      if (src) return src;
    }

    // Fallback to Open Graph
    return $('meta[property="og:image"]').attr('content');
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    // Try multiple Amazon price selectors
    const selectors = [
      '.a-price-whole',
      '.priceToPay .a-price-whole',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-offscreen',
      'span.a-price-whole',
    ];

    for (const selector of selectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
        // Remove currency symbols and commas
        const cleanPrice = priceText.replace(/[^\d.]/g, '');
        const price = parseFloat(cleanPrice);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }

    // Try Open Graph
    const ogPrice = $('meta[property="product:price:amount"]').attr('content');
    if (ogPrice) {
      const price = parseFloat(ogPrice);
      if (!isNaN(price)) return price;
    }

    return undefined;
  }

  private extractAvailability($: cheerio.CheerioAPI): 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' {
    const availText = $('#availability').text().toLowerCase();
    
    if (availText.includes('in stock')) return 'IN_STOCK';
    if (availText.includes('out of stock')) return 'OUT_OF_STOCK';
    if (availText.includes('currently unavailable')) return 'OUT_OF_STOCK';
    if (availText.includes('temporarily out of stock')) return 'OUT_OF_STOCK';
    
    // Check for "Add to Cart" button as indicator
    if ($('#add-to-cart-button').length > 0) return 'IN_STOCK';
    
    return 'UNKNOWN';
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    // Try byline info
    let brand = $('#bylineInfo').text().trim();
    if (brand) {
      brand = brand.replace('Visit the', '').replace('Store', '').replace('Brand:', '').trim();
      if (brand) return brand;
    }

    // Try brand link
    brand = $('a#brand').text().trim();
    if (brand) return brand;

    // Fallback to Open Graph
    return $('meta[property="og:brand"]').attr('content')?.trim();
  }

  private handleHttpError(status: number, url: string): AdapterError {
    if (status === 404) {
      return AdapterError.productNotFound(url);
    }

    if (status === 403) {
      return new AdapterError(
        ErrorType.FORBIDDEN,
        'Access forbidden - possible bot detection',
        false
      );
    }

    if (status >= 500) {
      return AdapterError.serverError(status);
    }

    return new AdapterError(
      ErrorType.UNKNOWN_ERROR,
      `HTTP ${status} error`,
      true
    );
  }

  private classifyError(error: any): AdapterError {
    if (error instanceof AdapterError) {
      return error;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return AdapterError.timeout(adapterConfig.timeoutMs);
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return AdapterError.networkError(error);
    }

    if (error.response?.status === 429) {
      return AdapterError.rateLimited();
    }

    if (error.response?.status >= 500) {
      return AdapterError.serverError(error.response.status, error);
    }

    if (error.response?.status === 404) {
      return AdapterError.productNotFound(error.config?.url || 'unknown');
    }

    return AdapterError.unknown(error);
  }
}

import * as cheerio from 'cheerio';
import { IMetadataAdapter, MetadataFetchResult, ProductMetadata } from './IMetadataAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { createHttpClient } from '../utils/httpClient';
import { matchesDomain } from '../utils/urlParser';
import { adapterConfig } from '../config/adapterConfig';
import { logger } from '../../logger';

/**
 * Flipkart-specific scraper adapter
 * Uses Flipkart-specific CSS selectors for data extraction
 */
export class FlipkartScraperAdapter implements IMetadataAdapter {
  readonly name = 'FlipkartScraper';
  private httpClient = createHttpClient({ timeout: adapterConfig.timeoutMs });

  canHandle(url: string): boolean {
    return matchesDomain(url, ['*.flipkart.com']);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    try {
      if (!this.canHandle(url)) {
        return {
          success: false,
          error: AdapterError.invalidUrl(url),
        };
      }

      logger.debug({ url, adapter: this.name }, 'Scraping Flipkart product');

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
        currency: 'INR',
        availability: this.extractAvailability($),
        brand: this.extractBrand($),
        source: this.name,
        fetchedAt: new Date().toISOString(),
      };

      if (!metadata.title || !metadata.price) {
        logger.warn({ url, title: metadata.title, price: metadata.price }, 'Low quality data extracted');
      }

      logger.debug(
        { title: metadata.title, price: metadata.price },
        'Flipkart scraping successful'
      );

      return {
        success: true,
        data: metadata,
      };
    } catch (error: any) {
      logger.error({ error: error.message, url }, 'Flipkart scraping failed');
      
      return {
        success: false,
        error: this.classifyError(error),
      };
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Flipkart title selectors
    const selectors = [
      'span.B_NuCI',
      'h1.yhB1nd',
      'span.VU-ZEz',
      '.B_NuCI',
    ];

    for (const selector of selectors) {
      const title = $(selector).first().text().trim();
      if (title) return title;
    }

    return $('meta[property="og:title"]').attr('content')?.trim();
  }

  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    // Try product description
    const desc = $('._1mXcCf').text().trim();
    if (desc) return desc;

    // Try specifications
    const specs = $('._2418kt').text().trim();
    if (specs) return specs;

    return $('meta[property="og:description"]').attr('content')?.trim();
  }

  private extractImage($: cheerio.CheerioAPI): string | undefined {
    // Flipkart image selectors
    const selectors = [
      'img._396cs4',
      'img._2r_T1I',
      'div._3kidJX img',
    ];

    for (const selector of selectors) {
      const src = $(selector).first().attr('src');
      if (src) return src;
    }

    return $('meta[property="og:image"]').attr('content');
  }

  private extractPrice($: cheerio.CheerioAPI): number | undefined {
    // Flipkart price selectors
    const selectors = [
      '._30jeq3',
      '.selling-price',
      '._1vC4OE',
      'div._30jeq3',
      '._25b18c ._30jeq3',
    ];

    for (const selector of selectors) {
      const priceText = $(selector).first().text().trim();
      if (priceText) {
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
    // Check for "Add to Cart" button
    const addToCart = $('._2KpZ6l').text().toLowerCase();
    if (addToCart.includes('add to cart')) return 'IN_STOCK';

    // Check for "Notify Me" button
    const notifyMe = $('._2KpZ6l').text().toLowerCase();
    if (notifyMe.includes('notify me')) return 'OUT_OF_STOCK';

    // Check availability text
    const availText = $('._16FRp0').text().toLowerCase();
    if (availText.includes('in stock')) return 'IN_STOCK';
    if (availText.includes('out of stock')) return 'OUT_OF_STOCK';
    if (availText.includes('currently unavailable')) return 'OUT_OF_STOCK';

    return 'UNKNOWN';
  }

  private extractBrand($: cheerio.CheerioAPI): string | undefined {
    // Try brand link
    const brand = $('._2WkVRV').first().text().trim();
    if (brand) return brand;

    // Try from title (often includes brand)
    const title = this.extractTitle($);
    if (title) {
      const brandMatch = title.split(' ')[0];
      if (brandMatch) return brandMatch;
    }

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

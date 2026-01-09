import { chromium, Browser, Page } from 'playwright';
import { IMetadataAdapter, MetadataFetchResult } from './IMetadataAdapter';
import { AdapterError } from '../errors/AdapterError';
import { isValidUrl } from '../utils/urlParser';
import { logger } from '../../logger';

interface ScrapedData {
    title?: string;
    price?: number;
    imageUrl?: string;
    images?: string[];
    description?: string;
    brand?: string;
    availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
    currency?: string;
    specifications?: Record<string, string>;
    rating?: number;
    reviewCount?: number;
    highlights?: string[];
}

/**
 * Universal Playwright-based scraper
 * Works as a fallback for any e-commerce site
 * More reliable than Puppeteer with better stealth capabilities
 */
export class PlaywrightAdapter implements IMetadataAdapter {
  readonly name = 'Playwright (Universal)';

  canHandle(url: string): boolean {
    // Can handle any valid HTTP(S) URL
    return isValidUrl(url);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    logger.debug({ url, adapter: this.name }, 'Starting Playwright scraping');
    
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      // Navigate with timeout
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for body to be ready
      await page.waitForLoadState('domcontentloaded');

      // Extract data from the page
      const metadata: ScrapedData = await page.evaluate(() => {
        const getText = (selector: string) => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || undefined;
        };

        const getAllText = (selector: string): string[] => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent?.trim() || '').filter(Boolean);
        };

        const getAttr = (selector: string, attr: string) => {
          const el = document.querySelector(selector);
          return el?.getAttribute(attr) || undefined;
        };

        const getAllAttr = (selector: string, attr: string): string[] => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.getAttribute(attr) || '').filter(Boolean);
        };

        // Title - Use Open Graph and common patterns
        const title = 
          getAttr('meta[property="og:title"]', 'content') ||
          getText('h1') ||
          getText('title') ||
          undefined;

        // Price - Look for meta tags and common price patterns
        let price: number | undefined;
        const ogPrice = getAttr('meta[property="product:price:amount"]', 'content');
        if (ogPrice) {
          price = parseFloat(ogPrice);
        }

        if (!price || isNaN(price)) {
          // Try common price selectors
          const priceSelectors = [
            '[itemprop="price"]',
            '.price',
            '.product-price',
            '[data-price]',
          ];

          for (const selector of priceSelectors) {
            const priceText = getText(selector) || getAttr(selector, 'content') || getAttr(selector, 'data-price');
            if (priceText) {
              const cleaned = priceText.replace(/[^\d.]/g, '');
              const val = parseFloat(cleaned);
              if (!isNaN(val) && val > 0) {
                price = val;
                break;
              }
            }
          }
        }

        // Images - Get from Open Graph and common patterns
        const images: string[] = [];
        const ogImage = getAttr('meta[property="og:image"]', 'content');
        if (ogImage) images.push(ogImage);

        const productImages = getAllAttr('[itemprop="image"]', 'src');
        images.push(...productImages.filter(img => !images.includes(img)));

        const imageUrl = images[0];

        // Description
        const description = 
          getAttr('meta[property="og:description"]', 'content') ||
          getAttr('meta[name="description"]', 'content') ||
          getText('[itemprop="description"]') ||
          undefined;

        // Brand
        const brand = 
          getAttr('meta[property="og:brand"]', 'content') ||
          getAttr('meta[itemprop="brand"]', 'content') ||
          getText('[itemprop="brand"]') ||
          undefined;

        // Specifications - Try to find common spec tables
        const specifications: Record<string, string> = {};
        document.querySelectorAll('table tr').forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length === 2) {
            const key = cells[0].textContent?.trim();
            const value = cells[1].textContent?.trim();
            if (key && value && key.length < 100) {
              specifications[key] = value;
            }
          }
        });

        // Rating
        let rating: number | undefined;
        const ratingText = getText('[itemprop="ratingValue"]') || getAttr('[itemprop="ratingValue"]', 'content');
        if (ratingText) {
          const val = parseFloat(ratingText);
          if (!isNaN(val)) rating = val;
        }

        // Review Count
        let reviewCount: number | undefined;
        const reviewText = getText('[itemprop="reviewCount"]') || getAttr('[itemprop="reviewCount"]', 'content');
        if (reviewText) {
          const match = reviewText.match(/(\d+(?:,\d+)*)/);
          if (match) reviewCount = parseInt(match[1].replace(/,/g, ''));
        }

        // Availability
        let availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' = 'UNKNOWN';
        const availLink = getAttr('link[itemprop="availability"]', 'href');
        if (availLink) {
          if (availLink.includes('InStock')) availability = 'IN_STOCK';
          else if (availLink.includes('OutOfStock')) availability = 'OUT_OF_STOCK';
        }

        // Currency
        const currency = 
          getAttr('meta[property="product:price:currency"]', 'content') ||
          getAttr('meta[itemprop="priceCurrency"]', 'content') ||
          'INR';

        return {
          title,
          price,
          imageUrl,
          images: images.length > 0 ? images : undefined,
          description,
          brand,
          availability,
          currency,
          specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
          rating,
          reviewCount,
        };
      });

      if (!metadata.title) {
        logger.warn({ url }, 'Playwright returned empty title');
      }

      logger.debug({ title: metadata.title }, 'Playwright scraping successful');

      await browser.close();

      return {
        success: true,
        data: {
          ...metadata,
          source: this.name,
          fetchedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error({ error: error.message, url }, 'Playwright scraping failed');

      if (browser) {
        await browser.close().catch(() => {});
      }

      return {
        success: false,
        error: AdapterError.unknown(error),
      };
    }
  }
}

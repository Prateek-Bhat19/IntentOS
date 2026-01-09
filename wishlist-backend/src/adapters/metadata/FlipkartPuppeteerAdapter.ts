
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { IMetadataAdapter, MetadataFetchResult } from './IMetadataAdapter';
import { AdapterError } from '../errors/AdapterError';
import { matchesDomain } from '../utils/urlParser';
import { logger } from '../../logger';

// Add stealth plugin to evade bot detection
puppeteer.use(StealthPlugin());

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
    _debug: {
        pageTitle: string;
        pageUrl: string;
        bodyLength: number;
    };
}

export class FlipkartPuppeteerAdapter implements IMetadataAdapter {
  readonly name = 'FlipkartPuppeteer (Stealth)';

  canHandle(url: string): boolean {
    return matchesDomain(url, ['*.flipkart.com']);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    logger.debug({ url, adapter: this.name }, 'Starting Puppeteer scraping');
    
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080',
        ],
      });

      const page = await browser.newPage();
      
      // Set viewport to simulate real user
      await page.setViewport({ width: 1920, height: 1080 });

      // Set User Agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Navigate with shorter timeout (20s instead of 30s)
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (navError: any) {
        logger.warn({ url, error: navError.message }, 'Navigation timeout, trying with networkidle0');
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {
          throw new Error('Page navigation failed after retries');
        });
      }

      // Wait for product content to load (reduced timeout)
      await page.waitForSelector('span.VU-ZEz, span.B_NuCI, h1.yhB1nd', { timeout: 5000 }).catch(() => {
        logger.warn({ url }, 'Product title selector not found, continuing anyway');
      });

      // Extract data in browser context
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

        // Debug info
        const pageTitle = document.title;
        const pageUrl = window.location.href;
        const bodyLength = document.body.innerHTML.length;

        // Title Parsers - Flipkart specific selectors
        const title = 
            getText('span.VU-ZEz') ||
            getText('span.B_NuCI') || 
            getText('h1.yhB1nd') || 
            getText('.B_NuCI') ||
            getAttr('meta[property="og:title"]', 'content');

        // Price Parsers - Flipkart specific
        let price = 0;
        const priceSelectors = [
            'div._30jeq3',
            '._30jeq3',
            '.selling-price',
            '._1vC4OE',
            '._25b18c ._30jeq3',
        ];
        
        for (const selector of priceSelectors) {
            const text = getText(selector);
            if (text) {
                const clean = text.replace(/[^\d.]/g, '');
                const val = parseFloat(clean);
                if (!isNaN(val) && val > 0) {
                    price = val;
                    break;
                }
            }
        }
        
        // Image Parsers - Get all images (main + gallery)
        const images: string[] = [];
        
        // Main product image
        const mainImageSrc = 
            getAttr('img._396cs4', 'src') || 
            getAttr('img._2r_T1I', 'src') || 
            getAttr('div._3kidJX img', 'src');
        if (mainImageSrc) {
            // Convert to high-res by replacing dimension parameters
            const highResSrc = mainImageSrc
                .replace(/\/\d+\/\d+\//, '/1500/1500/')
                .replace(/\?q=\d+/, '?q=100');
            images.push(highResSrc);
        }
        
        // Get gallery images
        const galleryImages = getAllAttr('._2E8Ylw img, ._3kidJX img, .q6DClP img', 'src')
          .map(src => src.replace(/\/\d+\/\d+\//, '/1500/1500/').replace(/\?q=\d+/, '?q=100'))
          .filter(src => !images.includes(src));
        images.push(...galleryImages);
        
        // Fallback to OG image
        const ogImage = getAttr('meta[property="og:image"]', 'content');
        if (ogImage && images.length === 0) {
            images.push(ogImage);
        }
        
        const imageUrl = images[0]; // Backward compatibility
            
        // Description Parsers - Get highlights and description
        const highlights = getAllText('div._1mXcCf li, div._3eAQiD li, ._1AtVbE ul li');
        const productDesc = getText('div._1mXcCf p') || getText('div._3eAQiD');
        const description = highlights.length > 0 
            ? highlights.join(' • ') 
            : productDesc || getAttr('meta[property="og:description"]', 'content');
            
        // Brand Parsers
        let brand = getText('._2WkVRV');
        if (!brand) {
            // Try from title (often includes brand)
            const titleText = title;
            if (titleText) {
                const brandMatch = titleText.split(' ')[0];
                if (brandMatch) brand = brandMatch;
            }
        }
        if (!brand) {
            brand = getAttr('meta[property="og:brand"]', 'content') || undefined;
        }

        // Specifications - Extract from product specifications
        const specifications: Record<string, string> = {};
        const specRows = document.querySelectorAll('._2f34Il table tr');
        specRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const key = cells[0].textContent?.trim();
                const value = cells[1].textContent?.trim();
                if (key && value) {
                    specifications[key] = value;
                }
            }
        });

        // Rating and Reviews
        let rating: number | undefined;
        let reviewCount: number | undefined;
        
        const ratingText = getText('div._3LWZlK');
        if (ratingText) {
            const val = parseFloat(ratingText);
            if (!isNaN(val)) rating = val;
        }
        
        const reviewText = getText('span._2_R_DZ');
        if (reviewText) {
            const match = reviewText.match(/(\d+(?:,\d+)*)/);
            if (match) reviewCount = parseInt(match[1].replace(/,/g, ''));
        }

        // Availability Parsers
        const addToCartBtn = getText('._2KpZ6l');
        let availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' = 'UNKNOWN';
        
        if (addToCartBtn?.toLowerCase().includes('add to cart')) {
            availability = 'IN_STOCK';
        } else if (addToCartBtn?.toLowerCase().includes('notify me')) {
            availability = 'OUT_OF_STOCK';
        } else {
            const availText = (getText('._16FRp0') || '').toLowerCase();
            if (availText.includes('in stock')) availability = 'IN_STOCK';
            if (availText.includes('out of stock') || availText.includes('unavailable')) availability = 'OUT_OF_STOCK';
        }

        return {
            title,
            price,
            imageUrl,
            images: images.length > 0 ? images : undefined,
            description,
            brand,
            availability,
            currency: 'INR',
            specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
            rating,
            reviewCount,
            highlights: highlights.length > 0 ? highlights : undefined,
            _debug: { pageTitle, pageUrl, bodyLength }
        };
      });

      if (!metadata.title) {
         logger.warn({ url }, 'Puppeteer returned empty title');
      }

      logger.debug({ title: metadata.title }, 'Puppeteer scraping successful');

      // Remove _debug before returning
      const { _debug, ...cleanMetadata } = metadata;

      return {
        success: true,
        data: {
            ...cleanMetadata,
            source: this.name,
            fetchedAt: new Date().toISOString(),
        } 
      };

    } catch (error: any) {
        logger.error({ error: error.message, url, stack: error.stack }, 'Puppeteer scraping failed');
        
        if (error.message?.includes('Navigation') || error.message?.includes('timeout')) {
          return {
            success: false,
            error: new AdapterError(
              'TIMEOUT' as any,
              `Page load timeout: ${error.message}`,
              true,
              error
            )
          };
        }
        
        if (error.message?.includes('browser')) {
          return {
            success: false,
            error: new AdapterError(
              'UNKNOWN_ERROR' as any,
              `Browser error: ${error.message}`,
              true,
              error
            )
          };
        }
        
        return {
            success: false,
            error: AdapterError.unknown(error)
        };
    } finally {
        if (browser) {
          await browser.close().catch(err => {
            logger.error({ error: err.message }, 'Failed to close browser');
          });
        }
    }
  }
}

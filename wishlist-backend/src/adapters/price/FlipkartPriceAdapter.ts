import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { IPriceAdapter, PriceCheckResult } from './IPriceAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { matchesDomain } from '../utils/urlParser';
import { logger } from '../../logger';

// Add stealth plugin to evade bot detection
puppeteer.use(StealthPlugin());

/**
 * Flipkart price adapter using Puppeteer with stealth mode.
 * Bypasses bot detection that blocks the simple axios-based approach.
 */
export class FlipkartPriceAdapter implements IPriceAdapter {
  readonly name = 'FlipkartPrice (Stealth)';

  canHandle(url: string): boolean {
    return matchesDomain(url, ['*.flipkart.com']);
  }

  async checkPrice(url: string): Promise<PriceCheckResult> {
    logger.debug({ url, adapter: this.name }, 'Starting Puppeteer price check');

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
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (navError: any) {
        logger.warn({ url, error: navError.message }, 'Navigation timeout, retrying');
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {
          throw new Error('Page navigation failed after retries');
        });
      }

      // Wait for price element
      await page
        .waitForSelector('div._30jeq3, ._16Jk6d', { timeout: 5000 })
        .catch(() => {
          logger.warn({ url }, 'Flipkart price selector not found immediately, continuing anyway');
        });

      const priceData = await page.evaluate(() => {
        const getText = (selector: string) => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || undefined;
        };

        // ── Current Price ──────────────────────────────────────────────────────
        // Flipkart uses obfuscated class names that change periodically;
        // we try multiple known ones for resilience.
        let priceStr: string | undefined;
        const priceSelectors = [
          'div._30jeq3',           // Primary selling price (most reliable)
          '._16Jk6d',              // Alternate
          '._25b18c ._30jeq3',     // With parent context
          '._1vC4OE',              // Fallback
          '.selling-price',
        ];
        for (const sel of priceSelectors) {
          const text = getText(sel);
          if (text) { priceStr = text; break; }
        }

        // ── Original / MRP Price ───────────────────────────────────────────────
        let originalPriceStr: string | undefined;
        const originalSelectors = [
          '._3I9_wc',              // Strikethrough MRP
          '._2p6lqe',              // Alternate MRP
          '.Zi1Hm7',               // Another known variant
        ];
        for (const sel of originalSelectors) {
          const text = getText(sel);
          if (text) { originalPriceStr = text; break; }
        }

        // ── Availability ───────────────────────────────────────────────────────
        const addToCartText = (getText('._2KpZ6l') || '').toLowerCase();
        let availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' = 'UNKNOWN';
        if (addToCartText.includes('add to cart') || addToCartText.includes('buy now')) {
          availability = 'IN_STOCK';
        } else if (addToCartText.includes('notify me')) {
          availability = 'OUT_OF_STOCK';
        } else {
          // Fallback: check page text
          const bodyText = (document.body?.textContent || '').toLowerCase();
          if (bodyText.includes('out of stock')) availability = 'OUT_OF_STOCK';
        }

        return { priceStr, originalPriceStr, availability };
      });

      if (!priceData.priceStr) {
        return {
          success: false,
          error: AdapterError.parsingError('Could not extract price from Flipkart page'),
        };
      }

      const parsePrice = (s: string) => {
        const clean = s.replace(/[^\d.]/g, '');
        const val = parseFloat(clean);
        return isNaN(val) ? undefined : val;
      };

      const price = parsePrice(priceData.priceStr);
      if (!price) {
        return {
          success: false,
          error: AdapterError.parsingError('Flipkart price could not be parsed'),
        };
      }

      const originalPrice = priceData.originalPriceStr
        ? parsePrice(priceData.originalPriceStr)
        : undefined;

      logger.info({ url, price, adapter: this.name }, 'Flipkart price checked successfully');

      return {
        success: true,
        data: {
          price,
          currency: 'INR',
          availability: priceData.availability,
          originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
          source: this.name,
          checkedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error({ url, error: error.message }, 'Flipkart price check failed');

      if (error.message?.includes('Navigation') || error.message?.includes('timeout')) {
        return {
          success: false,
          error: new AdapterError(ErrorType.TIMEOUT, `Page load timeout: ${error.message}`, true),
        };
      }

      return {
        success: false,
        error: AdapterError.unknown(error),
      };
    } finally {
      if (browser) {
        await browser.close().catch((err) => {
          logger.error({ error: err.message }, 'Failed to close browser');
        });
      }
    }
  }
}

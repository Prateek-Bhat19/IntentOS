import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import { IPriceAdapter, PriceCheckResult } from './IPriceAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { matchesDomain } from '../utils/urlParser';
import { logger } from '../../logger';

// Add stealth plugin to evade bot detection
puppeteer.use(StealthPlugin());

// Plain string script — bypasses esbuild __name injection in tsx/esbuild
const FLIPKART_PRICE_SCRIPT = `(function() {
  function getText(selector) {
    var el = document.querySelector(selector);
    return el ? (el.textContent || '').trim() || undefined : undefined;
  }

  var priceStr;
  var priceSelectors = ['div._30jeq3', '._16Jk6d', '._25b18c ._30jeq3', '._1vC4OE', '.selling-price'];
  for (var i = 0; i < priceSelectors.length; i++) {
    var t = getText(priceSelectors[i]);
    if (t) { priceStr = t; break; }
  }

  var originalPriceStr;
  var originalSelectors = ['._3I9_wc', '._2p6lqe', '.Zi1Hm7'];
  for (var j = 0; j < originalSelectors.length; j++) {
    var ot = getText(originalSelectors[j]);
    if (ot) { originalPriceStr = ot; break; }
  }

  var addToCartText = (getText('._2KpZ6l') || '').toLowerCase();
  var availability = 'UNKNOWN';
  if (addToCartText.indexOf('add to cart') !== -1 || addToCartText.indexOf('buy now') !== -1) {
    availability = 'IN_STOCK';
  } else if (addToCartText.indexOf('notify me') !== -1) {
    availability = 'OUT_OF_STOCK';
  } else {
    var bodyText = (document.body && document.body.textContent || '').toLowerCase();
    if (bodyText.indexOf('out of stock') !== -1) availability = 'OUT_OF_STOCK';
  }

  return { priceStr: priceStr, originalPriceStr: originalPriceStr, availability: availability };
})()`;

/**
 * Flipkart price adapter using Puppeteer with stealth mode.
 */
export class FlipkartPriceAdapter implements IPriceAdapter {
  readonly name = 'FlipkartPrice (Stealth)';

  canHandle(url: string): boolean {
    return matchesDomain(url, ['flipkart.com', '*.flipkart.com']);
  }

  async checkPrice(url: string): Promise<PriceCheckResult> {
    logger.debug({ url, adapter: this.name }, 'Starting Puppeteer price check');

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || executablePath(),
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

      await page
        .waitForSelector('div._30jeq3, ._16Jk6d', { timeout: 5000 })
        .catch(() => {
          logger.warn({ url }, 'Flipkart price selector not found immediately, continuing anyway');
        });

      // Use plain string to bypass esbuild __name injection
      const priceData = await page.evaluate(FLIPKART_PRICE_SCRIPT) as {
        priceStr?: string;
        originalPriceStr?: string;
        availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
      };

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

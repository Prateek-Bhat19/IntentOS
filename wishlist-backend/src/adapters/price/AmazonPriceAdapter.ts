import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { IPriceAdapter, PriceCheckResult } from './IPriceAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { matchesDomain } from '../utils/urlParser';
import { logger } from '../../logger';

// Add stealth plugin to evade bot detection
puppeteer.use(StealthPlugin());

/**
 * Amazon price adapter using Puppeteer with stealth mode.
 * Bypasses bot detection that blocks the simple axios-based approach.
 */
export class AmazonPriceAdapter implements IPriceAdapter {
  readonly name = 'AmazonPrice (Stealth)';

  canHandle(url: string): boolean {
    return matchesDomain(url, ['*.amazon.in', '*.amazon.com', '*.amazon.co.uk']);
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

      // Wait for price element to appear
      await page.waitForSelector('.a-price-whole, #priceblock_ourprice, #priceblock_dealprice', {
        timeout: 5000,
      }).catch(() => {
        logger.warn({ url }, 'Price selector not found immediately, continuing anyway');
      });

      const priceData = await page.evaluate(() => {
        const getText = (selector: string) => {
          const el = document.querySelector(selector);
          return el?.textContent?.trim() || undefined;
        };
        const getAttr = (selector: string, attr: string) => {
          const el = document.querySelector(selector);
          return el?.getAttribute(attr) || undefined;
        };

        // ── Current Price ──────────────────────────────────────────────────────
        let priceStr: string | undefined;
        const priceSelectors = [
          '.priceToPay .a-price-whole',      // Buy Now price (most reliable)
          '.a-price-whole',                   // Generic price-whole
          '#priceblock_ourprice',             // Old layout
          '#priceblock_dealprice',            // Deal price
          '.a-price .a-offscreen',            // Screen-reader price (includes paise)
          'span.a-price-whole',
        ];
        for (const sel of priceSelectors) {
          const text = getText(sel);
          if (text) { priceStr = text; break; }
        }

        // ── Original / MRP Price ───────────────────────────────────────────────
        let originalPriceStr: string | undefined;
        const originalSelectors = [
          '.a-text-price .a-offscreen',       // Strikethrough price
          '#listPrice',
          '.basisPrice .a-offscreen',
        ];
        for (const sel of originalSelectors) {
          const text = getText(sel);
          if (text) { originalPriceStr = text; break; }
        }

        // ── Availability ───────────────────────────────────────────────────────
        const availText = (getText('#availability') || '').toLowerCase();
        let availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN' = 'UNKNOWN';
        if (availText.includes('in stock') || !!document.querySelector('#add-to-cart-button')) {
          availability = 'IN_STOCK';
        } else if (availText.includes('out of stock') || availText.includes('unavailable')) {
          availability = 'OUT_OF_STOCK';
        }

        // ── Currency ───────────────────────────────────────────────────────────
        const currency =
          getAttr('meta[property="product:price:currency"]', 'content') ||
          (window.location.hostname.includes('.in') ? 'INR' : 'USD');

        // ── CAPTCHA detection ──────────────────────────────────────────────────
        const hasCaptcha = !!document.querySelector('#captchacharacters');

        return { priceStr, originalPriceStr, availability, currency, hasCaptcha };
      });

      if (priceData.hasCaptcha) {
        logger.warn({ url }, 'Amazon CAPTCHA detected — price check blocked');
        return {
          success: false,
          error: new AdapterError(
            ErrorType.FORBIDDEN,
            'Amazon CAPTCHA detected',
            true // retryable
          ),
        };
      }

      if (!priceData.priceStr) {
        return {
          success: false,
          error: AdapterError.parsingError('Could not extract price from Amazon page'),
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
          error: AdapterError.parsingError('Amazon price could not be parsed'),
        };
      }

      const originalPrice = priceData.originalPriceStr
        ? parsePrice(priceData.originalPriceStr)
        : undefined;

      logger.info({ url, price, adapter: this.name }, 'Amazon price checked successfully');

      return {
        success: true,
        data: {
          price,
          currency: priceData.currency,
          availability: priceData.availability,
          originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
          source: this.name,
          checkedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      logger.error({ url, error: error.message }, 'Amazon price check failed');

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

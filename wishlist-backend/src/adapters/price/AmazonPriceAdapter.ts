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
const AMAZON_PRICE_SCRIPT = `(function() {
  function getText(selector) {
    var el = document.querySelector(selector);
    return el ? (el.textContent || '').trim() || undefined : undefined;
  }
  function getAttr(selector, attr) {
    var el = document.querySelector(selector);
    return el ? el.getAttribute(attr) || undefined : undefined;
  }

  var priceStr;
  var priceSelectors = [
    '.priceToPay .a-price-whole',
    '.a-price-whole',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price .a-offscreen',
    'span.a-price-whole'
  ];
  for (var i = 0; i < priceSelectors.length; i++) {
    var t = getText(priceSelectors[i]);
    if (t) { priceStr = t; break; }
  }

  var originalPriceStr;
  var originalSelectors = ['.a-text-price .a-offscreen', '#listPrice', '.basisPrice .a-offscreen'];
  for (var j = 0; j < originalSelectors.length; j++) {
    var ot = getText(originalSelectors[j]);
    if (ot) { originalPriceStr = ot; break; }
  }

  var availText = (getText('#availability') || '').toLowerCase();
  var availability = 'UNKNOWN';
  if (availText.indexOf('in stock') !== -1 || document.querySelector('#add-to-cart-button')) {
    availability = 'IN_STOCK';
  } else if (availText.indexOf('out of stock') !== -1 || availText.indexOf('unavailable') !== -1) {
    availability = 'OUT_OF_STOCK';
  }

  var currency = getAttr('meta[property="product:price:currency"]', 'content') ||
    (window.location.hostname.indexOf('.in') !== -1 ? 'INR' : 'USD');

  var hasCaptcha = !!document.querySelector('#captchacharacters');

  return { priceStr: priceStr, originalPriceStr: originalPriceStr, availability: availability, currency: currency, hasCaptcha: hasCaptcha };
})()`;

/**
 * Amazon price adapter using Puppeteer with stealth mode.
 */
export class AmazonPriceAdapter implements IPriceAdapter {
  readonly name = 'AmazonPrice (Stealth)';

  canHandle(url: string): boolean {
    return matchesDomain(url, [
      'amazon.in', '*.amazon.in',
      'amazon.com', '*.amazon.com',
      'amazon.co.uk', '*.amazon.co.uk',
      'amzn.in', '*.amzn.in',
      'amzn.to', '*.amzn.to'
    ]);
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

      await page.waitForSelector('.a-price-whole, #priceblock_ourprice, #priceblock_dealprice', {
        timeout: 5000,
      }).catch(() => {
        logger.warn({ url }, 'Price selector not found immediately, continuing anyway');
      });

      // Use plain string to bypass esbuild __name injection
      const priceData = await page.evaluate(AMAZON_PRICE_SCRIPT) as {
        priceStr?: string;
        originalPriceStr?: string;
        availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
        currency: string;
        hasCaptcha: boolean;
      };

      if (priceData.hasCaptcha) {
        logger.warn({ url }, 'Amazon CAPTCHA detected — price check blocked');
        return {
          success: false,
          error: new AdapterError(ErrorType.FORBIDDEN, 'Amazon CAPTCHA detected', true),
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

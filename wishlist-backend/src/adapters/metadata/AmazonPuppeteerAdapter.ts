
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// executablePath tells puppeteer-extra where puppeteer (full) downloaded Chrome.
// Without this, puppeteer-extra (which wraps puppeteer-core) can't find the browser.
import { executablePath } from 'puppeteer';
import * as fs from 'fs';
import { IMetadataAdapter, MetadataFetchResult } from './IMetadataAdapter';
import { AdapterError, ErrorType } from '../errors/AdapterError';
import { matchesDomain } from '../utils/urlParser';
import { logger } from '../../logger';

// Add stealth plugin to evade bot detection
puppeteer.use(StealthPlugin());

// The browser-side scraping script as a plain string.
// This MUST remain a plain string — DO NOT convert to a function reference.
// Reason: tsx/esbuild injects __name() helpers into serialized functions which
// crashes in the browser context. A string literal bypasses this entirely.
const AMAZON_SCRAPE_SCRIPT = `(function() {
  // ── Helpers ────────────────────────────────────────────────────────────────
  function getText(selector) {
    var el = document.querySelector(selector);
    return el ? (el.textContent || '').trim() || undefined : undefined;
  }
  function getAllText(selector) {
    return Array.from(document.querySelectorAll(selector))
      .map(function(el) { return (el.textContent || '').trim(); })
      .filter(Boolean);
  }
  function getAttr(selector, attr) {
    var el = document.querySelector(selector);
    return el ? el.getAttribute(attr) || undefined : undefined;
  }
  function getAllAttr(selector, attr) {
    return Array.from(document.querySelectorAll(selector))
      .map(function(el) { return el.getAttribute(attr) || ''; })
      .filter(Boolean);
  }

  // ── JSON-LD structured data (Amazon embeds this for SEO) ──────────────────
  var structured = null;
  var jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var s = 0; s < jsonLdScripts.length; s++) {
    try {
      var parsed = JSON.parse(jsonLdScripts[s].textContent || '');
      if (parsed['@graph']) parsed = parsed['@graph'];
      if (Array.isArray(parsed)) {
        for (var g = 0; g < parsed.length; g++) {
          if (parsed[g]['@type'] === 'Product') { structured = parsed[g]; break; }
        }
      } else if (parsed['@type'] === 'Product') {
        structured = parsed;
      }
      if (structured) break;
    } catch(e) {}
  }

  var pageTitle = document.title;
  var pageUrl = window.location.href;
  var hasCaptcha = !!document.querySelector('#captchacharacters');
  var bodyLength = document.body.innerHTML.length;

  // ── Title (JSON-LD → OG → Amazon-specific selectors) ─────────────────────
  var title =
    (structured && structured.name) ||
    getAttr('meta[property="og:title"]', 'content') ||
    getText('#productTitle') ||
    getText('h1.product-title') ||
    getText('h1#title');

  // ── Price (JSON-LD → itemprop → Amazon selectors) ─────────────────────────
  var price = 0;
  var priceDebug = [];
  if (structured && structured.offers) {
    var offer = Array.isArray(structured.offers) ? structured.offers[0] : structured.offers;
    if (offer && offer.price) {
      var pv = parseFloat(String(offer.price).replace(/[^\\d.]/g, ''));
      if (!isNaN(pv) && pv > 0) { price = pv; priceDebug.push({ selector: 'JSON-LD', text: String(offer.price) }); }
    }
  }
  if (!price) {
    var ipp = getAttr('[itemprop="price"]', 'content') || getText('[itemprop="price"]');
    if (ipp) { var ipv = parseFloat(ipp.replace(/[^\\d.]/g, '')); if (!isNaN(ipv) && ipv > 0) { price = ipv; priceDebug.push({ selector: 'itemprop', text: ipp }); } }
  }
  if (!price) {
    var priceSelectors = ['.priceToPay .a-price-whole', '.a-price-whole', '#priceblock_ourprice', '#priceblock_dealprice', '.a-price .a-offscreen', 'span.a-price-whole'];
    for (var i = 0; i < priceSelectors.length; i++) {
      var text = getText(priceSelectors[i]);
      if (text) {
        priceDebug.push({ selector: priceSelectors[i], text: text });
        var clean = text.replace(/[^\\d.]/g, '');
        var val = parseFloat(clean);
        if (!isNaN(val) && val > 0) { price = val; break; }
      }
    }
  }

  // ── Images (JSON-LD → Amazon high-res → OG) ───────────────────────────────
  var images = [];
  if (structured && structured.image) {
    var imgs = Array.isArray(structured.image) ? structured.image : [structured.image];
    imgs.forEach(function(img) { if (typeof img === 'string') images.push(img); else if (img && img.url) images.push(img.url); });
  }
  if (images.length === 0) {
    var mainHighRes = getAttr('#landingImage', 'data-old-hires');
    if (mainHighRes) images.push(mainHighRes);
    var mainSrc = getAttr('#landingImage', 'src') || getAttr('#imgBlkFront', 'src') || getAttr('#main-image', 'src');
    if (mainSrc && images.indexOf(mainSrc) === -1) images.push(mainSrc);
    var galleryImgs = getAllAttr('.imageThumb img', 'src')
      .map(function(src) { return src.replace(/\\._.*?_/, '._AC_SL1500_'); })
      .filter(function(src) { return images.indexOf(src) === -1; });
    images = images.concat(galleryImgs);
  }
  var ogImage = getAttr('meta[property="og:image"]', 'content');
  if (ogImage && images.length === 0) images.push(ogImage);
  var imageUrl = images[0];

  // ── Description (JSON-LD → bullet points → product description) ───────────
  var bulletPoints = getAllText('#feature-bullets li span.a-list-item');
  var productDesc = getText('#productDescription p') || getText('#productDescription');
  var description =
    (structured && structured.description) ||
    (bulletPoints.length > 0 ? bulletPoints.join(' • ') : undefined) ||
    productDesc ||
    getAttr('meta[property="og:description"]', 'content');
  var highlights = bulletPoints.length > 0 ? bulletPoints : undefined;

  // ── Brand (JSON-LD → bylineInfo → itemprop) ───────────────────────────────
  var brand;
  if (structured && structured.brand) {
    brand = typeof structured.brand === 'string' ? structured.brand : structured.brand.name;
  }
  if (!brand) {
    brand = getText('#bylineInfo');
    if (brand) brand = brand.replace('Visit the', '').replace('Store', '').replace('Brand:', '').trim() || undefined;
  }
  if (!brand) brand = getText('a#brand') || getAttr('meta[property="og:brand"]', 'content') || undefined;

  // ── Specs ──────────────────────────────────────────────────────────────────
  var specifications = {};
  Array.from(document.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr'))
    .forEach(function(row) {
      var th = row.querySelector('th');
      var td = row.querySelector('td');
      if (th && td) {
        var key = (th.textContent || '').trim();
        var value = (td.textContent || '').trim();
        if (key && value) specifications[key] = value;
      }
    });

  // ── Rating & Reviews (JSON-LD → Amazon selectors) ─────────────────────────
  var rating;
  var reviewCount;
  if (structured && structured.aggregateRating) {
    var ar = structured.aggregateRating;
    if (ar.ratingValue) rating = parseFloat(ar.ratingValue);
    if (ar.reviewCount) reviewCount = parseInt(ar.reviewCount);
  }
  if (!rating) {
    var ratingText = getText('span.a-icon-alt');
    if (ratingText) { var m = ratingText.match(/(\\d+\\.?\\d*)\\s*out of/); if (m) rating = parseFloat(m[1]); }
  }
  if (!reviewCount) {
    var reviewText = getText('#acrCustomerReviewText');
    if (reviewText) { var rm = reviewText.match(/(\\d+(?:,\\d+)*)/); if (rm) reviewCount = parseInt(rm[1].replace(/,/g, '')); }
  }

  // ── Availability (JSON-LD → #availability → add-to-cart button) ───────────
  var availability = 'UNKNOWN';
  if (structured && structured.offers) {
    var oAvail = Array.isArray(structured.offers) ? structured.offers[0] : structured.offers;
    var avStr = (oAvail && oAvail.availability || '').toLowerCase();
    if (avStr.indexOf('instock') !== -1) availability = 'IN_STOCK';
    else if (avStr.indexOf('outofstock') !== -1) availability = 'OUT_OF_STOCK';
  }
  if (availability === 'UNKNOWN') {
    var availText = (getText('#availability') || '').toLowerCase();
    if (availText.indexOf('in stock') !== -1 || document.querySelector('#add-to-cart-button')) availability = 'IN_STOCK';
    else if (availText.indexOf('out of stock') !== -1 || availText.indexOf('unavailable') !== -1) availability = 'OUT_OF_STOCK';
  }

  return {
    title: title,
    price: price,
    imageUrl: imageUrl,
    images: images.length > 0 ? images : undefined,
    description: description,
    brand: brand,
    availability: availability,
    currency: 'INR',
    specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
    rating: rating,
    reviewCount: reviewCount,
    highlights: highlights,
    _debug: { pageTitle: pageTitle, pageUrl: pageUrl, hasCaptcha: hasCaptcha, bodyLength: bodyLength, hasStructuredData: !!structured, priceDebug: priceDebug }
  };
})()`;

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
        hasCaptcha: boolean;
        bodyLength: number;
        priceDebug?: { selector: string, text: string }[];
    };
}

export class AmazonPuppeteerAdapter implements IMetadataAdapter {
  readonly name = 'AmazonPuppeteer (Stealth)';

  canHandle(url: string): boolean {
    return matchesDomain(url, [
      'amazon.in', '*.amazon.in',
      'amazon.com', '*.amazon.com',
      'amazon.co.uk', '*.amazon.co.uk',
      'amzn.in', '*.amzn.in',
      'amzn.to', '*.amzn.to'
    ]);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    logger.debug({ url, adapter: this.name }, 'Starting Puppeteer scraping');

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
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch (navError: any) {
        logger.warn({ url, error: navError.message }, 'Navigation timeout, trying with networkidle0');
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {
          throw new Error('Page navigation failed after retries');
        });
      }

      // Wait for JSON-LD structured data OR the product title — whichever appears first
      await Promise.race([
        page.waitForSelector('script[type="application/ld+json"]', { timeout: 5000 }),
        page.waitForSelector('#productTitle, #title', { timeout: 5000 }),
      ]).catch(() => {
        logger.warn({ url }, 'No structured data or title found within timeout, continuing anyway');
      });

      // Use evaluate with a plain string — bypasses esbuild __name injection
      const metadata = await page.evaluate(AMAZON_SCRAPE_SCRIPT) as ScrapedData;

      if (metadata._debug.hasCaptcha) {
        logger.warn({ url }, 'Puppeteer encountered CAPTCHA');
      }

      if (!metadata.title) {
        try {
          fs.writeFileSync('debug_log.json', JSON.stringify({
            pageTitle: metadata._debug.pageTitle,
            pageUrl: metadata._debug.pageUrl,
            hasCaptcha: metadata._debug.hasCaptcha,
            bodyLength: metadata._debug.bodyLength,
            url
          }, null, 2));
        } catch (e) {
          logger.error('Failed to write debug log file');
        }
        logger.warn({ url, debug: metadata._debug }, 'Puppeteer returned empty title');
      }

      logger.debug({ title: metadata.title }, 'Puppeteer scraping successful');

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

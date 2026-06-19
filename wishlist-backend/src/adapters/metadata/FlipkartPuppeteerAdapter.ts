
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import { IMetadataAdapter, MetadataFetchResult } from './IMetadataAdapter';
import { AdapterError } from '../errors/AdapterError';
import { matchesDomain } from '../utils/urlParser';
import { logger } from '../../logger';

// Add stealth plugin to evade bot detection
puppeteer.use(StealthPlugin());

// Plain string script — bypasses esbuild __name injection in tsx/esbuild.
// Strategy: JSON-LD structured data first (stable, SEO-embed by Flipkart),
// then semantic attributes (itemprop), then OG tags, then CSS classes as last resort.
const FLIPKART_SCRAPE_SCRIPT = `(function() {
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

  // ── JSON-LD structured data (most stable — Flipkart embeds for SEO) ────────
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
  var bodyLength = document.body.innerHTML.length;

  // ── Title (JSON-LD → OG → h1 → legacy obfuscated classes) ─────────────────
  var title =
    (structured && structured.name) ||
    getAttr('meta[property="og:title"]', 'content') ||
    getText('h1') ||
    getText('span.VU-ZEz') ||
    getText('span.B_NuCI') ||
    getText('h1.yhB1nd') ||
    getText('.B_NuCI');

  // ── Price (JSON-LD → itemprop → legacy classes) ────────────────────────────
  var price = 0;
  if (structured && structured.offers) {
    var offer = Array.isArray(structured.offers) ? structured.offers[0] : structured.offers;
    if (offer && offer.price) {
      var pv = parseFloat(String(offer.price).replace(/[^\\d.]/g, ''));
      if (!isNaN(pv) && pv > 0) price = pv;
    }
  }
  if (!price) {
    var ipp = getAttr('[itemprop="price"]', 'content') || getText('[itemprop="price"]');
    if (ipp) { var ipv = parseFloat(ipp.replace(/[^\\d.]/g, '')); if (!isNaN(ipv) && ipv > 0) price = ipv; }
  }
  if (!price) {
    var priceSelectors = ['div._30jeq3', '._30jeq3', '.selling-price', '._1vC4OE', '._25b18c ._30jeq3', 'div._16Jk6d', '._16Jk6d'];
    for (var i = 0; i < priceSelectors.length; i++) {
      var pt = getText(priceSelectors[i]);
      if (pt) { var pf = parseFloat(pt.replace(/[^\\d.]/g, '')); if (!isNaN(pf) && pf > 0) { price = pf; break; } }
    }
  }

  // ── Images (JSON-LD → itemprop → OG → legacy classes) ─────────────────────
  var images = [];
  if (structured && structured.image) {
    var imgs = Array.isArray(structured.image) ? structured.image : [structured.image];
    imgs.forEach(function(img) { if (typeof img === 'string') images.push(img); else if (img && img.url) images.push(img.url); });
  }
  if (images.length === 0) {
    var itmgSrc = getAttr('[itemprop="image"]', 'src') || getAttr('[itemprop="image"]', 'content');
    if (itmgSrc) images.push(itmgSrc);
  }
  if (images.length === 0) {
    var mainSrc = getAttr('img._396cs4', 'src') || getAttr('img._2r_T1I', 'src') || getAttr('div._3kidJX img', 'src');
    if (mainSrc) images.push(mainSrc.replace(/\\/\\d+\\/\\d+\\//, '/1500/1500/').replace(/\\?q=\\d+/, '?q=100'));
    var galleryImgs = getAllAttr('._2E8Ylw img, ._3kidJX img, .q6DClP img', 'src')
      .map(function(src) { return src.replace(/\\/\\d+\\/\\d+\\//, '/1500/1500/').replace(/\\?q=\\d+/, '?q=100'); })
      .filter(function(src) { return images.indexOf(src) === -1; });
    images = images.concat(galleryImgs);
  }
  var ogImage = getAttr('meta[property="og:image"]', 'content');
  if (ogImage && images.length === 0) images.push(ogImage);
  var imageUrl = images[0];

  // ── Description (JSON-LD → OG → generic highlight lists) ──────────────────
  var description =
    (structured && structured.description) ||
    getAttr('meta[property="og:description"]', 'content') ||
    getAttr('meta[name="description"]', 'content');
  var highlights = getAllText('[class*="highlight"] li, [class*="feature"] li, ul[class*="list"] li');
  if (!description && highlights.length > 0) description = highlights.join(' • ');

  // ── Brand (JSON-LD → itemprop → first word of title) ──────────────────────
  var brand;
  if (structured && structured.brand) {
    brand = typeof structured.brand === 'string' ? structured.brand : structured.brand.name;
  }
  if (!brand) brand = getAttr('[itemprop="brand"]', 'content') || getText('[itemprop="brand"]');
  if (!brand && title) brand = title.split(' ')[0];

  // ── Rating & Reviews (JSON-LD → legacy selectors) ─────────────────────────
  var rating;
  var reviewCount;
  if (structured && structured.aggregateRating) {
    var ar = structured.aggregateRating;
    if (ar.ratingValue) rating = parseFloat(ar.ratingValue);
    if (ar.reviewCount) reviewCount = parseInt(ar.reviewCount);
  }
  if (!rating) {
    var ratingText = getText('div._3LWZlK') || getText('[itemprop="ratingValue"]');
    if (ratingText) { var rv = parseFloat(ratingText); if (!isNaN(rv)) rating = rv; }
  }

  // ── Availability (JSON-LD → any button text) ──────────────────────────────
  var availability = 'UNKNOWN';
  if (structured && structured.offers) {
    var oAvail = Array.isArray(structured.offers) ? structured.offers[0] : structured.offers;
    var avStr = (oAvail && oAvail.availability || '').toLowerCase();
    if (avStr.indexOf('instock') !== -1) availability = 'IN_STOCK';
    else if (avStr.indexOf('outofstock') !== -1) availability = 'OUT_OF_STOCK';
  }
  if (availability === 'UNKNOWN') {
    var allBtns = Array.from(document.querySelectorAll('button, [class*="btn"], [class*="button"]'))
      .map(function(el) { return (el.textContent || '').trim().toLowerCase(); });
    if (allBtns.some(function(t) { return t.indexOf('add to cart') !== -1 || t === 'buy now'; })) availability = 'IN_STOCK';
    else if (allBtns.some(function(t) { return t.indexOf('notify me') !== -1; })) availability = 'OUT_OF_STOCK';
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
    rating: rating,
    reviewCount: reviewCount,
    highlights: highlights.length > 0 ? highlights : undefined,
    _debug: { pageTitle: pageTitle, pageUrl: pageUrl, bodyLength: bodyLength, hasStructuredData: !!structured }
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
    rating?: number;
    reviewCount?: number;
    highlights?: string[];
    _debug: {
        pageTitle: string;
        pageUrl: string;
        bodyLength: number;
        hasStructuredData: boolean;
    };
}

export class FlipkartPuppeteerAdapter implements IMetadataAdapter {
  readonly name = 'FlipkartPuppeteer (Stealth)';

  canHandle(url: string): boolean {
    return matchesDomain(url, ['flipkart.com', '*.flipkart.com']);
  }

  async fetchMetadata(url: string): Promise<MetadataFetchResult> {
    logger.debug({ url, adapter: this.name }, 'Starting Puppeteer scraping');

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: executablePath(),
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

      // Wait for JSON-LD or the product title — whichever appears first
      await Promise.race([
        page.waitForSelector('script[type="application/ld+json"]', { timeout: 5000 }),
        page.waitForSelector('h1, span.VU-ZEz, span.B_NuCI', { timeout: 5000 }),
      ]).catch(() => {
        logger.warn({ url }, 'No title or structured data found within timeout, continuing anyway');
      });

      // Use plain string evaluate — bypasses esbuild __name injection
      const metadata = await page.evaluate(FLIPKART_SCRAPE_SCRIPT) as ScrapedData;

      logger.info({
        url,
        title: metadata.title,
        price: metadata.price,
        hasStructuredData: metadata._debug.hasStructuredData,
      }, 'Flipkart scraping result');

      if (!metadata.title) {
        logger.warn({ url, debug: metadata._debug }, 'Puppeteer returned empty title');
      }

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

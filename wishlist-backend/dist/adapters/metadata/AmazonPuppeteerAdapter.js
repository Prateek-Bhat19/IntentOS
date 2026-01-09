"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonPuppeteerAdapter = void 0;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const fs = __importStar(require("fs"));
const AdapterError_1 = require("../errors/AdapterError");
const urlParser_1 = require("../utils/urlParser");
const logger_1 = require("../../logger");
// Add stealth plugin to evade bot detection
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
class AmazonPuppeteerAdapter {
    constructor() {
        this.name = 'AmazonPuppeteer (Stealth)';
    }
    canHandle(url) {
        return (0, urlParser_1.matchesDomain)(url, ['*.amazon.in', '*.amazon.com', '*.amazon.co.uk']);
    }
    async fetchMetadata(url) {
        logger_1.logger.debug({ url, adapter: this.name }, 'Starting Puppeteer scraping');
        let browser;
        try {
            browser = await puppeteer_extra_1.default.launch({
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
            }
            catch (navError) {
                logger_1.logger.warn({ url, error: navError.message }, 'Navigation timeout, trying with networkidle0');
                // Try again with networkidle0 as fallback
                await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {
                    throw new Error('Page navigation failed after retries');
                });
            }
            // Wait for product content to load (reduced timeout)
            await page.waitForSelector('#productTitle, #title', { timeout: 5000 }).catch(() => {
                logger_1.logger.warn({ url }, 'Product title selector not found, continuing anyway');
            });
            // Extract data in browser context
            const metadata = await page.evaluate(() => {
                const getText = (selector) => {
                    const el = document.querySelector(selector);
                    return el?.textContent?.trim() || undefined;
                };
                const getAllText = (selector) => {
                    const elements = document.querySelectorAll(selector);
                    return Array.from(elements).map(el => el.textContent?.trim() || '').filter(Boolean);
                };
                const getAttr = (selector, attr) => {
                    const el = document.querySelector(selector);
                    return el?.getAttribute(attr) || undefined;
                };
                const getAllAttr = (selector, attr) => {
                    const elements = document.querySelectorAll(selector);
                    return Array.from(elements).map(el => el.getAttribute(attr) || '').filter(Boolean);
                };
                // Debug info
                const pageTitle = document.title;
                const pageUrl = window.location.href;
                const hasCaptcha = !!document.querySelector('#captchacharacters');
                const bodyLength = document.body.innerHTML.length;
                // Title Parsers
                const title = getText('#productTitle') ||
                    getText('h1.product-title') ||
                    getText('h1#title') ||
                    getAttr('meta[property="og:title"]', 'content');
                // Price Parsers
                let price = 0;
                const priceDebug = [];
                const priceSelectors = [
                    '.a-price-whole',
                    '.priceToPay .a-price-whole',
                    '#priceblock_ourprice',
                    '#priceblock_dealprice',
                    '.a-price .a-offscreen',
                    'span.a-price-whole',
                    '.a-price' // Fallback to parent
                ];
                for (const selector of priceSelectors) {
                    const text = getText(selector);
                    if (text) {
                        priceDebug.push({ selector, text });
                        const clean = text.replace(/[^\d.]/g, '');
                        const val = parseFloat(clean);
                        if (!isNaN(val) && val > 0) {
                            price = val;
                            break;
                        }
                    }
                }
                // Image Parsers - Get all images (main + gallery)
                const images = [];
                // Try to get high-res image from landingImage data-old-hires
                const mainImageHighRes = getAttr('#landingImage', 'data-old-hires');
                if (mainImageHighRes)
                    images.push(mainImageHighRes);
                // Fallback to regular src
                const mainImageSrc = getAttr('#landingImage', 'src') ||
                    getAttr('#imgBlkFront', 'src') ||
                    getAttr('#main-image', 'src');
                if (mainImageSrc && !images.includes(mainImageSrc)) {
                    images.push(mainImageSrc);
                }
                // Get gallery images
                const galleryImages = getAllAttr('.imageThumb img', 'src')
                    .map(src => src.replace(/\._.*?_/, '._AC_SL1500_')) // Convert to high-res
                    .filter(src => !images.includes(src));
                images.push(...galleryImages);
                // Fallback to OG image
                const ogImage = getAttr('meta[property="og:image"]', 'content');
                if (ogImage && images.length === 0) {
                    images.push(ogImage);
                }
                const imageUrl = images[0]; // Backward compatibility
                // Description Parsers - Get full description
                const bulletPoints = getAllText('#feature-bullets li span.a-list-item');
                const productDesc = getText('#productDescription p') || getText('#productDescription');
                const description = bulletPoints.length > 0
                    ? bulletPoints.join(' • ')
                    : productDesc || getAttr('meta[property="og:description"]', 'content');
                // Highlights - Extract feature bullets as highlights
                const highlights = bulletPoints.length > 0 ? bulletPoints : undefined;
                // Brand Parsers
                let brand = getText('#bylineInfo');
                if (brand) {
                    brand = brand.replace('Visit the', '').replace('Store', '').replace('Brand:', '').trim();
                }
                else {
                    brand = getText('a#brand') || getAttr('meta[property="og:brand"]', 'content') || undefined;
                }
                // Specifications - Extract from product details table
                const specifications = {};
                const specRows = document.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr');
                specRows.forEach(row => {
                    const th = row.querySelector('th');
                    const td = row.querySelector('td');
                    if (th && td) {
                        const key = th.textContent?.trim();
                        const value = td.textContent?.trim();
                        if (key && value) {
                            specifications[key] = value;
                        }
                    }
                });
                // Rating and Reviews
                let rating;
                let reviewCount;
                const ratingText = getText('span.a-icon-alt');
                if (ratingText) {
                    const match = ratingText.match(/(\d+\.?\d*)\s*out of/);
                    if (match)
                        rating = parseFloat(match[1]);
                }
                const reviewText = getText('#acrCustomerReviewText');
                if (reviewText) {
                    const match = reviewText.match(/(\d+(?:,\d+)*)/);
                    if (match)
                        reviewCount = parseInt(match[1].replace(/,/g, ''));
                }
                // Availability Parsers
                const availText = (getText('#availability') || '').toLowerCase();
                let availability = 'UNKNOWN';
                if (availText.includes('in stock') || document.querySelector('#add-to-cart-button')) {
                    availability = 'IN_STOCK';
                }
                else if (availText.includes('out of stock') || availText.includes('unavailable')) {
                    availability = 'OUT_OF_STOCK';
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
                    highlights,
                    _debug: { pageTitle, pageUrl, hasCaptcha, bodyLength, priceDebug }
                };
            });
            if (metadata._debug.hasCaptcha) {
                logger_1.logger.warn({ url }, 'Puppeteer encountered CAPTCHA');
            }
            if (!metadata.title) {
                logger_1.logger.warn('--- PUPPETEER DEBUG ---');
                // Write to file for debugging
                try {
                    fs.writeFileSync('debug_log.json', JSON.stringify({
                        pageTitle: metadata._debug.pageTitle,
                        pageUrl: metadata._debug.pageUrl,
                        hasCaptcha: metadata._debug.hasCaptcha,
                        bodyLength: metadata._debug.bodyLength,
                        url
                    }, null, 2));
                }
                catch (e) {
                    logger_1.logger.error('Failed to write debug log file');
                }
                logger_1.logger.warn(`Page Title: ${metadata._debug.pageTitle}`);
                logger_1.logger.warn(`Has Captcha: ${metadata._debug.hasCaptcha}`);
                logger_1.logger.warn(`Body Length: ${metadata._debug.bodyLength}`);
                logger_1.logger.warn('-----------------------');
                logger_1.logger.warn({ url }, 'Puppeteer returned empty title');
            }
            logger_1.logger.debug({ title: metadata.title }, 'Puppeteer scraping successful');
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
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, url, stack: error.stack }, 'Puppeteer scraping failed');
            // Classify the error better
            if (error.message?.includes('Navigation') || error.message?.includes('timeout')) {
                return {
                    success: false,
                    error: new AdapterError_1.AdapterError('TIMEOUT', `Page load timeout: ${error.message}`, true, // retryable
                    error)
                };
            }
            if (error.message?.includes('browser')) {
                return {
                    success: false,
                    error: new AdapterError_1.AdapterError('UNKNOWN_ERROR', `Browser error: ${error.message}`, true, error)
                };
            }
            return {
                success: false,
                error: AdapterError_1.AdapterError.unknown(error)
            };
        }
        finally {
            if (browser) {
                await browser.close().catch(err => {
                    logger_1.logger.error({ error: err.message }, 'Failed to close browser');
                });
            }
        }
    }
}
exports.AmazonPuppeteerAdapter = AmazonPuppeteerAdapter;

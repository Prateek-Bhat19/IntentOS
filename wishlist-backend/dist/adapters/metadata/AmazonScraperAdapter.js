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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonScraperAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const AdapterError_1 = require("../errors/AdapterError");
const httpClient_1 = require("../utils/httpClient");
const urlParser_1 = require("../utils/urlParser");
const adapterConfig_1 = require("../config/adapterConfig");
const logger_1 = require("../../logger");
/**
 * Amazon-specific scraper adapter
 * Uses Amazon-specific CSS selectors for better data extraction
 * Fallback when Canopy API is not available or rate limited
 */
class AmazonScraperAdapter {
    constructor() {
        this.name = 'AmazonScraper';
        this.httpClient = (0, httpClient_1.createHttpClient)({ timeout: adapterConfig_1.adapterConfig.timeoutMs });
    }
    canHandle(url) {
        return (0, urlParser_1.matchesDomain)(url, ['*.amazon.in', '*.amazon.com', '*.amazon.co.uk']);
    }
    async fetchMetadata(url) {
        try {
            if (!this.canHandle(url)) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.invalidUrl(url),
                };
            }
            logger_1.logger.debug({ url, adapter: this.name }, 'Scraping Amazon product');
            const response = await this.httpClient.get(url);
            if (response.status >= 400) {
                return {
                    success: false,
                    error: this.handleHttpError(response.status, url),
                };
            }
            const html = response.data;
            const $ = cheerio.load(html);
            const metadata = {
                title: this.extractTitle($),
                description: this.extractDescription($),
                imageUrl: this.extractImage($),
                price: this.extractPrice($),
                currency: 'INR', // Default for amazon.in
                availability: this.extractAvailability($),
                brand: this.extractBrand($),
                source: this.name,
                fetchedAt: new Date().toISOString(),
            };
            // Validate that we got meaningful data
            if (!metadata.title || !metadata.price) {
                logger_1.logger.warn({ url, title: metadata.title, price: metadata.price }, 'Low quality data extracted');
            }
            logger_1.logger.debug({ title: metadata.title, price: metadata.price }, 'Amazon scraping successful');
            return {
                success: true,
                data: metadata,
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, url }, 'Amazon scraping failed');
            return {
                success: false,
                error: this.classifyError(error),
            };
        }
    }
    extractTitle($) {
        // Try multiple Amazon title selectors
        const selectors = [
            '#productTitle',
            'h1.product-title',
            'h1#title',
            'span#productTitle',
        ];
        for (const selector of selectors) {
            const title = $(selector).first().text().trim();
            if (title)
                return title;
        }
        // Fallback to Open Graph
        return $('meta[property="og:title"]').attr('content')?.trim();
    }
    extractDescription($) {
        // Try feature bullets first
        const bullets = $('#feature-bullets li').map((_, el) => $(el).text().trim()).get().join(' ');
        if (bullets)
            return bullets;
        // Try product description
        const desc = $('#productDescription').text().trim();
        if (desc)
            return desc;
        // Fallback to Open Graph
        return $('meta[property="og:description"]').attr('content')?.trim();
    }
    extractImage($) {
        // Try main product image
        const selectors = [
            '#landingImage',
            '#imgBlkFront',
            '#main-image',
            'img.a-dynamic-image',
        ];
        for (const selector of selectors) {
            const src = $(selector).first().attr('src') || $(selector).first().attr('data-old-hires');
            if (src)
                return src;
        }
        // Fallback to Open Graph
        return $('meta[property="og:image"]').attr('content');
    }
    extractPrice($) {
        // Try multiple Amazon price selectors
        const selectors = [
            '.a-price-whole',
            '.priceToPay .a-price-whole',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '.a-price .a-offscreen',
            'span.a-price-whole',
        ];
        for (const selector of selectors) {
            const priceText = $(selector).first().text().trim();
            if (priceText) {
                // Remove currency symbols and commas
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
            if (!isNaN(price))
                return price;
        }
        return undefined;
    }
    extractAvailability($) {
        const availText = $('#availability').text().toLowerCase();
        if (availText.includes('in stock'))
            return 'IN_STOCK';
        if (availText.includes('out of stock'))
            return 'OUT_OF_STOCK';
        if (availText.includes('currently unavailable'))
            return 'OUT_OF_STOCK';
        if (availText.includes('temporarily out of stock'))
            return 'OUT_OF_STOCK';
        // Check for "Add to Cart" button as indicator
        if ($('#add-to-cart-button').length > 0)
            return 'IN_STOCK';
        return 'UNKNOWN';
    }
    extractBrand($) {
        // Try byline info
        let brand = $('#bylineInfo').text().trim();
        if (brand) {
            brand = brand.replace('Visit the', '').replace('Store', '').replace('Brand:', '').trim();
            if (brand)
                return brand;
        }
        // Try brand link
        brand = $('a#brand').text().trim();
        if (brand)
            return brand;
        // Fallback to Open Graph
        return $('meta[property="og:brand"]').attr('content')?.trim();
    }
    handleHttpError(status, url) {
        if (status === 404) {
            return AdapterError_1.AdapterError.productNotFound(url);
        }
        if (status === 403) {
            return new AdapterError_1.AdapterError(AdapterError_1.ErrorType.FORBIDDEN, 'Access forbidden - possible bot detection', false);
        }
        if (status >= 500) {
            return AdapterError_1.AdapterError.serverError(status);
        }
        return new AdapterError_1.AdapterError(AdapterError_1.ErrorType.UNKNOWN_ERROR, `HTTP ${status} error`, true);
    }
    classifyError(error) {
        if (error instanceof AdapterError_1.AdapterError) {
            return error;
        }
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return AdapterError_1.AdapterError.timeout(adapterConfig_1.adapterConfig.timeoutMs);
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return AdapterError_1.AdapterError.networkError(error);
        }
        if (error.response?.status === 429) {
            return AdapterError_1.AdapterError.rateLimited();
        }
        if (error.response?.status >= 500) {
            return AdapterError_1.AdapterError.serverError(error.response.status, error);
        }
        if (error.response?.status === 404) {
            return AdapterError_1.AdapterError.productNotFound(error.config?.url || 'unknown');
        }
        return AdapterError_1.AdapterError.unknown(error);
    }
}
exports.AmazonScraperAdapter = AmazonScraperAdapter;

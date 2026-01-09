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
exports.FlipkartScraperAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const AdapterError_1 = require("../errors/AdapterError");
const httpClient_1 = require("../utils/httpClient");
const urlParser_1 = require("../utils/urlParser");
const adapterConfig_1 = require("../config/adapterConfig");
const logger_1 = require("../../logger");
/**
 * Flipkart-specific scraper adapter
 * Uses Flipkart-specific CSS selectors for data extraction
 */
class FlipkartScraperAdapter {
    constructor() {
        this.name = 'FlipkartScraper';
        this.httpClient = (0, httpClient_1.createHttpClient)({ timeout: adapterConfig_1.adapterConfig.timeoutMs });
    }
    canHandle(url) {
        return (0, urlParser_1.matchesDomain)(url, ['*.flipkart.com']);
    }
    async fetchMetadata(url) {
        try {
            if (!this.canHandle(url)) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.invalidUrl(url),
                };
            }
            logger_1.logger.debug({ url, adapter: this.name }, 'Scraping Flipkart product');
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
                currency: 'INR',
                availability: this.extractAvailability($),
                brand: this.extractBrand($),
                source: this.name,
                fetchedAt: new Date().toISOString(),
            };
            if (!metadata.title || !metadata.price) {
                logger_1.logger.warn({ url, title: metadata.title, price: metadata.price }, 'Low quality data extracted');
            }
            logger_1.logger.debug({ title: metadata.title, price: metadata.price }, 'Flipkart scraping successful');
            return {
                success: true,
                data: metadata,
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, url }, 'Flipkart scraping failed');
            return {
                success: false,
                error: this.classifyError(error),
            };
        }
    }
    extractTitle($) {
        // Flipkart title selectors
        const selectors = [
            'span.B_NuCI',
            'h1.yhB1nd',
            'span.VU-ZEz',
            '.B_NuCI',
        ];
        for (const selector of selectors) {
            const title = $(selector).first().text().trim();
            if (title)
                return title;
        }
        return $('meta[property="og:title"]').attr('content')?.trim();
    }
    extractDescription($) {
        // Try product description
        const desc = $('._1mXcCf').text().trim();
        if (desc)
            return desc;
        // Try specifications
        const specs = $('._2418kt').text().trim();
        if (specs)
            return specs;
        return $('meta[property="og:description"]').attr('content')?.trim();
    }
    extractImage($) {
        // Flipkart image selectors
        const selectors = [
            'img._396cs4',
            'img._2r_T1I',
            'div._3kidJX img',
        ];
        for (const selector of selectors) {
            const src = $(selector).first().attr('src');
            if (src)
                return src;
        }
        return $('meta[property="og:image"]').attr('content');
    }
    extractPrice($) {
        // Flipkart price selectors
        const selectors = [
            '._30jeq3',
            '.selling-price',
            '._1vC4OE',
            'div._30jeq3',
            '._25b18c ._30jeq3',
        ];
        for (const selector of selectors) {
            const priceText = $(selector).first().text().trim();
            if (priceText) {
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
        // Check for "Add to Cart" button
        const addToCart = $('._2KpZ6l').text().toLowerCase();
        if (addToCart.includes('add to cart'))
            return 'IN_STOCK';
        // Check for "Notify Me" button
        const notifyMe = $('._2KpZ6l').text().toLowerCase();
        if (notifyMe.includes('notify me'))
            return 'OUT_OF_STOCK';
        // Check availability text
        const availText = $('._16FRp0').text().toLowerCase();
        if (availText.includes('in stock'))
            return 'IN_STOCK';
        if (availText.includes('out of stock'))
            return 'OUT_OF_STOCK';
        if (availText.includes('currently unavailable'))
            return 'OUT_OF_STOCK';
        return 'UNKNOWN';
    }
    extractBrand($) {
        // Try brand link
        const brand = $('._2WkVRV').first().text().trim();
        if (brand)
            return brand;
        // Try from title (often includes brand)
        const title = this.extractTitle($);
        if (title) {
            const brandMatch = title.split(' ')[0];
            if (brandMatch)
                return brandMatch;
        }
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
exports.FlipkartScraperAdapter = FlipkartScraperAdapter;

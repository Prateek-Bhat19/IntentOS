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
exports.OpenGraphAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const AdapterError_1 = require("../errors/AdapterError");
const httpClient_1 = require("../utils/httpClient");
const urlParser_1 = require("../utils/urlParser");
const adapterConfig_1 = require("../config/adapterConfig");
const logger_1 = require("../../logger");
/**
 * OpenGraph metadata adapter
 * Fetches metadata from any website using Open Graph meta tags
 * Works as a universal fallback for e-commerce sites
 */
class OpenGraphAdapter {
    constructor() {
        this.name = 'OpenGraph';
        this.httpClient = (0, httpClient_1.createHttpClient)({ timeout: adapterConfig_1.adapterConfig.timeoutMs });
    }
    canHandle(url) {
        // Can handle any valid HTTP(S) URL
        return (0, urlParser_1.isValidUrl)(url);
    }
    async fetchMetadata(url) {
        try {
            // Validate URL first
            if (!this.canHandle(url)) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.invalidUrl(url),
                };
            }
            logger_1.logger.debug({ url, adapter: this.name }, 'Fetching metadata');
            // Fetch HTML with timeout
            const response = await this.httpClient.get(url);
            // Check response status
            if (response.status === 404) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.productNotFound(url),
                };
            }
            if (response.status >= 500) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.serverError(response.status),
                };
            }
            if (response.status >= 400) {
                return {
                    success: false,
                    error: new AdapterError_1.AdapterError(AdapterError_1.ErrorType.FORBIDDEN, `Access forbidden (${response.status})`, false),
                };
            }
            const html = response.data;
            // Parse HTML
            const $ = cheerio.load(html);
            const metadata = this.parseMetadata($, url);
            logger_1.logger.debug({ url, title: metadata.title, price: metadata.price }, 'Metadata fetched successfully');
            return {
                success: true,
                data: {
                    ...metadata,
                    source: this.name,
                    fetchedAt: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ url, error: error.message }, 'Metadata fetch failed');
            return {
                success: false,
                error: this.classifyError(error),
            };
        }
    }
    /**
     * Parse metadata from HTML using multiple strategies
     */
    parseMetadata($, url) {
        return {
            title: this.extractTitle($),
            description: this.extractDescription($),
            imageUrl: this.extractImage($),
            price: this.extractPrice($),
            currency: this.extractCurrency($),
            availability: this.extractAvailability($),
            brand: this.extractBrand($),
            rawData: {
                url,
                extractedAt: new Date().toISOString(),
            },
        };
    }
    /**
     * Extract title from multiple sources
     */
    extractTitle($) {
        // Try Open Graph first
        let title = $('meta[property="og:title"]').attr('content');
        // Try Twitter Card
        if (!title) {
            title = $('meta[name="twitter:title"]').attr('content');
        }
        // Try standard title tag
        if (!title) {
            title = $('title').text();
        }
        // Try product schema
        if (!title) {
            title = $('meta[itemprop="name"]').attr('content');
        }
        return title?.trim();
    }
    /**
     * Extract description
     */
    extractDescription($) {
        let description = $('meta[property="og:description"]').attr('content');
        if (!description) {
            description = $('meta[name="description"]').attr('content');
        }
        if (!description) {
            description = $('meta[name="twitter:description"]').attr('content');
        }
        return description?.trim();
    }
    /**
     * Extract image URL
     */
    extractImage($) {
        let imageUrl = $('meta[property="og:image"]').attr('content');
        if (!imageUrl) {
            imageUrl = $('meta[name="twitter:image"]').attr('content');
        }
        if (!imageUrl) {
            imageUrl = $('meta[itemprop="image"]').attr('content');
        }
        return imageUrl?.trim();
    }
    /**
     * Extract price from multiple sources
     */
    extractPrice($) {
        // Try product:price:amount (Open Graph)
        let priceStr = $('meta[property="product:price:amount"]').attr('content');
        // Try schema.org price
        if (!priceStr) {
            priceStr = $('meta[itemprop="price"]').attr('content');
        }
        // Try common price selectors
        if (!priceStr) {
            priceStr = $('[itemprop="price"]').attr('content');
        }
        if (!priceStr) {
            // Try to find price in common CSS classes
            const priceSelectors = [
                '.price',
                '.product-price',
                '[data-price]',
                '.a-price-whole', // Amazon
                '.selling-price', // Flipkart
            ];
            for (const selector of priceSelectors) {
                const element = $(selector).first();
                if (element.length) {
                    priceStr = element.text() || element.attr('content') || element.attr('data-price');
                    if (priceStr)
                        break;
                }
            }
        }
        if (!priceStr)
            return undefined;
        // Clean and parse price
        const cleanPrice = priceStr.replace(/[^\d.]/g, '');
        const price = parseFloat(cleanPrice);
        return isNaN(price) ? undefined : price;
    }
    /**
     * Extract currency
     */
    extractCurrency($) {
        let currency = $('meta[property="product:price:currency"]').attr('content');
        if (!currency) {
            currency = $('meta[itemprop="priceCurrency"]').attr('content');
        }
        // Default to INR for Indian sites
        return currency?.trim() || 'INR';
    }
    /**
     * Extract availability
     */
    extractAvailability($) {
        const availability = $('meta[property="product:availability"]').attr('content')?.toLowerCase();
        if (!availability) {
            // Try schema.org
            const schemaAvailability = $('link[itemprop="availability"]').attr('href')?.toLowerCase();
            if (schemaAvailability?.includes('instock'))
                return 'IN_STOCK';
            if (schemaAvailability?.includes('outofstock'))
                return 'OUT_OF_STOCK';
            return 'UNKNOWN';
        }
        if (availability.includes('instock') || availability.includes('in stock')) {
            return 'IN_STOCK';
        }
        if (availability.includes('outofstock') || availability.includes('out of stock')) {
            return 'OUT_OF_STOCK';
        }
        return 'UNKNOWN';
    }
    /**
     * Extract brand
     */
    extractBrand($) {
        let brand = $('meta[property="og:brand"]').attr('content');
        if (!brand) {
            brand = $('meta[itemprop="brand"]').attr('content');
        }
        if (!brand) {
            brand = $('[itemprop="brand"]').text();
        }
        return brand?.trim();
    }
    /**
     * Classify errors for retry logic
     */
    classifyError(error) {
        if (error instanceof AdapterError_1.AdapterError) {
            return error;
        }
        // Timeout errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return AdapterError_1.AdapterError.timeout(adapterConfig_1.adapterConfig.timeoutMs);
        }
        // Network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
            return AdapterError_1.AdapterError.networkError(error);
        }
        // Rate limiting
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            return AdapterError_1.AdapterError.rateLimited(retryAfter ? parseInt(retryAfter) : undefined);
        }
        // Server errors (5xx)
        if (error.response?.status >= 500) {
            return AdapterError_1.AdapterError.serverError(error.response.status, error);
        }
        // Client errors (4xx) - mostly unrecoverable
        if (error.response?.status === 404) {
            return AdapterError_1.AdapterError.productNotFound(error.config?.url || 'unknown');
        }
        if (error.response?.status === 403 || error.response?.status === 401) {
            return new AdapterError_1.AdapterError(AdapterError_1.ErrorType.FORBIDDEN, `Access forbidden (${error.response.status})`, false, error);
        }
        // Parsing errors
        if (error.name === 'ParserError' || error.message?.includes('parse')) {
            return AdapterError_1.AdapterError.parsingError(error.message, error);
        }
        // Unknown errors - default to retryable
        return AdapterError_1.AdapterError.unknown(error);
    }
}
exports.OpenGraphAdapter = OpenGraphAdapter;

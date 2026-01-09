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
exports.OpenGraphPriceAdapter = void 0;
const cheerio = __importStar(require("cheerio"));
const AdapterError_1 = require("../errors/AdapterError");
const httpClient_1 = require("../utils/httpClient");
const urlParser_1 = require("../utils/urlParser");
const adapterConfig_1 = require("../config/adapterConfig");
const logger_1 = require("../../logger");
/**
 * OpenGraph price checking adapter
 * Checks prices from any website using HTML parsing
 */
class OpenGraphPriceAdapter {
    constructor() {
        this.name = 'OpenGraph';
        this.httpClient = (0, httpClient_1.createHttpClient)({ timeout: adapterConfig_1.adapterConfig.timeoutMs });
    }
    canHandle(url) {
        return (0, urlParser_1.isValidUrl)(url);
    }
    async checkPrice(url) {
        try {
            if (!this.canHandle(url)) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.invalidUrl(url),
                };
            }
            logger_1.logger.debug({ url, adapter: this.name }, 'Checking price');
            const response = await this.httpClient.get(url);
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
            const $ = cheerio.load(html);
            const priceData = this.extractPriceData($);
            if (!priceData.price) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.parsingError('Could not extract price from page'),
                };
            }
            logger_1.logger.debug({ url, price: priceData.price, availability: priceData.availability }, 'Price checked successfully');
            return {
                success: true,
                data: {
                    price: priceData.price,
                    currency: priceData.currency,
                    availability: priceData.availability,
                    originalPrice: priceData.originalPrice,
                    source: this.name,
                    checkedAt: new Date().toISOString(),
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ url, error: error.message }, 'Price check failed');
            return {
                success: false,
                error: this.classifyError(error),
            };
        }
    }
    /**
     * Extract price data from HTML
     */
    extractPriceData($) {
        const price = this.extractPrice($);
        const originalPrice = this.extractOriginalPrice($);
        return {
            price: price,
            currency: this.extractCurrency($),
            availability: this.extractAvailability($),
            originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
        };
    }
    /**
     * Extract current price
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
                '.current-price',
                '.sale-price',
                '[data-price]',
                '.a-price-whole', // Amazon
                '.selling-price', // Flipkart
                '.pdp-price', // Common pattern
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
     * Extract original price (for discount tracking)
     */
    extractOriginalPrice($) {
        const originalPriceSelectors = [
            '.original-price',
            '.list-price',
            '.was-price',
            '.regular-price',
            '[data-original-price]',
            '.a-text-price', // Amazon
            '.original-price-value', // Flipkart
        ];
        for (const selector of originalPriceSelectors) {
            const element = $(selector).first();
            if (element.length) {
                const priceStr = element.text() || element.attr('content') || element.attr('data-original-price');
                if (priceStr) {
                    const cleanPrice = priceStr.replace(/[^\d.]/g, '');
                    const price = parseFloat(cleanPrice);
                    if (!isNaN(price))
                        return price;
                }
            }
        }
        return undefined;
    }
    /**
     * Extract currency
     */
    extractCurrency($) {
        let currency = $('meta[property="product:price:currency"]').attr('content');
        if (!currency) {
            currency = $('meta[itemprop="priceCurrency"]').attr('content');
        }
        return currency?.trim() || 'INR';
    }
    /**
     * Extract availability
     */
    extractAvailability($) {
        const availability = $('meta[property="product:availability"]').attr('content')?.toLowerCase();
        if (!availability) {
            const schemaAvailability = $('link[itemprop="availability"]').attr('href')?.toLowerCase();
            if (schemaAvailability?.includes('instock'))
                return 'IN_STOCK';
            if (schemaAvailability?.includes('outofstock'))
                return 'OUT_OF_STOCK';
            // Check for common out of stock indicators
            const pageText = $('body').text().toLowerCase();
            if (pageText.includes('out of stock') || pageText.includes('sold out')) {
                return 'OUT_OF_STOCK';
            }
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
     * Classify errors for retry logic
     */
    classifyError(error) {
        if (error instanceof AdapterError_1.AdapterError) {
            return error;
        }
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return AdapterError_1.AdapterError.timeout(adapterConfig_1.adapterConfig.timeoutMs);
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN') {
            return AdapterError_1.AdapterError.networkError(error);
        }
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            return AdapterError_1.AdapterError.rateLimited(retryAfter ? parseInt(retryAfter) : undefined);
        }
        if (error.response?.status >= 500) {
            return AdapterError_1.AdapterError.serverError(error.response.status, error);
        }
        if (error.response?.status === 404) {
            return AdapterError_1.AdapterError.productNotFound(error.config?.url || 'unknown');
        }
        if (error.response?.status === 403 || error.response?.status === 401) {
            return new AdapterError_1.AdapterError(AdapterError_1.ErrorType.FORBIDDEN, `Access forbidden (${error.response.status})`, false, error);
        }
        if (error.name === 'ParserError' || error.message?.includes('parse')) {
            return AdapterError_1.AdapterError.parsingError(error.message, error);
        }
        return AdapterError_1.AdapterError.unknown(error);
    }
}
exports.OpenGraphPriceAdapter = OpenGraphPriceAdapter;

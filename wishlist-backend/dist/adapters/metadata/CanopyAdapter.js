"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanopyAdapter = void 0;
const axios_1 = __importDefault(require("axios"));
const AdapterError_1 = require("../errors/AdapterError");
const adapterConfig_1 = require("../config/adapterConfig");
const urlParser_1 = require("../utils/urlParser");
const logger_1 = require("../../logger");
/**
 * Canopy API adapter for Amazon product data
 * Uses official Canopy API for high-quality structured data
 * Free tier: 100 requests/month
 */
class CanopyAdapter {
    constructor() {
        this.name = 'Canopy';
        this.apiKey = adapterConfig_1.adapterConfig.canopyApiKey;
        this.baseUrl = 'https://rest.canopyapi.co/api';
    }
    canHandle(url) {
        // Canopy supports Amazon only
        return (0, urlParser_1.matchesDomain)(url, [
            '*.amazon.in',
            '*.amazon.com',
            '*.amazon.co.uk',
            '*.amazon.de',
            '*.amazon.fr',
            '*.amazon.ca',
        ]);
    }
    async fetchMetadata(url) {
        if (!this.apiKey) {
            logger_1.logger.warn('Canopy API key not configured, skipping adapter');
            return {
                success: false,
                error: AdapterError_1.AdapterError.authenticationFailed('Canopy API key not configured'),
            };
        }
        try {
            // Extract ASIN from Amazon URL
            const asin = this.extractAsin(url);
            if (!asin) {
                return {
                    success: false,
                    error: AdapterError_1.AdapterError.parsingError('Could not extract ASIN from URL'),
                };
            }
            // Determine domain from URL
            const domain = this.getDomain(url);
            logger_1.logger.debug({ asin, domain, adapter: this.name }, 'Fetching from Canopy API');
            const response = await axios_1.default.get(`${this.baseUrl}/amazon/product`, {
                params: { asin, domain },
                headers: {
                    'API-KEY': this.apiKey,
                    'Content-Type': 'application/json',
                },
                timeout: adapterConfig_1.adapterConfig.timeoutMs,
            });
            const data = response.data;
            logger_1.logger.debug({ title: data.title, price: data.price }, 'Canopy API response received');
            return {
                success: true,
                data: {
                    title: data.title,
                    description: data.description,
                    imageUrl: data.image,
                    price: data.price,
                    currency: data.currency || this.getCurrencyForDomain(domain),
                    availability: data.in_stock ? 'IN_STOCK' : 'OUT_OF_STOCK',
                    brand: data.brand,
                    source: this.name,
                    fetchedAt: new Date().toISOString(),
                    rawData: {
                        canopyData: data,
                    },
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error: error.message, url }, 'Canopy API request failed');
            return {
                success: false,
                error: this.classifyError(error),
            };
        }
    }
    /**
     * Extract ASIN from Amazon URL
     */
    extractAsin(url) {
        // Amazon ASIN patterns:
        // /dp/ASIN
        // /gp/product/ASIN
        // /product/ASIN
        const patterns = [
            /\/dp\/([A-Z0-9]{10})/,
            /\/gp\/product\/([A-Z0-9]{10})/,
            /\/product\/([A-Z0-9]{10})/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match)
                return match[1];
        }
        return null;
    }
    /**
     * Get Canopy domain code from URL
     */
    getDomain(url) {
        if (url.includes('amazon.in'))
            return 'IN';
        if (url.includes('amazon.com'))
            return 'US';
        if (url.includes('amazon.co.uk'))
            return 'UK';
        if (url.includes('amazon.de'))
            return 'DE';
        if (url.includes('amazon.fr'))
            return 'FR';
        if (url.includes('amazon.ca'))
            return 'CA';
        return 'US'; // Default
    }
    /**
     * Get currency for domain
     */
    getCurrencyForDomain(domain) {
        const currencyMap = {
            'IN': 'INR',
            'US': 'USD',
            'UK': 'GBP',
            'DE': 'EUR',
            'FR': 'EUR',
            'CA': 'CAD',
        };
        return currencyMap[domain] || 'USD';
    }
    classifyError(error) {
        if (error instanceof AdapterError_1.AdapterError) {
            return error;
        }
        // Authentication errors
        if (error.response?.status === 401 || error.response?.status === 403) {
            return AdapterError_1.AdapterError.authenticationFailed('Invalid Canopy API key');
        }
        // Rate limiting
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            return AdapterError_1.AdapterError.rateLimited(retryAfter ? parseInt(retryAfter) : undefined);
        }
        // Product not found
        if (error.response?.status === 404) {
            return AdapterError_1.AdapterError.productNotFound(error.config?.params?.url || 'unknown');
        }
        // Server errors
        if (error.response?.status >= 500) {
            return AdapterError_1.AdapterError.serverError(error.response.status, error);
        }
        // Timeout
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return AdapterError_1.AdapterError.timeout(adapterConfig_1.adapterConfig.timeoutMs);
        }
        // Network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return AdapterError_1.AdapterError.networkError(error);
        }
        // Unknown error
        return AdapterError_1.AdapterError.unknown(error);
    }
}
exports.CanopyAdapter = CanopyAdapter;

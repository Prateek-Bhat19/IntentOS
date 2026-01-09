"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceAdapterFactory = void 0;
const MockPriceAdapter_1 = require("./MockPriceAdapter");
const OpenGraphPriceAdapter_1 = require("./OpenGraphPriceAdapter");
const adapterConfig_1 = require("../config/adapterConfig");
const logger_1 = require("../../logger");
/**
 * Factory for creating and managing price adapters
 */
class PriceAdapterFactory {
    /**
     * Initialize all available adapters based on configuration
     */
    static initialize() {
        if (this.initialized) {
            logger_1.logger.warn('PriceAdapterFactory already initialized');
            return;
        }
        // Always include mock adapter
        this.adapters.push(new MockPriceAdapter_1.MockPriceAdapter());
        // Add real adapters based on environment
        if (adapterConfig_1.adapterConfig.enableRealAdapters) {
            logger_1.logger.info('Real price adapters enabled');
            // Add OpenGraph price adapter (universal fallback)
            this.adapters.push(new OpenGraphPriceAdapter_1.OpenGraphPriceAdapter());
            // TODO: Add real price adapters when implemented
            // if (adapterConfig.canopyApiKey) {
            //   this.adapters.push(new CanopyPriceAdapter());
            // }
        }
        else {
            logger_1.logger.info('Using mock price adapters only');
        }
        this.initialized = true;
        logger_1.logger.info({ adapters: this.adapters.map((a) => a.name) }, 'PriceAdapterFactory initialized');
    }
    /**
     * Get the best adapter for a given URL
     */
    static getAdapter(url) {
        if (!this.initialized) {
            this.initialize();
        }
        // Try specific adapters first
        const specificAdapter = this.adapters.find((adapter) => adapter.name !== 'Mock' && adapter.canHandle(url));
        if (specificAdapter) {
            logger_1.logger.debug({ adapter: specificAdapter.name, url }, 'Using specific price adapter');
            return specificAdapter;
        }
        // Fallback to Mock
        const mockAdapter = this.adapters.find((adapter) => adapter.name === 'Mock');
        logger_1.logger.debug({ adapter: mockAdapter.name, url }, 'Using mock price adapter');
        return mockAdapter;
    }
    /**
     * Get all registered adapters
     */
    static getAllAdapters() {
        if (!this.initialized) {
            this.initialize();
        }
        return [...this.adapters];
    }
    /**
     * Reset factory (useful for testing)
     */
    static reset() {
        this.adapters = [];
        this.initialized = false;
    }
}
exports.PriceAdapterFactory = PriceAdapterFactory;
PriceAdapterFactory.adapters = [];
PriceAdapterFactory.initialized = false;

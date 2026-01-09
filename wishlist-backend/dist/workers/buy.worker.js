"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const client_1 = require("../redis/client");
const buy_queue_1 = require("../queues/buy.queue");
const buy_service_1 = require("../services/buy.service");
const logger_1 = require("../logger");
const MetadataAdapterFactory_1 = require("../adapters/metadata/MetadataAdapterFactory");
const PriceAdapterFactory_1 = require("../adapters/price/PriceAdapterFactory");
// Initialize adapters on worker startup
MetadataAdapterFactory_1.MetadataAdapterFactory.initialize();
PriceAdapterFactory_1.PriceAdapterFactory.initialize();
const worker = new bullmq_1.Worker(buy_queue_1.BUY_QUEUE_NAME, async (job) => {
    logger_1.logger.info({
        jobId: job.id,
        jobName: job.name,
        data: job.data,
    }, "Job started");
    switch (job.name) {
        case buy_queue_1.BuyJobTypes.FETCH_METADATA: {
            const { buyItemId } = job.data;
            // Get the item to extract URL
            const item = await buy_service_1.BuyService.findById(buyItemId);
            if (!item) {
                throw new bullmq_1.UnrecoverableError("Item not found");
            }
            if (!item.link) {
                throw new bullmq_1.UnrecoverableError("No link found for item");
            }
            // Get appropriate adapter
            const adapter = MetadataAdapterFactory_1.MetadataAdapterFactory.getAdapter(item.link);
            logger_1.logger.info({ adapter: adapter.name, url: item.link, itemId: buyItemId }, "Fetching metadata");
            // Fetch metadata
            const result = await adapter.fetchMetadata(item.link);
            if (!result.success) {
                const error = result.error;
                // Enhanced logging
                logger_1.logger.error({
                    jobId: job.id,
                    errorType: error.type,
                    isRetryable: error.isRetryable,
                    attemptsMade: job.attemptsMade,
                    message: error.message,
                }, "Metadata fetch failed");
                // Propagate error correctly
                if (error.isRetryable) {
                    throw new Error(error.message); // BullMQ will retry
                }
                else {
                    throw new bullmq_1.UnrecoverableError(error.message); // Move to failed/DLQ
                }
            }
            // Save metadata
            await buy_service_1.BuyService.attachMetadata(buyItemId, result.data);
            logger_1.logger.info({ itemId: buyItemId, source: result.data.source }, "Metadata attached successfully");
            break;
        }
        case buy_queue_1.BuyJobTypes.CHECK_PRICE: {
            const { buyItemId } = job.data;
            // Get the item to extract URL
            const item = await buy_service_1.BuyService.findById(buyItemId);
            if (!item) {
                throw new bullmq_1.UnrecoverableError("Item not found");
            }
            if (!item.link) {
                throw new bullmq_1.UnrecoverableError("No link found for item");
            }
            // Get appropriate adapter
            const adapter = PriceAdapterFactory_1.PriceAdapterFactory.getAdapter(item.link);
            logger_1.logger.info({ adapter: adapter.name, url: item.link, itemId: buyItemId }, "Checking price");
            // Check price
            const result = await adapter.checkPrice(item.link);
            if (!result.success) {
                const error = result.error;
                logger_1.logger.error({
                    jobId: job.id,
                    errorType: error.type,
                    isRetryable: error.isRetryable,
                    attemptsMade: job.attemptsMade,
                    message: error.message,
                }, "Price check failed");
                if (error.isRetryable) {
                    throw new Error(error.message);
                }
                else {
                    throw new bullmq_1.UnrecoverableError(error.message);
                }
            }
            // Save price data
            await buy_service_1.BuyService.attachMetadata(buyItemId, {
                lastCheckedPrice: result.data.price,
                checkedAt: result.data.checkedAt,
                availability: result.data.availability,
                source: result.data.source,
                currency: result.data.currency,
                originalPrice: result.data.originalPrice,
            });
            logger_1.logger.info({ itemId: buyItemId, price: result.data.price, source: result.data.source }, "Price checked successfully");
            break;
        }
        default:
            logger_1.logger.warn({ jobName: job.name }, "Unknown job type");
    }
}, { connection: client_1.redis });
worker.on("completed", (job) => {
    logger_1.logger.info({
        jobId: job.id,
        jobName: job.name,
    }, "Job completed");
});
worker.on("failed", (job, err) => {
    logger_1.logger.error({
        jobId: job?.id,
        jobName: job?.name,
        reason: err.message,
    }, "Job failed");
});
const closeWorker = async (signal) => {
    logger_1.logger.info({ signal }, "Worker shutdown started");
    await worker.close(); // waits for active jobs
    await client_1.redis.quit();
    process.exit(0);
};
process.on("SIGTERM", closeWorker);
process.on("SIGINT", closeWorker);

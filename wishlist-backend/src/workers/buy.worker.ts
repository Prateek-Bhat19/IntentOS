import { Worker, UnrecoverableError } from "bullmq";
import { redis } from "../redis/client";
import { BUY_QUEUE_NAME, BuyJobTypes } from "../queues/buy.queue";
import { BuyService } from "../services/buy.service";
import { logger } from "../logger";
import { MetadataAdapterFactory } from "../adapters/metadata/MetadataAdapterFactory";
import { PriceAdapterFactory } from "../adapters/price/PriceAdapterFactory";
import { AdapterError } from "../adapters/errors/AdapterError";

// Initialize adapters on worker startup
MetadataAdapterFactory.initialize();
PriceAdapterFactory.initialize();

const worker = new Worker(
  BUY_QUEUE_NAME,
  async (job) => {
    logger.info(
      {
        jobId: job.id,
        jobName: job.name,
        data: job.data,
      },
      "Job started"
    );

    switch (job.name) {
      case BuyJobTypes.FETCH_METADATA: {
        const { buyItemId } = job.data as { buyItemId: string };

        // Get the item to extract URL
        const item = await BuyService.findById(buyItemId);
        
        if (!item) {
          throw new UnrecoverableError("Item not found");
        }
        
        if (!item.link) {
          throw new UnrecoverableError("No link found for item");
        }

        // Get appropriate adapter
        const adapter = MetadataAdapterFactory.getAdapter(item.link);
        
        logger.info(
          { adapter: adapter.name, url: item.link, itemId: buyItemId },
          "Fetching metadata"
        );

        // Fetch metadata
        const result = await adapter.fetchMetadata(item.link);

        if (!result.success) {
          const error = result.error!;
          
          // Enhanced logging
          logger.error(
            {
              jobId: job.id,
              errorType: error.type,
              isRetryable: error.isRetryable,
              attemptsMade: job.attemptsMade,
              message: error.message,
            },
            "Metadata fetch failed"
          );

          // Propagate error correctly
          if (error.isRetryable) {
            throw new Error(error.message); // BullMQ will retry
          } else {
            throw new UnrecoverableError(error.message); // Move to failed/DLQ
          }
        }

        // Save metadata (convert to JSON-compatible object)
        await BuyService.attachMetadata(buyItemId, result.data! as any);
        
        logger.info(
          { itemId: buyItemId, source: result.data!.source },
          "Metadata attached successfully"
        );

        break;
      }

      case BuyJobTypes.CHECK_PRICE: {
        const { buyItemId } = job.data as { buyItemId: string };

        // Get the item to extract URL
        const item = await BuyService.findById(buyItemId);
        
        if (!item) {
          throw new UnrecoverableError("Item not found");
        }
        
        if (!item.link) {
          throw new UnrecoverableError("No link found for item");
        }

        // Get appropriate adapter
        const adapter = PriceAdapterFactory.getAdapter(item.link);
        
        logger.info(
          { adapter: adapter.name, url: item.link, itemId: buyItemId },
          "Checking price"
        );

        // Check price
        const result = await adapter.checkPrice(item.link);

        if (!result.success) {
          const error = result.error!;
          
          logger.error(
            {
              jobId: job.id,
              errorType: error.type,
              isRetryable: error.isRetryable,
              attemptsMade: job.attemptsMade,
              message: error.message,
            },
            "Price check failed"
          );

          if (error.isRetryable) {
            throw new Error(error.message);
          } else {
            throw new UnrecoverableError(error.message);
          }
        }

        // Save price data
        await BuyService.attachMetadata(buyItemId, {
          lastCheckedPrice: result.data!.price,
          checkedAt: result.data!.checkedAt,
          availability: result.data!.availability,
          source: result.data!.source,
          currency: result.data!.currency,
          originalPrice: result.data!.originalPrice,
        });
        
        logger.info(
          { itemId: buyItemId, price: result.data!.price, source: result.data!.source },
          "Price checked successfully"
        );

        break;
      }

      default:
        logger.warn({ jobName: job.name }, "Unknown job type");
    }
  },
  { connection: redis }
);

worker.on("completed", (job) => {
  logger.info(
    {
      jobId: job.id,
      jobName: job.name,
    },
    "Job completed"
  );
});

worker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      jobName: job?.name,
      reason: err.message,
    },
    "Job failed"
  );
});

const closeWorker = async (signal: string) => {
  logger.info({ signal }, "Worker shutdown started");

  await worker.close(); // waits for active jobs
  await redis.quit();

  process.exit(0);
};

process.on("SIGTERM", closeWorker);
process.on("SIGINT", closeWorker);

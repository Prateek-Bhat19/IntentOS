import { Worker, UnrecoverableError } from "bullmq";
import { redis } from "../redis/client";
import { BUY_QUEUE_NAME, BuyJobTypes } from "../queues/buy.queue";
import { BuyService } from "../services/buy.service";

const worker = new Worker(
  BUY_QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case BuyJobTypes.FETCH_METADATA: {
        const { buyItemId } = job.data as { buyItemId: string };

        // Example classification
        const urlInvalid = false; // replace with real check later
        if (urlInvalid) {
          // Permanent failure → do NOT retry
          throw new UnrecoverableError("Invalid URL – permanent failure");
        }

        // Retryable failure example
        const networkDown = false;
        if (networkDown) {
          throw new Error("Temporary network failure");
        }

        await BuyService.attachMetadata(buyItemId, {
          fetchedAt: new Date().toISOString(),
          source: "mock",
        });

        break;
      }

      case BuyJobTypes.CHECK_PRICE: {
        const { buyItemId } = job.data as { buyItemId: string };

        // Mock price fetch
        const newPrice = Math.floor(Math.random() * 10000);

        await BuyService.attachMetadata(buyItemId, {
          lastCheckedPrice: newPrice,
          checkedAt: new Date().toISOString(),
          source: "mock-price-check",
        });

        break;
      }

      default:
        console.warn("Unknown job:", job.name);
    }
  },
  { connection: redis }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed`, err);
});

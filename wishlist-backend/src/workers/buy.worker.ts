import { Worker } from "bullmq";
import { redis } from "../redis/client";
import { BUY_QUEUE_NAME, BuyJobTypes } from "../queues/buy.queue";

const worker = new Worker(BUY_QUEUE_NAME, async (job) => {
  switch (job.name) {
    case BuyJobTypes.FETCH_METADATA:
      console.log("Worker received FETCH_METADATA:", job.data);
      break;

    case BuyJobTypes.CHECK_PRICE:
      console.log("Worker received CHECK_PRICE:", job.data);
      break;

    default:
      console.warn("Unknown job:", job.name);
  }
}, 
{connection: redis}
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
    
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed`, err);
});
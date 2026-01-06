import { Queue } from "bullmq";
import {redis} from "../redis/client";

export const BUY_QUEUE_NAME = "buy-jobs";

export const BuyQueue = new Queue(BUY_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false
    }
})

export const BuyJobTypes = {
    FETCH_METADATA: "FETCH_METADATA",
    CHECK_PRICE: "CHECK_PRICE",
} as const;

export async function enqueueFetchMetadata(buyItemId: string) {
    return BuyQueue.add(BuyJobTypes.FETCH_METADATA, {buyItemId});
}

export async function enqueuePriceCheck(buyItemId: string) {
    return BuyQueue.add(BuyJobTypes.CHECK_PRICE, {buyItemId});
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuyJobTypes = exports.BuyQueue = exports.BUY_QUEUE_NAME = void 0;
exports.enqueueFetchMetadata = enqueueFetchMetadata;
exports.enqueuePriceCheck = enqueuePriceCheck;
const bullmq_1 = require("bullmq");
const client_1 = require("../redis/client");
exports.BUY_QUEUE_NAME = "buy-jobs";
exports.BuyQueue = new bullmq_1.Queue(exports.BUY_QUEUE_NAME, {
    connection: client_1.redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false
    }
});
exports.BuyJobTypes = {
    FETCH_METADATA: "FETCH_METADATA",
    CHECK_PRICE: "CHECK_PRICE",
};
async function enqueueFetchMetadata(buyItemId) {
    return exports.BuyQueue.add(exports.BuyJobTypes.FETCH_METADATA, { buyItemId }, {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
    });
}
async function enqueuePriceCheck(buyItemId) {
    return exports.BuyQueue.add(exports.BuyJobTypes.CHECK_PRICE, { buyItemId }, {
        attempts: 3,
        backoff: { type: "fixed", delay: 10_000 },
    });
}

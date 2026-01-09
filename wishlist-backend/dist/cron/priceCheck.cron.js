"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPriceCheckCron = startPriceCheckCron;
const node_cron_1 = __importDefault(require("node-cron"));
const buy_service_1 = require("../services/buy.service");
const buy_queue_1 = require("../queues/buy.queue");
function startPriceCheckCron() {
    node_cron_1.default.schedule("0 */6 * * *", async () => {
        const items = await buy_service_1.BuyService.findItemsForPriceCheck();
        for (const item of items) {
            await (0, buy_queue_1.enqueuePriceCheck)(item.id);
        }
    });
}

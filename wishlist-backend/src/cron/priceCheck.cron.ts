import cron from "node-cron";
import { BuyService } from "../services/buy.service";
import { enqueuePriceCheck } from "../queues/buy.queue";

export function startPriceCheckCron() {
  cron.schedule("0 */6 * * *", async () => {
    const items = await BuyService.findItemsForPriceCheck();

    for (const item of items) {
      await enqueuePriceCheck(item.id);
    }
  });
}


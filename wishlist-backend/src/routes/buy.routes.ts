import { Router } from "express";
import { BuyController } from "../controllers/buy.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createBuyItemSchema,
  updateBuyItemSchema,
  changeStatusSchema,
} from "../validations/buy.validation";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createBuyItemSchema), BuyController.create);
router.get("/", BuyController.list);
router.put("/:id", validate(updateBuyItemSchema), BuyController.update);
router.patch(
  "/:id/status",
  validate(changeStatusSchema),
  BuyController.changeStatus
);
router.post("/:id/refresh-metadata", BuyController.refreshMetadata);
router.delete("/:id", BuyController.remove);

export default router;

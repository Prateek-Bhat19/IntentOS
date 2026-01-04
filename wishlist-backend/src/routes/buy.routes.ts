import { Router } from "express";
import { BuyController } from "../controllers/buy.controller";

const router = Router();

router.post("/", BuyController.create);
router.get("/", BuyController.list);
router.put("/:id", BuyController.update);
router.patch("/:id/status", BuyController.changeStatus);
router.delete("/:id", BuyController.remove);

export default router;


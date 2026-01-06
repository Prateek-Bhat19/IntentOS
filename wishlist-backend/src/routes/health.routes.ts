import { Router } from "express";
import { prisma } from "../db/prisma";
import { redis } from "../redis/client";
const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
router.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();

    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not-ready" });
  }
});
export default router;

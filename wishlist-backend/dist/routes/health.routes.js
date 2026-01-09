"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../db/prisma");
const client_1 = require("../redis/client");
const router = (0, express_1.Router)();
router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
router.get("/ready", async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        await client_1.redis.ping();
        res.status(200).json({ status: "ready" });
    }
    catch {
        res.status(503).json({ status: "not-ready" });
    }
});
exports.default = router;

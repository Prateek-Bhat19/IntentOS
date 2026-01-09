"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeStatusSchema = exports.updateBuyItemSchema = exports.createBuyItemSchema = exports.buyStatusEnum = exports.priorityEnum = void 0;
const zod_1 = require("zod");
exports.priorityEnum = zod_1.z.enum(["LOW", "MEDIUM", "HIGH"]);
exports.buyStatusEnum = zod_1.z.enum(["PLANNED", "BOUGHT"]);
exports.createBuyItemSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    priority: exports.priorityEnum,
    targetPrice: zod_1.z.number().positive().optional(),
    link: zod_1.z.string().url().optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateBuyItemSchema = exports.createBuyItemSchema.partial();
exports.changeStatusSchema = zod_1.z.object({
    status: exports.buyStatusEnum,
});

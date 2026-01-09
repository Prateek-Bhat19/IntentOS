"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listQuerySchema = void 0;
const zod_1 = require("zod");
exports.listQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
    status: zod_1.z.enum(["PLANNED", "BOUGHT"]).optional(),
    priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    sort: zod_1.z.enum(["createdAt", "priority"]).default("createdAt"),
    order: zod_1.z.enum(["asc", "desc"]).default("desc"),
});

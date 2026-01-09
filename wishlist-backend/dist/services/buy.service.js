"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuyService = void 0;
const prisma_1 = require("../db/prisma");
const client_1 = require("@prisma/client");
const AppError_1 = require("../errors/AppError");
const buy_queue_1 = require("../queues/buy.queue");
const cache_1 = require("../redis/cache");
class BuyService {
    static async create(userId, input) {
        if (!input.title)
            throw new AppError_1.ValidationError("Title is required");
        const item = await prisma_1.prisma.buyItem.create({
            data: {
                title: input.title,
                priority: input.priority,
                targetPrice: input.targetPrice,
                link: input.link,
                notes: input.notes,
                status: client_1.BuyStatus.PLANNED,
                userId,
            },
        });
        // Async side effect (non-blocking)
        if (item.link) {
            await (0, buy_queue_1.enqueueFetchMetadata)(item.id);
        }
        // Invalidate cache
        await (0, cache_1.deleteByPattern)(`buy:list:${userId}:*`);
        return item;
    }
    static async list(userId, opts) {
        const cacheKey = `buy:list:${userId}:${JSON.stringify(opts)}`;
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        // Fetch from database
        const { page, limit, status, priority, sort, order } = opts;
        const where = {
            userId,
            deletedAt: null,
            ...(status && { status }),
            ...(priority && { priority }),
        };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.buyItem.findMany({
                where,
                orderBy: { [sort]: order },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.buyItem.count({ where }),
        ]);
        const result = {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
        // Save to cache
        await (0, cache_1.setCache)(cacheKey, result, 60);
        return result;
    }
    static async update(userId, id, updates) {
        const item = await prisma_1.prisma.buyItem.findFirst({ where: { id, userId } });
        if (!item)
            throw new AppError_1.NotFoundError("Item not found");
        if (item.status !== client_1.BuyStatus.PLANNED) {
            throw new AppError_1.ForbiddenError("Only planned items can be edited");
        }
        const updated = await prisma_1.prisma.buyItem.update({
            where: { id },
            data: updates,
        });
        await (0, cache_1.deleteByPattern)(`buy:list:${userId}:*`);
        return updated;
    }
    static async changeStatus(userId, id, next) {
        const item = await prisma_1.prisma.buyItem.findFirst({ where: { id, userId } });
        if (!item)
            throw new AppError_1.NotFoundError("Item not found");
        let updated;
        if (item.status === client_1.BuyStatus.PLANNED && next === client_1.BuyStatus.BOUGHT) {
            updated = await prisma_1.prisma.buyItem.update({
                where: { id },
                data: { status: client_1.BuyStatus.BOUGHT },
            });
        }
        else if (item.status === client_1.BuyStatus.BOUGHT && next === client_1.BuyStatus.PLANNED) {
            updated = await prisma_1.prisma.buyItem.update({
                where: { id },
                data: { status: client_1.BuyStatus.PLANNED },
            });
        }
        else {
            throw new AppError_1.ForbiddenError("Illegal status transition");
        }
        await (0, cache_1.deleteByPattern)(`buy:list:${userId}:*`);
        return updated;
    }
    static async softDelete(userId, id) {
        const item = await prisma_1.prisma.buyItem.findFirst({ where: { id, userId } });
        if (!item)
            throw new AppError_1.NotFoundError("Item not found");
        if (item.status !== client_1.BuyStatus.PLANNED) {
            throw new AppError_1.ForbiddenError("Only planned items can be deleted");
        }
        const deleted = await prisma_1.prisma.buyItem.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await (0, cache_1.deleteByPattern)(`buy:list:${userId}:*`);
        return deleted;
    }
    static async attachMetadata(buyItemId, metadata) {
        const item = await prisma_1.prisma.buyItem.findUnique({
            where: { id: buyItemId },
        });
        if (!item || item.deletedAt)
            return;
        // Update the item first
        await prisma_1.prisma.buyItem.update({
            where: { id: buyItemId },
            data: { metadata },
        });
        // Invalidate ALL caches for this user (more aggressive)
        await (0, cache_1.deleteByPattern)(`buy:*:${item.userId}:*`);
        await (0, cache_1.deleteByPattern)(`buy:list:${item.userId}:*`);
    }
    static async findById(buyItemId) {
        return prisma_1.prisma.buyItem.findUnique({
            where: { id: buyItemId },
        });
    }
    static async findItemsForPriceCheck() {
        // This is a system read operation (no specific userId to invalidate)
        return prisma_1.prisma.buyItem.findMany({
            where: {
                status: "PLANNED",
                deletedAt: null,
                link: { not: null },
            },
            select: { id: true },
        });
    }
}
exports.BuyService = BuyService;

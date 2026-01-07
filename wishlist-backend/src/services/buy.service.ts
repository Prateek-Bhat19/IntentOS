import { prisma } from "../db/prisma";
import { PrismaClient, BuyStatus, Priority, Prisma } from "@prisma/client";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/AppError";
import { enqueueFetchMetadata } from "../queues/buy.queue";
import { getCache, setCache, deleteByPattern } from "../redis/cache";

type CreateBuyItemInput = {
  title: string;
  priority: Priority;
  targetPrice?: number;
  link?: string;
  notes?: string;
};

export class BuyService {
  static async create(userId: string, input: CreateBuyItemInput) {
    if (!input.title) throw new ValidationError("Title is required");

    const item = await prisma.buyItem.create({
      data: {
        title: input.title,
        priority: input.priority,
        targetPrice: input.targetPrice,
        link: input.link,
        notes: input.notes,
        status: BuyStatus.PLANNED,
        userId,
      },
    });

    // Async side effect (non-blocking)
    if (item.link) {
      await enqueueFetchMetadata(item.id);
    }
    
    // Invalidate cache
    await deleteByPattern(`buy:list:${userId}:*`);
    
    return item;
  }

  static async list(
    userId: string,
    opts: {
      page: number;
      limit: number;
      status?: "PLANNED" | "BOUGHT";
      priority?: "LOW" | "MEDIUM" | "HIGH";
      sort: "createdAt" | "priority";
      order: "asc" | "desc";
    }
  ) {
    const cacheKey = `buy:list:${userId}:${JSON.stringify(opts)}`;

    // Try cache first
    const cached = await getCache<{
      items: unknown[];
      meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from database
    const { page, limit, status, priority, sort, order } = opts;

    const where: any = {
      userId,
      deletedAt: null,
      ...(status && { status }),
      ...(priority && { priority }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.buyItem.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.buyItem.count({ where }),
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
    await setCache(cacheKey, result, 60);

    return result;
  }

  static async update(
  userId: string,
  id: string,
  updates: Partial<CreateBuyItemInput>
) {
  const item = await prisma.buyItem.findFirst({ where: { id, userId } });
  if (!item) throw new NotFoundError("Item not found");
  if (item.status !== BuyStatus.PLANNED) {
    throw new ForbiddenError("Only planned items can be edited");
  }

  const updated = await prisma.buyItem.update({
    where: { id },
    data: updates,
  });

  await deleteByPattern(`buy:list:${userId}:*`);

  return updated;
}


  static async changeStatus(userId: string, id: string, next: BuyStatus) {
  const item = await prisma.buyItem.findFirst({ where: { id, userId } });
  if (!item) throw new NotFoundError("Item not found");

  let updated;

  if (item.status === BuyStatus.PLANNED && next === BuyStatus.BOUGHT) {
    updated = await prisma.buyItem.update({
      where: { id },
      data: { status: BuyStatus.BOUGHT },
    });
  } else if (item.status === BuyStatus.BOUGHT && next === BuyStatus.PLANNED) {
    updated = await prisma.buyItem.update({
      where: { id },
      data: { status: BuyStatus.PLANNED },
    });
  } else {
    throw new ForbiddenError("Illegal status transition");
  }

  await deleteByPattern(`buy:list:${userId}:*`);

  return updated;
}


  static async softDelete(userId: string, id: string) {
  const item = await prisma.buyItem.findFirst({ where: { id, userId } });
  if (!item) throw new NotFoundError("Item not found");
  if (item.status !== BuyStatus.PLANNED) {
    throw new ForbiddenError("Only planned items can be deleted");
  }

  const deleted = await prisma.buyItem.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await deleteByPattern(`buy:list:${userId}:*`);

  return deleted;
}

  static async attachMetadata(
    buyItemId: string,
    metadata: Prisma.InputJsonValue
  ) {
    const item = await prisma.buyItem.findUnique({
      where: { id: buyItemId },
    });

    if (!item || item.deletedAt) return;

    // Update the item first
    await prisma.buyItem.update({
      where: { id: buyItemId },
      data: { metadata },
    });

    // Invalidate ALL caches for this user (more aggressive)
    await deleteByPattern(`buy:*:${item.userId}:*`);
    await deleteByPattern(`buy:list:${item.userId}:*`);
  }

  static async findById(buyItemId: string) {
    return prisma.buyItem.findUnique({
      where: { id: buyItemId },
    });
  }

  static async findItemsForPriceCheck() {
    // This is a system read operation (no specific userId to invalidate)
    return prisma.buyItem.findMany({
      where: {
        status: "PLANNED",
        deletedAt: null,
        link: { not: null },
      },
      select: { id: true },
    });
  }
}
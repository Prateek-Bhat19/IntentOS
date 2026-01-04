import { prisma } from "../db/prisma";
import { PrismaClient, BuyStatus, Priority } from "@prisma/client";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors/AppError";

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

    return prisma.buyItem.create({
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
  }

  static async list(userId: string) {
    return prisma.buyItem.findMany({
        where: {userId, deletedAt: null},
        orderBy: {createdAt: "desc"},
    });
  }

  static async update(userId: string, id: string, updates: Partial<CreateBuyItemInput>) {
    const item = await prisma.buyItem.findFirst({where: {id, userId}})
    if(!item) throw new NotFoundError("Item not found");
    if(item.status !== BuyStatus.PLANNED) {
        throw new ForbiddenError("Only planned items can be edited");
    }

    return prisma.buyItem.update({
        where: {id},
        data: updates,
    })
  }

  static async changeStatus(userId: string, id: string, next: BuyStatus) {
  const item = await prisma.buyItem.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundError("Item not found");

    if (item.status === BuyStatus.PLANNED && next === BuyStatus.BOUGHT) {
      return prisma.buyItem.update({ where: { id }, data: { status: BuyStatus.BOUGHT } });
    }

    if (item.status === BuyStatus.BOUGHT && next === BuyStatus.PLANNED) {
      // explicit revert
      return prisma.buyItem.update({ where: { id }, data: { status: BuyStatus.PLANNED } });
    }

    throw new ForbiddenError("Illegal status transition");
  }
  static async softDelete(userId: string, id: string) {
    const item = await prisma.buyItem.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundError("Item not found");
    if (item.status !== BuyStatus.PLANNED) {
      throw new ForbiddenError("Only planned items can be deleted");
    }

    return prisma.buyItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

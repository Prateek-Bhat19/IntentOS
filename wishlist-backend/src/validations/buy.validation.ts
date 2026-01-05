import { z } from "zod";

export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const buyStatusEnum = z.enum(["PLANNED", "BOUGHT"]);

export const createBuyItemSchema = z.object({
  title: z.string().min(1),
  priority: priorityEnum,
  targetPrice: z.number().positive().optional(),
  link: z.string().url().optional(),
  notes: z.string().optional(),
});

export const updateBuyItemSchema = createBuyItemSchema.partial();

export const changeStatusSchema = z.object({
  status: buyStatusEnum,
});

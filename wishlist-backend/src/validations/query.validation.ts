import { z } from "zod";

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["PLANNED", "BOUGHT"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  sort: z.enum(["createdAt", "priority"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

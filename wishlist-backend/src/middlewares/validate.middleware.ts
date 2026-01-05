import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { ValidationError } from "../errors/AppError";

export const validate =
  (schema: ZodType<unknown>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch {
      throw new ValidationError("Invalid request data");
    }
  };

import { Request, Response, NextFunction } from "express";
import { BuyService } from "../services/buy.service";
import { BuyStatus } from "@prisma/client";
import { listQuerySchema } from "../validations/query.validation";

export class BuyController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await BuyService.create(req.user.id, req.body);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query);
      const result = await BuyService.list(req.user.id, query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await BuyService.update(
        req.user.id,
        req.params.id,
        req.body
      );
      res.json(item);
    } catch (err) {
      next(err);
    }
  }

  static async changeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body as { status: BuyStatus };
      const item = await BuyService.changeStatus(
        req.user.id,
        req.params.id,
        status
      );
      res.json(item);
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await BuyService.softDelete(req.user.id, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

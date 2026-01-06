import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

export function httpLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    logger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userId: req.user?.id,
    });
  });

  next();
}

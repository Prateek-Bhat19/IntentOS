import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth/jwt";
import { AppError } from "../errors/AppError";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError("Authentication required", 401);
  }

  const token = header.split(" ")[1];

  const payload = verifyToken(token);

  req.user = { id: payload.userId };
  next();
}

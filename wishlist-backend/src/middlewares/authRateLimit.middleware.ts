import { Request, Response, NextFunction } from "express";
import { authRateLimiter } from "../rateLimit/auth.rateLimit";

export async function authRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const key = req.ip ?? "unknown-ip";
    
    await authRateLimiter.consume(key);
    next();
  } catch {
    res.status(429).json({
      message: "Too many attempts. Please try again later.",
    });
  }
}

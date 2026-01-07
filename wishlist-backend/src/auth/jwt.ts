import jwt from "jsonwebtoken";
import { env } from "../config/env";
const JWT_SECRET = env.JWT_SECRET || "dev-secret";

export type JwtPayload = {
  userId: string;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma";
import { AppError } from "../errors/AppError";
import { signToken } from "../auth/jwt";

export class AuthService {
  static async signup(email: string, password: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError("Email already in use", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    const token = signToken({ userId: user.id });

    return { token };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid credentials", 401);
    }

    const token = signToken({ userId: user.id });

    return { token };
  }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../db/prisma");
const AppError_1 = require("../errors/AppError");
const jwt_1 = require("../auth/jwt");
class AuthService {
    static async signup(email, password) {
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new AppError_1.AppError("Email already in use", 409);
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { email, passwordHash },
        });
        const token = (0, jwt_1.signToken)({ userId: user.id });
        return { token };
    }
    static async login(email, password) {
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new AppError_1.AppError("Invalid credentials", 401);
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            throw new AppError_1.AppError("Invalid credentials", 401);
        }
        const token = (0, jwt_1.signToken)({ userId: user.id });
        return { token };
    }
}
exports.AuthService = AuthService;

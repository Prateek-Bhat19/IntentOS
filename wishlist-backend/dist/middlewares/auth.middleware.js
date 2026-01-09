"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_1 = require("../auth/jwt");
const AppError_1 = require("../errors/AppError");
function requireAuth(req, _res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        throw new AppError_1.AppError("Authentication required", 401);
    }
    const token = header.split(" ")[1];
    const payload = (0, jwt_1.verifyToken)(token);
    req.user = { id: payload.userId };
    next();
}

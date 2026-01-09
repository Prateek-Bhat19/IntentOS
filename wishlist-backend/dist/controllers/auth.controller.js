"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
class AuthController {
    static async signup(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.AuthService.signup(email, password);
            res.status(201).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.AuthService.login(email, password);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;

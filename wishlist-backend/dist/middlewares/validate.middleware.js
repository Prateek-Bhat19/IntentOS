"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const AppError_1 = require("../errors/AppError");
const validate = (schema) => (req, _res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    }
    catch {
        throw new AppError_1.ValidationError("Invalid request data");
    }
};
exports.validate = validate;

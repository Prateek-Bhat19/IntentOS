"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLogger = httpLogger;
const logger_1 = require("../logger");
function httpLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        logger_1.logger.info({
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

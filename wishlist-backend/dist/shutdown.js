"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shutdown = shutdown;
const server_1 = require("./server");
const prisma_1 = require("./db/prisma");
const client_1 = require("./redis/client");
const logger_1 = require("./logger");
let shuttingDown = false;
async function shutdown(signal) {
    if (shuttingDown)
        return;
    shuttingDown = true;
    logger_1.logger.info({ signal }, "Graceful shutdown started");
    server_1.server.close(async () => {
        logger_1.logger.info("HTTP server closed");
        try {
            await prisma_1.prisma.$disconnect();
            logger_1.logger.info("Prisma disconnected");
            await client_1.redis.quit();
            logger_1.logger.info("Redis disconnected");
            process.exit(0);
        }
        catch (err) {
            logger_1.logger.error(err, "Error during shutdown");
            process.exit(1);
        }
    });
    setTimeout(() => {
        logger_1.logger.error("Forced shutdown");
        process.exit(1);
    }, 10_000);
}

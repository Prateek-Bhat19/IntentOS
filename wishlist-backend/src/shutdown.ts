import { server } from "./server";
import { prisma } from "./db/prisma";
import { redis } from "./redis/client";
import { logger } from "./logger";

let shuttingDown = false;

export async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Graceful shutdown started");

  server.close(async () => {
    logger.info("HTTP server closed");

    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected");

      await redis.quit();
      logger.info("Redis disconnected");

      process.exit(0);
    } catch (err) {
      logger.error(err, "Error during shutdown");
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Forced shutdown");
    process.exit(1);
  }, 10_000);
}

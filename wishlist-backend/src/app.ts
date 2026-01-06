import express from "express";
import cors from "cors";
import buyRoutes from "./routes/buy.routes";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import { enqueueFetchMetadata } from "./queues/buy.queue";
import { startPriceCheckCron } from "./cron/priceCheck.cron";
import { requestId } from "./middlewares/requestId.middleware";
import { httpLogger } from "./middlewares/httpLogger.middleware";
import healthRoutes from "./routes/health.routes";

const app = express();

app.use(requestId);
app.use(httpLogger);

app.use(cors());
app.use(express.json());
app.use("/", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/buy", buyRoutes);

startPriceCheckCron();

app.use(errorHandler);
export default app;

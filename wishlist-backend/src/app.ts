import express from "express";
import cors from "cors";
import buyRoutes from "./routes/buy.routes";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import { enqueueFetchMetadata } from "./queues/buy.queue";
import { startPriceCheckCron } from "./cron/priceCheck.cron";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/buy", buyRoutes);

startPriceCheckCron();

app.use(errorHandler);
export default app;

import express from "express";
import cors from "cors";
import buyRoutes from "./routes/buy.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());


// TEMP user injection (auth comes later)
app.use((req, _res, next) => {
  req.user = { id: "TEMP_USER_ID" } as any;
  next();
});

app.use("/api/buy", buyRoutes);

app.use(errorHandler);
export default app;

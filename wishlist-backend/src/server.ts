import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { shutdown } from "./shutdown";
import { env } from "./config/env";

const PORT = env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export {server};
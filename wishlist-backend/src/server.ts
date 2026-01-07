import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { shutdown } from "./shutdown";

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export {server};
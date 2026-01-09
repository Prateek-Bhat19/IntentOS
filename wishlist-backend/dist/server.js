"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const app_1 = __importDefault(require("./app"));
const shutdown_1 = require("./shutdown");
const env_1 = require("./config/env");
const PORT = env_1.env.PORT || 8000;
const server = app_1.default.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.server = server;
process.on("SIGTERM", shutdown_1.shutdown);
process.on("SIGINT", shutdown_1.shutdown);

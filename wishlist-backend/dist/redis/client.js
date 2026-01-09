"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
exports.redis = new ioredis_1.default({
    host: env_1.env.REDIS_HOST || "127.0.0.1",
    port: Number(env_1.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});

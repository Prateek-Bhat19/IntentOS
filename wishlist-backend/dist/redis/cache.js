"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCache = getCache;
exports.setCache = setCache;
exports.deleteByPattern = deleteByPattern;
const client_1 = require("./client");
async function getCache(key) {
    const data = await client_1.redis.get(key);
    return data ? JSON.parse(data) : null;
}
async function setCache(key, value, ttlSeconds) {
    await client_1.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}
async function deleteByPattern(pattern) {
    const keys = await client_1.redis.keys(pattern);
    if (keys.length) {
        await client_1.redis.del(keys);
    }
}

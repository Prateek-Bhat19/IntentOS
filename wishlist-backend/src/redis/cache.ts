import { redis } from "./client";

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? (JSON.parse(data) as T) : null;
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds: number
) {
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function deleteByPattern(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length) {
    await redis.del(keys);
  }
}

import Redis from "ioredis";
import { logger } from "../utils/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRedis(): any {
  if (!client) {
    client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    client.on("error", (err: Error) => logger.error({ err }, "Redis error"));
    client.on("connect", () => logger.info("Redis connected"));
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await (client as { quit(): Promise<string> }).quit();
    client = null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300
): Promise<void> {
  await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key);
}

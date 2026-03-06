import "dotenv/config";
import { buildApp } from "./app";
import { runMigrations } from "./db/client";
import { getRedis } from "./db/redis";
import { logger } from "./utils/logger";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main(): Promise<void> {
  logger.info("Running database migrations...");
  await runMigrations();

  const redis = getRedis();
  await redis.ping();
  logger.info("Redis ping OK");

  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });
  logger.info("Geo-Context Backend listening on " + HOST + ":" + PORT);
}

process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  const { closePool } = await import("./db/client");
  const { closeRedis } = await import("./db/redis");
  await closePool();
  await closeRedis();
  process.exit(0);
});

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from "fastify";
import { deviceRoutes } from "./routes/device";
import { locationRoutes } from "./routes/location";
import { eventRoutes } from "./routes/event";
import { adminRoutes } from "./routes/admin";
import { logger } from "./utils/logger";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const cors = require("@fastify/cors");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rateLimit = require("@fastify/rate-limit");

export async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: false, trustProxy: true });

  await (app as any).register(cors, { origin: "*" });
  await (app as any).register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
    errorResponseBuilder: () => ({
      success: false,
      error: "Rate limit exceeded. Slow down.",
    }),
  });

  (app as any).get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  await (app as any).register(deviceRoutes);
  await (app as any).register(locationRoutes);
  await (app as any).register(eventRoutes);
  await (app as any).register(adminRoutes);

  (app as any).setErrorHandler((error: any, _request: any, reply: any) => {
    logger.error({ err: error }, "Unhandled error");
    const status: number = (error as { statusCode?: number }).statusCode ?? 500;
    reply.code(status).send({
      success: false,
      error: status === 500 ? "Internal server error" : String(error.message),
    });
  });

  return app;
}

import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth";
import { deviceRoutes } from "./routes/device";
import { locationRoutes } from "./routes/location";
import { eventRoutes } from "./routes/event";
import { adminRoutes } from "./routes/admin";
import { logger } from "./utils/logger";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, trustProxy: true });

  // ─── CORS ────────────────────────────────────────────────────────────────
  const trustedOrigins = (process.env.TRUSTED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  await app.register(fastifyCors, {
    origin: trustedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  });

  // ─── Rate limit ──────────────────────────────────────────────────────────
  await app.register(fastifyRateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
    errorResponseBuilder: () => ({
      success: false,
      error: "Rate limit exceeded. Slow down.",
    }),
  });

  // ─── Health ──────────────────────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ─── Better Auth — catches all /api/auth/* requests ──────────────────────
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request: FastifyRequest, reply: FastifyReply) {
      const url = new URL(
        request.url,
        `${request.protocol}://${request.hostname}`
      );
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, Array.isArray(value) ? value.join(", ") : value);
      });
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.method !== "GET" && request.body
          ? { body: JSON.stringify(request.body) }
          : {}),
      });
      const response = await auth.handler(req);
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    },
  });

  // ─── App routes ──────────────────────────────────────────────────────────
  await app.register(deviceRoutes);
  await app.register(locationRoutes);
  await app.register(eventRoutes);
  await app.register(adminRoutes);

  // ─── Error handler ───────────────────────────────────────────────────────
  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      logger.error({ err: error }, "Unhandled error");
      const status = error.statusCode ?? 500;
      reply.code(status).send({
        success: false,
        error: status === 500 ? "Internal server error" : error.message,
      });
    }
  );

  return app;
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Redis from "ioredis";
import { jwtAuth } from "../middleware/auth";
import { logger } from "../utils/logger";

export async function streamRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /events/stream
   * Server-Sent Events endpoint — dashboard subscribes here to receive
   * real-time fence crossing events as they happen.
   *
   * Each event is emitted as:
   *   data: <JSON FenceStreamEvent>\n\n
   *
   * Requires a valid JWT Bearer token (dashboard session).
   * The connection stays open until the client disconnects.
   */
  (app as any).get(
    "/events/stream",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Set SSE headers before anything else
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // disable nginx buffering if present
      });
      reply.raw.flushHeaders();

      // Heartbeat — keeps the connection alive through proxies (every 25 s)
      const heartbeat = setInterval(() => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(": ping\n\n");
        }
      }, 25_000);

      // Each SSE client needs its own dedicated subscriber connection
      const subscriber = new Redis(
        process.env.REDIS_URL ?? "redis://localhost:6379",
        { lazyConnect: false, maxRetriesPerRequest: 3 }
      );

      subscriber.on("error", (err: Error) =>
        logger.warn({ err }, "SSE subscriber Redis error")
      );

      await subscriber.subscribe("geo:events");

      subscriber.on("message", (_channel: string, message: string) => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(`data: ${message}\n\n`);
        }
      });

      // Clean up when the client disconnects
      const cleanup = async (): Promise<void> => {
        clearInterval(heartbeat);
        try {
          await subscriber.unsubscribe("geo:events");
          subscriber.disconnect();
        } catch (err) {
          logger.warn({ err }, "Error cleaning up SSE subscriber");
        }
      };

      request.socket.on("close", () => void cleanup());
      request.socket.on("error", () => void cleanup());

      // Fastify must not auto-close the reply — we manage it manually
      await new Promise<void>((resolve) => {
        request.socket.on("close", resolve);
        request.socket.on("error", resolve);
      });
    }
  );
}

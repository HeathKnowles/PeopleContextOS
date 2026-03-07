/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { apiKeyAuth } from "../middleware/auth";
import {
  processTriggerEvent,
  getEventLogs,
  getFenceStats,
} from "../services/eventEngine";
import { TriggerEventBody, ApiResponse } from "../types";

export async function eventRoutes(app: FastifyInstance): Promise<void> {
  (app as any).post(
    "/event/trigger",
    { preHandler: [apiKeyAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { device_id, fence_id, event_type } = request.body as TriggerEventBody;

      if (!device_id || !fence_id || !event_type) {
        return reply.code(400).send({
          success: false,
          error: "device_id, fence_id, and event_type are required",
        } satisfies ApiResponse);
      }

      const validTypes = ["ENTER", "EXIT", "DWELL"];
      if (!validTypes.includes(event_type)) {
        return reply.code(400).send({
          success: false,
          error: `event_type must be one of: ${validTypes.join(", ")}`,
        } satisfies ApiResponse);
      }

      const result = await processTriggerEvent(request.body as TriggerEventBody);
      return reply
        .code(200)
        .send({ success: true, data: result } satisfies ApiResponse<typeof result>);
    }
  );

  (app as any).get(
    "/event/logs",
    { preHandler: [apiKeyAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fence_id, device_id, limit } = request.query as { fence_id?: string; device_id?: string; limit?: string };
      const limitN = limit ? parseInt(limit, 10) : 50;
      const logs = await getEventLogs(fence_id, device_id, limitN);
      return reply.send({ success: true, data: logs } satisfies ApiResponse);
    }
  );

  (app as any).get(
    "/event/stats/:fence_id",
    { preHandler: [apiKeyAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const stats = await getFenceStats((request.params as { fence_id: string }).fence_id);
      return reply.send({ success: true, data: stats } satisfies ApiResponse);
    }
  );
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { jwtAuth } from "../middleware/auth";
import { processLocationEvent } from "../services/eventEngine";
import { findNearbyFences } from "../services/fenceService";
import { updateLastSeen } from "../services/deviceService";
import type {
  LocationEventBody,
  NearbyFencesQuery,
  ApiResponse,
  GeoFence,
} from "../types";

export async function locationRoutes(app: FastifyInstance): Promise<void> {
  (app as any).post(
    "/location/event",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { device_id, lat, lng, timestamp } = request.body as LocationEventBody;

      if (!device_id || lat == null || lng == null || !timestamp) {
        return reply.code(400).send({
          success: false,
          error: "device_id, lat, lng, and timestamp are required",
        } satisfies ApiResponse);
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return reply.code(400).send({
          success: false,
          error: "lat must be in [-90,90] and lng in [-180,180]",
        } satisfies ApiResponse);
      }

      await updateLastSeen(device_id);
      const result = await processLocationEvent(request.body as LocationEventBody);

      return reply.code(200).send({
        success: true,
        data: result,
        message: `Matched ${result.matched} fence(s), notified ${result.notified}`,
      } satisfies ApiResponse<typeof result>);
    }
  );

  (app as any).get(
    "/fences/nearby",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng, radius } = request.query as NearbyFencesQuery;
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      const radiusN = radius ? parseInt(radius, 10) : 5000;

      if (isNaN(latN) || isNaN(lngN)) {
        return reply.code(400).send({
          success: false,
          error: "lat and lng must be valid numbers",
        } satisfies ApiResponse);
      }

      const fences = await findNearbyFences(latN, lngN, radiusN);
      return reply.send({
        success: true,
        data: fences,
      } satisfies ApiResponse<GeoFence[]>);
    }
  );
}

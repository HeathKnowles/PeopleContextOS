/* eslint-disable @typescript-eslint/no-explicit-any */
import { FastifyInstance } from "fastify";
import { apiKeyAuth } from "../middleware/auth";
import { upsertDevice, getDevice } from "../services/deviceService";
import { RegisterDeviceBody, ApiResponse, Device } from "../types";

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  (app as any).post(
    "/device/register",
    { preHandler: [apiKeyAuth] },
    async (request, reply) => {
      const body = request.body;

      if (!body.device_id || !body.platform || !body.app_version) {
        return reply.code(400).send({
          success: false,
          error: "device_id, platform, and app_version are required",
        } satisfies ApiResponse);
      }

      if (!["android", "ios"].includes(body.platform)) {
        return reply.code(400).send({
          success: false,
          error: "platform must be 'android' or 'ios'",
        } satisfies ApiResponse);
      }

      const device = await upsertDevice(body);
      return reply.code(200).send({
        success: true,
        data: device,
        message: "Device registered",
      } satisfies ApiResponse<Device>);
    }
  );

  (app as any).get(
    "/device/:id",
    { preHandler: [apiKeyAuth] },
    async (request, reply) => {
      const device = await getDevice(request.params.id);
      if (!device) {
        return reply
          .code(404)
          .send({ success: false, error: "Device not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, data: device } satisfies ApiResponse<Device>);
    }
  );
}

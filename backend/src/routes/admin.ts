import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { jwtAuth } from "../middleware/auth";
import { signToken } from "../utils/jwt";
import {
  createFence,
  getFenceById,
  listFences,
  deleteFence,
} from "../services/fenceService";
import {
  createCampaign,
  listCampaigns,
  toggleCampaign,
} from "../services/campaignService";
import type {
  CreateFenceBody,
  CreateCampaignBody,
  ApiResponse,
  GeoFence,
  Campaign,
} from "../types";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // ─── Session → JWT token exchange ───────────────────────────────────────
  // Called by the dashboard after login to get a Bearer token for /admin/* routes.
  (app as any).post(
    "/admin/token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session?.user) {
        return reply
          .code(401)
          .send({ success: false, error: "Not authenticated" } satisfies ApiResponse);
      }
      const token = signToken(session.user.id, { role: "admin" });
      return reply.send({ success: true, data: { token } } satisfies ApiResponse<{ token: string }>);
    }
  );

  // ─── GeoFence CRUD ──────────────────────────────────────────────────────

  (app as any).post(
    "/admin/fences",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest<{ Body: CreateFenceBody }>, reply: FastifyReply) => {
      const { name, latitude, longitude, radius, category } = request.body;
      if (!name || latitude == null || longitude == null || !radius || !category) {
        return reply.code(400).send({
          success: false,
          error: "name, latitude, longitude, radius, category are required",
        } satisfies ApiResponse);
      }
      const fence = await createFence(request.body);
      return reply
        .code(201)
        .send({ success: true, data: fence } satisfies ApiResponse<GeoFence>);
    }
  );

  (app as any).get(
    "/admin/fences",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const fences = await listFences(limit, offset);
      return reply.send({ success: true, data: fences } satisfies ApiResponse<GeoFence[]>);
    }
  );

  (app as any).get(
    "/admin/fences/:id",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const fence = await getFenceById(request.params.id);
      if (!fence) {
        return reply
          .code(404)
          .send({ success: false, error: "Fence not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, data: fence } satisfies ApiResponse<GeoFence>);
    }
  );

  (app as any).delete(
    "/admin/fences/:id",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest<{Params: {id: string}}>, reply: FastifyReply) => {
      const deleted = await deleteFence(request.params.id);
      if (!deleted) {
        return reply
          .code(404)
          .send({ success: false, error: "Fence not found" } satisfies ApiResponse);
      }
      return reply.send({
        success: true,
        message: "Fence deleted",
      } satisfies ApiResponse);
    }
  );

  // ─── Campaign CRUD ──────────────────────────────────────────────────────

  (app as any).post(
    "/admin/campaigns",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest<{ Body: CreateCampaignBody }>, reply: FastifyReply) => {
      const { fence_id, title, message_template, start_date } = request.body;
      if (!fence_id || !title || !message_template || !start_date) {
        return reply.code(400).send({
          success: false,
          error: "fence_id, title, message_template, start_date are required",
        } satisfies ApiResponse);
      }
      const campaign = await createCampaign(request.body);
      return reply
        .code(201)
        .send({ success: true, data: campaign } satisfies ApiResponse<Campaign>);
    }
  );

  (app as any).get(
    "/admin/campaigns",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest<{ Querystring: { fence_id?: string } }>, reply: FastifyReply) => {
      const campaigns = await listCampaigns(request.query.fence_id);
      return reply.send({
        success: true,
        data: campaigns,
      } satisfies ApiResponse<Campaign[]>);
    }
  );

  (app as any).patch(
    "/admin/campaigns/:id/toggle",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: { active: boolean } }>, reply: FastifyReply) => {
      const campaign = await toggleCampaign(request.params.id, request.body.active);
      if (!campaign) {
        return reply
          .code(404)
          .send({ success: false, error: "Campaign not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, data: campaign } satisfies ApiResponse<Campaign>);
    }
  );
}

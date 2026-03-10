import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { jwtAuth, adminOnly } from "../middleware/auth";
import { signToken } from "../utils/jwt";
import { query } from "../db/client";
import {
  createFence,
  getFenceById,
  listFences,
  deleteFence,
} from "../services/fenceService";
import {
  getSiteById,
  listSites,
  updateSite,
  deleteSite,
} from "../services/siteService";
import {
  createCampaign,
  listCampaigns,
} from "../services/campaignService";
import type {
  CreateFenceBody,
  CreateSiteBody,
  CreateCampaignBody,
  ApiResponse,
  GeoFence,
  FenceWithSite,
  DevelopmentSite,
  Campaign,
  CampaignWithTarget,
  UserRecord,
  UserRole,
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
      const userRole = (session.user as { role?: string }).role ?? "customer";
      const token = signToken(session.user.id, { role: userRole });
      return reply.send({ success: true, data: { token } } satisfies ApiResponse<{ token: string }>);
    }
  );

  // ─── GeoFence CRUD ──────────────────────────────────────────────────────

  (app as any).post(
    "/admin/fences",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Body: CreateFenceBody }>, reply: FastifyReply) => {
      const { name, category, latitude, longitude, radius } = request.body;
      if (!name || !category || latitude == null || longitude == null || radius == null) {
        return reply.code(400).send({
          success: false,
          error: "name, category, latitude, longitude, radius are required",
        } satisfies ApiResponse);
      }
      const fence = await createFence(request.body);
      return reply
        .code(201)
        .send({ success: true, data: fence } satisfies ApiResponse<FenceWithSite>);
    }
  );

  (app as any).get(
    "/admin/fences",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const fences = await listFences(limit, offset);
      return reply.send({ success: true, data: fences } satisfies ApiResponse<FenceWithSite[]>);
    }
  );

  (app as any).get(
    "/admin/fences/:id",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const fence = await getFenceById(request.params.id);
      if (!fence) {
        return reply
          .code(404)
          .send({ success: false, error: "Fence not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, data: fence } satisfies ApiResponse<FenceWithSite>);
    }
  );

  (app as any).delete(
    "/admin/fences/:id",
    { preHandler: [jwtAuth, adminOnly] },
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
  // ─── Development Sites CRUD ────────────────────────────────────────────────

  (app as any).get(
    "/admin/sites",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Querystring: { limit?: string; offset?: string } }>, reply: FastifyReply) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;
      const offset = request.query.offset ? parseInt(request.query.offset, 10) : 0;
      const sites = await listSites(limit, offset);
      return reply.send({ success: true, data: sites } satisfies ApiResponse<DevelopmentSite[]>);
    }
  );

  (app as any).get(
    "/admin/sites/:id",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const site = await getSiteById(request.params.id);
      if (!site) {
        return reply.code(404).send({ success: false, error: "Site not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, data: site } satisfies ApiResponse<DevelopmentSite>);
    }
  );

  (app as any).patch(
    "/admin/sites/:id",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<CreateSiteBody> }>, reply: FastifyReply) => {
      const site = await updateSite(request.params.id, request.body);
      if (!site) {
        return reply.code(404).send({ success: false, error: "Site not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, data: site } satisfies ApiResponse<DevelopmentSite>);
    }
  );

  (app as any).delete(
    "/admin/sites/:id",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const deleted = await deleteSite(request.params.id);
      if (!deleted) {
        return reply.code(404).send({ success: false, error: "Site not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, message: "Site deleted" } satisfies ApiResponse);
    }
  );
  // ─── Campaign CRUD ──────────────────────────────────────────────────────

  (app as any).post(
    "/admin/campaigns",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Body: CreateCampaignBody }>, reply: FastifyReply) => {
      const { site_id, title, message, trigger_type } = request.body;
      if (!site_id || !title || !message || !trigger_type) {
        return reply.code(400).send({
          success: false,
          error: "site_id, title, message, trigger_type are required",
        } satisfies ApiResponse);
      }
      const campaign = await createCampaign(request.body);
      return reply
        .code(201)
        .send({ success: true, data: campaign } satisfies ApiResponse<CampaignWithTarget>);
    }
  );

  (app as any).get(
    "/admin/campaigns",
    { preHandler: [jwtAuth, adminOnly] },
    async (request: FastifyRequest<{ Querystring: { site_id?: string } }>, reply: FastifyReply) => {
      const campaigns = await listCampaigns(request.query.site_id);
      return reply.send({
        success: true,
        data: campaigns,
      } satisfies ApiResponse<CampaignWithTarget[]>);
    }
  );

  // ─── User Management (admin only) ────────────────────────────────────────

  (app as any).get(
    "/admin/users",
    { preHandler: [jwtAuth, adminOnly] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const users = await query<UserRecord>(
        `SELECT id, name, email, email_verified, role, created_at, updated_at
         FROM "user" ORDER BY created_at DESC`
      );
      return reply.send({ success: true, data: users } satisfies ApiResponse<UserRecord[]>);
    }
  );

  (app as any).patch(
    "/admin/users/:id/role",
    { preHandler: [jwtAuth, adminOnly] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: { role: UserRole } }>,
      reply: FastifyReply
    ) => {
      const { role } = request.body;
      if (!(["admin", "customer"] as UserRole[]).includes(role)) {
        return reply.code(400).send({
          success: false,
          error: "role must be 'admin' or 'customer'",
        } satisfies ApiResponse);
      }
      const rows = await query<UserRecord>(
        `UPDATE "user" SET role = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, name, email, email_verified, role, created_at, updated_at`,
        [role, request.params.id]
      );
      if (!rows[0]) {
        return reply.code(404).send({ success: false, error: "User not found" } satisfies ApiResponse);
      }
      return reply.send({ success: true, data: rows[0] } satisfies ApiResponse<UserRecord>);
    }
  );
}

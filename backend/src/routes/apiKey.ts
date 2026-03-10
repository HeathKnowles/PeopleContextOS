import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { jwtAuth, adminOnly } from "../middleware/auth";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  listApiKeysByUser,
  revokeApiKeyByUser,
} from "../services/apiKeyService";
import type { ApiKey, CreateApiKeyBody, ApiResponse } from "../types";

export async function apiKeyRoutes(app: FastifyInstance): Promise<void> {
  // ─── Admin routes (see all keys) ─────────────────────────────────────────
  (app as any).post(
    "/admin/api-keys",
    { preHandler: [jwtAuth, adminOnly] },
    async (
      request: FastifyRequest<{ Body: CreateApiKeyBody }>,
      reply: FastifyReply
    ) => {
      const { label } = request.body ?? {};
      if (!label?.trim()) {
        return reply.code(400).send({
          success: false,
          error: "label is required",
        } satisfies ApiResponse);
      }
      const { key, rawKey } = await createApiKey(label.trim(), request.user.sub);
      return reply.code(201).send({
        success: true,
        data: { ...key, key: rawKey },
        message:
          "API key created. Copy and store it securely — it will not be shown again.",
      } satisfies ApiResponse<ApiKey & { key: string }>);
    }
  );

  (app as any).get(
    "/admin/api-keys",
    { preHandler: [jwtAuth, adminOnly] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const keys = await listApiKeys();
      return reply.send({ success: true, data: keys } satisfies ApiResponse<ApiKey[]>);
    }
  );

  (app as any).delete(
    "/admin/api-keys/:id",
    { preHandler: [jwtAuth, adminOnly] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const revoked = await revokeApiKey(request.params.id);
      if (!revoked) {
        return reply.code(404).send({
          success: false,
          error: "API key not found",
        } satisfies ApiResponse);
      }
      return reply.send({
        success: true,
        message: "API key revoked",
      } satisfies ApiResponse);
    }
  );

  // ─── Customer routes (own keys only) ─────────────────────────────────────

  (app as any).get(
    "/sdk/api-keys",
    { preHandler: [jwtAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const keys = await listApiKeysByUser(request.user.sub);
      return reply.send({ success: true, data: keys } satisfies ApiResponse<ApiKey[]>);
    }
  );

  (app as any).post(
    "/sdk/api-keys",
    { preHandler: [jwtAuth] },
    async (
      request: FastifyRequest<{ Body: CreateApiKeyBody }>,
      reply: FastifyReply
    ) => {
      const { label } = request.body ?? {};
      if (!label?.trim()) {
        return reply.code(400).send({
          success: false,
          error: "label is required",
        } satisfies ApiResponse);
      }
      const { key, rawKey } = await createApiKey(label.trim(), request.user.sub);
      return reply.code(201).send({
        success: true,
        data: { ...key, key: rawKey },
        message: "API key created. Copy and store it securely — it will not be shown again.",
      } satisfies ApiResponse<ApiKey & { key: string }>);
    }
  );

  (app as any).delete(
    "/sdk/api-keys/:id",
    { preHandler: [jwtAuth] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const revoked = await revokeApiKeyByUser(request.params.id, request.user.sub);
      if (!revoked) {
        return reply.code(404).send({
          success: false,
          error: "API key not found or not owned by you",
        } satisfies ApiResponse);
      }
      return reply.send({
        success: true,
        message: "API key revoked",
      } satisfies ApiResponse);
    }
  );
}

import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types";
import { verifyApiKey } from "../services/apiKeyService";

// ─── JWT middleware (dashboard / admin routes) ────────────────────────────────

export async function jwtAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authorization = request.headers["authorization"];

  if (!authorization?.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      error: "Missing or malformed Authorization header",
    });
  }

  const token = authorization.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    request.log.error("JWT_SECRET is not configured");
    return reply.code(500).send({
      success: false,
      error: "Server authentication is not configured",
    });
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    request.user = payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return reply.code(401).send({ success: false, error: "Token expired" });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return reply.code(401).send({ success: false, error: "Invalid token" });
    }
    throw err;
  }
}

// ─── Admin-only guard (apply after jwtAuth) ──────────────────────────────────
// Use as preHandler: [jwtAuth, adminOnly] on routes that require the admin role.

export async function adminOnly(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.user.role !== "admin") {
    return reply.code(403).send({
      success: false,
      error: "Admin access required",
    });
  }
}

// Accepts `pcos_…` API keys generated via POST /admin/api-keys.
// Falls back to standard JWT so existing integrations keep working.

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authorization = request.headers["authorization"];

  if (!authorization?.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      error: "Missing or malformed Authorization header",
    });
  }

  const token = authorization.slice(7);

  // --- API key path ---
  if (token.startsWith("pcos_")) {
    const key = await verifyApiKey(token);
    if (!key) {
      return reply.code(401).send({
        success: false,
        error: "Invalid or revoked API key",
      });
    }
    // Populate request.user so downstream handlers have a consistent interface
    request.user = { sub: `apikey:${key.id}`, role: "sdk" };
    return;
  }

  // --- JWT fallback path ---
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    request.log.error("JWT_SECRET is not configured");
    return reply.code(500).send({
      success: false,
      error: "Server authentication is not configured",
    });
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    request.user = payload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return reply.code(401).send({ success: false, error: "Token expired" });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return reply.code(401).send({ success: false, error: "Invalid token" });
    }
    throw err;
  }
}

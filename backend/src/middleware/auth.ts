import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types";

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



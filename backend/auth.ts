import { FastifyRequest, FastifyReply } from "fastify";

const validKeys = new Set<string>(
  (process.env.VALID_API_KEYS ?? "dev-key-1")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
);

export async function apiKeyAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const header = request.headers["x-api-key"] as string | undefined;
  const bearer = (request.headers["authorization"] as string | undefined ?? "")
    .replace(/^Bearer\s+/i, "");
  const key = header ?? bearer;

  if (!key || !validKeys.has(key)) {
    reply
      .code(401)
      .send({ success: false, error: "Invalid or missing API key" });
  }
}

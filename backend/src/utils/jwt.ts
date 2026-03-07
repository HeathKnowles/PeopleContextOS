import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { JwtPayload } from "../types";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

/**
 * Sign a new JWT for the given subject.
 * Expiry defaults to JWT_EXPIRES_IN env var, falling back to 24h.
 */
export function signToken(
  sub: string,
  options?: { role?: string; expiresIn?: string }
): string {
  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    sub,
    ...(options?.role ? { role: options.role } : {}),
  };

  const signOptions: SignOptions = {
    expiresIn: (options?.expiresIn ?? process.env.JWT_EXPIRES_IN ?? "24h") as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, getSecret(), signOptions);
}

/**
 * Verify and decode a JWT. Throws on invalid or expired tokens.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}

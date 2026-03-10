import crypto from "crypto";
import { query } from "../db/client";
import type { ApiKey } from "../types";

// ─── Key generation ───────────────────────────────────────────────────────────

/** Generates a new `pcos_` prefixed random key and its SHA-256 hash. */
function generateKey(): { raw: string; prefix: string; hash: string } {
  const raw = `pcos_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 12); // "pcos_" + 7 hex chars — safe to show in UI
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, prefix, hash };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a new API key for SDK distribution.
 * Returns the `ApiKey` row plus `rawKey` — the plaintext key shown **once**.
 */
export async function createApiKey(
  label: string,
  createdBy: string
): Promise<{ key: ApiKey; rawKey: string }> {
  const { raw, prefix, hash } = generateKey();
  const rows = await query<ApiKey>(
    `INSERT INTO sdk_api_keys (key_hash, key_prefix, label, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, key_prefix, label, created_by, created_at, last_used, active`,
    [hash, prefix, label, createdBy]
  );
  if (!rows[0]) throw new Error("Failed to create API key");
  return { key: rows[0], rawKey: raw };
}

/**
 * Verify a raw API key from an incoming request.
 * Updates `last_used` on success. Returns null if invalid or revoked.
 */
export async function verifyApiKey(raw: string): Promise<ApiKey | null> {
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const rows = await query<ApiKey>(
    `SELECT id, key_prefix, label, created_by, created_at, last_used, active
     FROM sdk_api_keys
     WHERE key_hash = $1 AND active = TRUE`,
    [hash]
  );
  if (!rows[0]) return null;
  // Fire-and-forget last_used update — don't block the request on this
  void query(`UPDATE sdk_api_keys SET last_used = NOW() WHERE id = $1`, [rows[0].id]);
  return rows[0];
}

/** List all API keys (never exposes key_hash). */
export async function listApiKeys(): Promise<ApiKey[]> {
  return query<ApiKey>(
    `SELECT id, key_prefix, label, created_by, created_at, last_used, active
     FROM sdk_api_keys
     ORDER BY created_at DESC`
  );
}

/** Soft-revoke an API key by ID. Returns false if not found. */
export async function revokeApiKey(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE sdk_api_keys SET active = FALSE WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows.length > 0;
}

/** List API keys owned by a specific user. */
export async function listApiKeysByUser(userId: string): Promise<ApiKey[]> {
  return query<ApiKey>(
    `SELECT id, key_prefix, label, created_by, created_at, last_used, active
     FROM sdk_api_keys
     WHERE created_by = $1
     ORDER BY created_at DESC`,
    [userId]
  );
}

/** Revoke an API key only if it belongs to userId. Returns false if not found or not owned. */
export async function revokeApiKeyByUser(id: string, userId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE sdk_api_keys SET active = FALSE WHERE id = $1 AND created_by = $2 RETURNING id`,
    [id, userId]
  );
  return rows.length > 0;
}

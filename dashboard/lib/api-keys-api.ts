import type { ApiKey } from "./types";
import { getAdminToken } from "./admin-token";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function authHeaders(extra?: Record<string, string>) {
    const token = await getAdminToken();
    return { Authorization: `Bearer ${token}`, ...extra };
}

// ─── Customer: own keys ────────────────────────────────────────────────────────

export async function listMyApiKeys(): Promise<ApiKey[]> {
    const res = await fetch(`${BASE}/sdk/api-keys`, {
        credentials: "include",
        headers: await authHeaders(),
    });
    const body = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to list API keys");
    return body.data ?? [];
}

export async function createMyApiKey(label: string): Promise<ApiKey & { key: string }> {
    const res = await fetch(`${BASE}/sdk/api-keys`, {
        method: "POST",
        credentials: "include",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ label }),
    });
    const body = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to create API key");
    return body.data;
}

export async function revokeMyApiKey(id: string): Promise<void> {
    const res = await fetch(`${BASE}/sdk/api-keys/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: await authHeaders(),
    });
    const body = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to revoke API key");
}

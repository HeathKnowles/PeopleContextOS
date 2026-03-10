import type { UserRecord, UserRole } from "./types";
import { getAdminToken } from "./admin-token";

const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

async function authHeaders(extra?: Record<string, string>) {
    const token = await getAdminToken();
    return { Authorization: `Bearer ${token}`, ...extra };
}

export async function listUsers(): Promise<UserRecord[]> {
    const res = await fetch(`${BASE}/admin/users`, {
        credentials: "include",
        headers: await authHeaders(),
    });
    const body = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to list users");
    return body.data ?? [];
}

export async function updateUserRole(id: string, role: UserRole): Promise<UserRecord> {
    const res = await fetch(`${BASE}/admin/users/${id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ role }),
    });
    const body = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to update role");
    return body.data;
}

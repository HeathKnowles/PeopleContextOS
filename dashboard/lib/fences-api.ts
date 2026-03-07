import type { GeoFence, CreateFenceBody } from "./types";

const BASE =
    (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000").replace(
        /\/$/,
        ""
    );

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function listFences(
    limit = 100,
    offset = 0
): Promise<GeoFence[]> {
    const res = await fetch(
        `${BASE}/admin/fences?limit=${limit}&offset=${offset}`,
        { credentials: "include" }
    );
    const body: ApiResponse<GeoFence[]> = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to list fences");
    return body.data ?? [];
}

export async function createFence(data: CreateFenceBody): Promise<GeoFence> {
    const res = await fetch(`${BASE}/admin/fences`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    const body: ApiResponse<GeoFence> = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to create fence");
    return body.data!;
}

export async function deleteFence(id: string): Promise<void> {
    const res = await fetch(`${BASE}/admin/fences/${id}`, {
        method: "DELETE",
        credentials: "include",
    });
    const body: ApiResponse = await res.json();
    if (!body.success) throw new Error(body.error ?? "Failed to delete fence");
}

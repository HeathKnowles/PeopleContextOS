const TOKEN_KEY = "pcos_admin_token";
const BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** Fetch a fresh JWT from the backend (exchanges the Better Auth session cookie). */
export async function fetchAdminToken(): Promise<string> {
    const res = await fetch(`${BASE}/admin/token`, {
        method: "POST",
        credentials: "include", // sends the Better Auth session cookie
    });
    const body = await res.json();
    if (!body.success || !body.data?.token) {
        throw new Error(body.error ?? "Failed to obtain admin token");
    }
    const token: string = body.data.token;
    sessionStorage.setItem(TOKEN_KEY, token);
    return token;
}

/**
 * Returns a valid admin JWT, fetching a new one if none is cached.
 * Call this inside any API function that needs Authorization.
 */
export async function getAdminToken(): Promise<string> {
    const cached = sessionStorage.getItem(TOKEN_KEY);
    if (cached) return cached;
    return fetchAdminToken();
}

/** Clear the stored token (call on sign-out). */
export function clearAdminToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
}

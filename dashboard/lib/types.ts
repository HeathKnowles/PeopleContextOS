export type SiteCategory =
    | "hospital"
    | "college"
    | "road"
    | "bridge"
    | "park"
    | "utility"
    | "transport"
    | "other";

export type UserRole = "admin" | "customer";

export interface UserRecord {
    id: string;
    name: string;
    email: string;
    email_verified: boolean;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface ApiKey {
    id: string;
    /** First 12 chars of the raw key — safe to display */
    key_prefix: string;
    label: string;
    created_by: string;
    created_at: string;
    last_used?: string | null;
    active: boolean;
}

export interface GeoFence {
    id: string;       // geo_fences.id
    site_id: string;
    radius: number;
    active: boolean;
    created_at: string;
    // Joined from development_sites
    name: string;
    category: SiteCategory;
    description?: string | null;
    latitude: number;
    longitude: number;
    impact_summary?: string | null;
    start_date?: string | null;
    completion_date?: string | null;
    authority?: string | null;
}

export interface CreateFenceBody {
    // Development site
    name: string;
    category: SiteCategory;
    description?: string;
    latitude: number;
    longitude: number;
    impact_summary?: string;
    start_date?: string;
    completion_date?: string;
    authority?: string;
    // Geofence
    radius: number;
}

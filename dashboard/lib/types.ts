export type SiteCategory =
    | "hospital"
    | "college"
    | "road"
    | "bridge"
    | "park"
    | "utility"
    | "transport"
    | "other";

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

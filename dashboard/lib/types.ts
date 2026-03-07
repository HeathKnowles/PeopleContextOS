export interface GeoFence {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    category: string;
    metadata: Record<string, unknown>;
    project_info?: string | null;
    created_at: string;
}

export interface CreateFenceBody {
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    category: string;
    metadata?: Record<string, unknown>;
    project_info?: string;
}

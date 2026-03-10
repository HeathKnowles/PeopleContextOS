// ─── Device ───────────────────────────────────────────────────────────────────

export interface Device {
  device_id: string;
  platform: "android" | "ios";
  fcm_token?: string | null;
  app_version: string;
  last_seen: Date;
  created_at: Date;
}

export interface RegisterDeviceBody {
  device_id: string;
  platform: "android" | "ios";
  app_version: string;
  fcm_token?: string;
}

// ─── Site Category ───────────────────────────────────────────────────────────

export type SiteCategory =
  | "hospital"
  | "college"
  | "road"
  | "bridge"
  | "park"
  | "utility"
  | "transport"
  | "other";

// ─── Development Site ─────────────────────────────────────────────────────────

export interface DevelopmentSite {
  id: string;
  name: string;
  category: SiteCategory;
  description?: string | null;
  latitude: number;
  longitude: number;
  geo_polygon?: unknown;
  impact_summary?: string | null;
  start_date?: Date | null;
  completion_date?: Date | null;
  authority?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSiteBody {
  name: string;
  category: SiteCategory;
  description?: string;
  latitude: number;
  longitude: number;
  impact_summary?: string;
  start_date?: string;
  completion_date?: string;
  authority?: string;
}

// ─── GeoFence ─────────────────────────────────────────────────────────────────

/** Raw geo_fences row */
export interface GeoFence {
  id: string;
  site_id: string;
  radius: number;
  active: boolean;
  created_at: Date;
}

/** geo_fences joined with development_sites — used in all API responses */
export interface FenceWithSite extends GeoFence {
  name: string;
  category: SiteCategory;
  description?: string | null;
  latitude: number;
  longitude: number;
  impact_summary?: string | null;
  start_date?: Date | null;
  completion_date?: Date | null;
  authority?: string | null;
}

/** Creates both a development_site and a geo_fence in one request */
export interface CreateFenceBody extends CreateSiteBody {
  radius: number;
  active?: boolean;
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export type TriggerType = "entry" | "dwell" | "exit";

export interface Campaign {
  id: string;
  site_id: string;
  title: string;
  message: string;
  media_url?: string | null;
  start_time?: Date | null;
  end_time?: Date | null;
  trigger_type: TriggerType;
  created_at: Date;
}

export interface CampaignTarget {
  campaign_id: string;
  demographic_filter?: Record<string, unknown> | null;
  language?: string | null;
}

export interface CampaignWithTarget extends Campaign {
  demographic_filter?: Record<string, unknown> | null;
  language?: string | null;
}

export interface CreateCampaignBody {
  site_id: string;
  title: string;
  message: string;
  media_url?: string;
  start_time?: string;
  end_time?: string;
  trigger_type: TriggerType;
  target?: {
    demographic_filter?: Record<string, unknown>;
    language?: string;
  };
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface EventLog {
  event_id: string;
  device_id: string;
  fence_id: string;
  event_type: "ENTER" | "EXIT" | "DWELL";
  timestamp: Date;
}

export interface LocationEventBody {
  device_id: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export interface NearbyFencesQuery {
  lat: string;
  lng: string;
  radius?: string;
}

export interface TriggerEventBody {
  device_id: string;
  fence_id: string;
  event_type: "ENTER" | "EXIT" | "DWELL";
}

/** One matched fence returned in the /location/event response for SDK overlay rendering */
export interface LocationEventFence {
  fence_id: string;
  name: string;
  category: SiteCategory;
  description?: string | null;
  impact_summary?: string | null;
  authority?: string | null;
  /** Set when an active campaign exists for this fence */
  campaign_title?: string;
  campaign_message?: string;
}

/** Full result payload for POST /location/event */
export interface LocationEventResult {
  matched: number;
  notified: number;
  /** Matched fence details — used by the SDK to render in-app overlays */
  fences: LocationEventFence[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationPayload {
  device_id: string;
  fcm_token: string;
  title: string;
  body: string;
  fence_id: string;
  data?: Record<string, string>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  /** Subject — identifies the caller (e.g. service name or client ID) */
  sub: string;
  /** Issued-at (Unix seconds) */
  iat?: number;
  /** Expiry (Unix seconds) */
  exp?: number;
  /** Optional role for future RBAC */
  role?: string;
}

// Augment FastifyRequest so request.user is typed in all route handlers
declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "customer";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

// ─── SDK API Keys ─────────────────────────────────────────────────────────────

/** Row returned from sdk_api_keys (never exposes key_hash) */
export interface ApiKey {
  id: string;
  /** First 12 chars of the raw key — safe to display in the dashboard */
  key_prefix: string;
  label: string;
  created_by: string;
  created_at: Date;
  last_used?: Date | null;
  active: boolean;
}

export interface CreateApiKeyBody {
  label: string;
}

// ─── Stream Events ────────────────────────────────────────────────────────────

/** Pushed to the `geo:events` Redis pub/sub channel and forwarded via SSE */
export interface FenceStreamEvent extends LocationEventFence {
  device_id: string;
  occurred_at: string; // ISO-8601
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

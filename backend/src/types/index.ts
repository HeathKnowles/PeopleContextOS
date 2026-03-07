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

// ─── GeoFence ─────────────────────────────────────────────────────────────────

export interface GeoFence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  category: string;
  metadata: Record<string, unknown>;
  project_info?: string | null;
  created_at: Date;
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

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface Campaign {
  campaign_id: string;
  fence_id: string;
  title: string;
  message_template: string;
  active: boolean;
  start_date: Date;
  end_date?: Date | null;
}

export interface CreateCampaignBody {
  fence_id: string;
  title: string;
  message_template: string;
  start_date: string;
  end_date?: string;
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

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationPayload {
  device_id: string;
  fcm_token: string;
  title: string;
  body: string;
  fence_id: string;
  data?: Record<string, string>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

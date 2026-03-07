import { query } from "../db/client";
import { getRedis } from "../db/redis";
import { findFencesContainingPoint } from "./fenceService";
import { getActiveCampaignForFence } from "./campaignService";
import { getDevice } from "./deviceService";
import { sendPushNotification } from "./notificationService";
import { EventLog, LocationEventBody, TriggerEventBody } from "../types";
import { logger } from "../utils/logger";

// 30-minute dedup window: same device + same fence = one notification
const DEDUP_TTL = 30 * 60;

async function isDuplicate(deviceId: string, fenceId: string): Promise<boolean> {
  const key = `dedup:${deviceId}:${fenceId}`;
  const redis = getRedis();
  const exists = await redis.get(key);
  if (exists) return true;
  await redis.set(key, "1", "EX", DEDUP_TTL);
  return false;
}

async function logEvent(
  deviceId: string,
  fenceId: string,
  eventType: "ENTER" | "EXIT" | "DWELL",
  timestamp?: Date
): Promise<EventLog> {
  const rows = await query<EventLog>(
    `INSERT INTO event_logs (device_id, fence_id, event_type, timestamp)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [deviceId, fenceId, eventType, timestamp ?? new Date()]
  );
  if (!rows[0]) throw new Error("Failed to insert event log");
  return rows[0];
}

/**
 * processLocationEvent — called for raw SDK pings.
 * Runs the full geo-lookup → campaign → dedup → push pipeline.
 */
export async function processLocationEvent(
  body: LocationEventBody
): Promise<{ matched: number; notified: number }> {
  const { device_id, lat, lng, timestamp } = body;

  const fences = await findFencesContainingPoint(lat, lng);
  if (fences.length === 0) return { matched: 0, notified: 0 };

  const device = await getDevice(device_id);
  let notified = 0;

  for (const fence of fences) {
    if (await isDuplicate(device_id, fence.id)) continue;

    await logEvent(device_id, fence.id, "ENTER", new Date(timestamp));

    const campaign = await getActiveCampaignForFence(fence.id);
    if (!campaign) continue;

    if (!device?.fcm_token) {
      logger.warn({ device_id }, "No FCM token — skipping push");
      continue;
    }

    const bodyText = campaign.message_template
      .replace(/\{\{name\}\}/g, fence.name)
      .replace(/\{\{category\}\}/g, fence.category)
      .replace(/\{\{project_info\}\}/g, fence.project_info ?? "");

    await sendPushNotification({
      device_id,
      fcm_token: device.fcm_token,
      title: campaign.title,
      body: bodyText,
      fence_id: fence.id,
      data: { campaign_id: campaign.campaign_id, category: fence.category },
    });

    notified++;
  }

  return { matched: fences.length, notified };
}

/**
 * processTriggerEvent — called when the Android Geofencing API
 * fires a native transition. Trusts the SDK, skips geo-lookup.
 */
export async function processTriggerEvent(
  body: TriggerEventBody
): Promise<{ logged: boolean; notified: boolean; message?: string }> {
  const { device_id, fence_id, event_type } = body;

  const eventLog = await logEvent(device_id, fence_id, event_type);

  if (event_type !== "ENTER") {
    return { logged: true, notified: false, message: "Non-ENTER event logged" };
  }

  if (await isDuplicate(device_id, fence_id)) {
    return { logged: true, notified: false, message: "Duplicate suppressed" };
  }

  const campaign = await getActiveCampaignForFence(fence_id);
  if (!campaign) {
    return { logged: true, notified: false, message: "No active campaign" };
  }

  const device = await getDevice(device_id);
  if (!device?.fcm_token) {
    return { logged: true, notified: false, message: "No FCM token" };
  }

  const result = await sendPushNotification({
    device_id,
    fcm_token: device.fcm_token,
    title: campaign.title,
    body: campaign.message_template,
    fence_id,
    data: { event_id: eventLog.event_id, campaign_id: campaign.campaign_id },
  });

  return { logged: true, notified: result.success };
}

// ─── Analytics ────────────────────────────────────────────────────────────

export async function getEventLogs(
  fenceId?: string,
  deviceId?: string,
  limit = 50
): Promise<EventLog[]> {
  if (fenceId && deviceId) {
    return query<EventLog>(
      `SELECT * FROM event_logs WHERE fence_id=$1 AND device_id=$2 ORDER BY timestamp DESC LIMIT $3`,
      [fenceId, deviceId, limit]
    );
  }
  if (fenceId) {
    return query<EventLog>(
      `SELECT * FROM event_logs WHERE fence_id=$1 ORDER BY timestamp DESC LIMIT $2`,
      [fenceId, limit]
    );
  }
  if (deviceId) {
    return query<EventLog>(
      `SELECT * FROM event_logs WHERE device_id=$1 ORDER BY timestamp DESC LIMIT $2`,
      [deviceId, limit]
    );
  }
  return query<EventLog>(
    `SELECT * FROM event_logs ORDER BY timestamp DESC LIMIT $1`,
    [limit]
  );
}

export async function getFenceStats(fenceId: string): Promise<{
  total_events: number;
  unique_devices: number;
  last_event?: Date;
}> {
  const rows = await query<{
    total_events: string;
    unique_devices: string;
    last_event: Date | null;
  }>(
    `SELECT
       COUNT(*)                  AS total_events,
       COUNT(DISTINCT device_id) AS unique_devices,
       MAX(timestamp)            AS last_event
     FROM event_logs
     WHERE fence_id = $1`,
    [fenceId]
  );
  const r = rows[0];
  if (!r) throw new Error("No stats returned for fence");
  return {
    total_events: parseInt(r.total_events, 10),
    unique_devices: parseInt(r.unique_devices, 10),
    ...(r.last_event ? { last_event: r.last_event } : {}),
  };
}

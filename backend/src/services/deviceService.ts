import { query } from "../db/client";
import type { Device, RegisterDeviceBody } from "../types";

export async function upsertDevice(body: RegisterDeviceBody): Promise<Device> {
  const rows = await query<Device>(
    `INSERT INTO devices (device_id, platform, app_version, fcm_token, last_seen)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (device_id) DO UPDATE
       SET platform    = EXCLUDED.platform,
           app_version = EXCLUDED.app_version,
           fcm_token   = COALESCE(EXCLUDED.fcm_token, devices.fcm_token),
           last_seen   = NOW()
     RETURNING *`,
    [body.device_id, body.platform, body.app_version, body.fcm_token ?? null]
  );
  if (!rows[0]) {
    throw new Error("Failed to upsert device");
  }
  return rows[0];
}

export async function getDevice(deviceId: string): Promise<Device | null> {
  const rows = await query<Device>(
    `SELECT * FROM devices WHERE device_id = $1`,
    [deviceId]
  );
  return rows[0] ?? null;
}

export async function updateLastSeen(deviceId: string): Promise<void> {
  await query(`UPDATE devices SET last_seen = NOW() WHERE device_id = $1`, [deviceId]);
}

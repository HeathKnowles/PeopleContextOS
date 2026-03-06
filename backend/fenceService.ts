import { query } from "../db/client";
import { cacheGet, cacheSet, cacheDel } from "../db/redis";
import { GeoFence, CreateFenceBody } from "../types";

const FENCE_TTL = 120;

export async function createFence(body: CreateFenceBody): Promise<GeoFence> {
  const rows = await query<GeoFence>(
    `INSERT INTO geo_fences (name, latitude, longitude, radius, category, metadata, project_info)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      body.name,
      body.latitude,
      body.longitude,
      body.radius,
      body.category,
      JSON.stringify(body.metadata ?? {}),
      body.project_info ?? null,
    ]
  );
  return rows[0];
}

export async function getFenceById(id: string): Promise<GeoFence | null> {
  const cached = await cacheGet<GeoFence>(`fence:${id}`);
  if (cached) return cached;

  const rows = await query<GeoFence>(`SELECT * FROM geo_fences WHERE id = $1`, [id]);
  if (!rows[0]) return null;

  await cacheSet(`fence:${id}`, rows[0], FENCE_TTL);
  return rows[0];
}

export async function listFences(limit = 100, offset = 0): Promise<GeoFence[]> {
  return query<GeoFence>(
    `SELECT * FROM geo_fences ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

/**
 * Fences whose circular region contains the given point (exact membership).
 */
export async function findFencesContainingPoint(
  lat: number,
  lng: number
): Promise<GeoFence[]> {
  return query<GeoFence>(
    `SELECT * FROM geo_fences
     WHERE ST_DWithin(
       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
       ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
       radius
     )`,
    [lat, lng]
  );
}

/**
 * Fences within a search radius of a point (SDK pre-caching).
 */
export async function findNearbyFences(
  lat: number,
  lng: number,
  searchRadius = 5000
): Promise<GeoFence[]> {
  return query<GeoFence>(
    `SELECT *,
       ROUND(ST_Distance(
         ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       )::numeric, 1) AS distance_m
     FROM geo_fences
     WHERE ST_DWithin(
       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
       ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
       $3
     )
     ORDER BY distance_m ASC`,
    [lat, lng, searchRadius]
  );
}

export async function deleteFence(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM geo_fences WHERE id = $1 RETURNING id`, [id]);
  await cacheDel(`fence:${id}`);
  return rows.length > 0;
}

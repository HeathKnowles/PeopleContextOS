import { query } from "../db/client";
import { cacheGet, cacheSet, cacheDel } from "../db/redis";
import type { CreateFenceBody, FenceWithSite } from "../types";

const FENCE_TTL = 120;

// Shared SELECT columns for all fence + site join queries
const SEL = `
  gf.id, gf.site_id, gf.radius, gf.active, gf.created_at,
  ds.name, ds.category, ds.description, ds.latitude, ds.longitude,
  ds.impact_summary, ds.start_date, ds.completion_date, ds.authority
`;
const FROM = `
  FROM geo_fences gf
  JOIN development_sites ds ON gf.site_id = ds.id
`;

export async function createFence(body: CreateFenceBody): Promise<FenceWithSite> {
  const rows = await query<FenceWithSite>(
    `WITH site AS (
       INSERT INTO development_sites
         (name, category, description, latitude, longitude,
          impact_summary, start_date, completion_date, authority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *
     ), fence AS (
       INSERT INTO geo_fences (site_id, radius, geometry, active)
       SELECT
         site.id,
         $10::float8,
         ST_Buffer(
           ST_SetSRID(ST_MakePoint(site.longitude, site.latitude), 4326)::geography,
           $10::float8
         ),
         $11
       FROM site
       RETURNING id, site_id, radius, active, created_at
     )
     SELECT
       fence.id, fence.site_id, fence.radius, fence.active, fence.created_at,
       site.name, site.category, site.description, site.latitude, site.longitude,
       site.impact_summary, site.start_date, site.completion_date, site.authority
     FROM fence, site`,
    [
      body.name,
      body.category,
      body.description ?? null,
      body.latitude,
      body.longitude,
      body.impact_summary ?? null,
      body.start_date ?? null,
      body.completion_date ?? null,
      body.authority ?? null,
      body.radius,
      body.active ?? true,
    ]
  );
  if (!rows[0]) throw new Error("Insert did not return a row");
  return rows[0];
}

export async function getFenceById(id: string): Promise<FenceWithSite | null> {
  const cached = await cacheGet<FenceWithSite>(`fence:${id}`);
  if (cached) return cached;

  const rows = await query<FenceWithSite>(
    `SELECT ${SEL} ${FROM} WHERE gf.id = $1`,
    [id]
  );
  if (!rows[0]) return null;

  await cacheSet(`fence:${id}`, rows[0], FENCE_TTL);
  return rows[0];
}

export async function listFences(limit = 100, offset = 0): Promise<FenceWithSite[]> {
  return query<FenceWithSite>(
    `SELECT ${SEL} ${FROM} ORDER BY gf.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

/**
 * Fences whose circular region contains the given point (exact membership).
 */
export async function findFencesContainingPoint(
  lat: number,
  lng: number
): Promise<FenceWithSite[]> {
  return query<FenceWithSite>(
    `SELECT ${SEL} ${FROM}
     WHERE gf.active = TRUE
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(ds.longitude, ds.latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
         gf.radius
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
): Promise<FenceWithSite[]> {
  return query<FenceWithSite>(
    `SELECT ${SEL},
       ROUND(ST_Distance(
         ST_SetSRID(ST_MakePoint(ds.longitude, ds.latitude), 4326)::geography,
         ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
       )::numeric, 1) AS distance_m
     ${FROM}
     WHERE gf.active = TRUE
       AND ST_DWithin(
         ST_SetSRID(ST_MakePoint(ds.longitude, ds.latitude), 4326)::geography,
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

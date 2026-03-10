import { query } from "../db/client";
import type { DevelopmentSite, CreateSiteBody } from "../types";

export async function getSiteById(id: string): Promise<DevelopmentSite | null> {
  const rows = await query<DevelopmentSite>(
    `SELECT * FROM development_sites WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listSites(limit = 100, offset = 0): Promise<DevelopmentSite[]> {
  return query<DevelopmentSite>(
    `SELECT * FROM development_sites ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

export async function updateSite(
  id: string,
  body: Partial<CreateSiteBody>
): Promise<DevelopmentSite | null> {
  const cols: Array<keyof CreateSiteBody> = [
    "name",
    "category",
    "description",
    "latitude",
    "longitude",
    "impact_summary",
    "start_date",
    "completion_date",
    "authority",
  ];

  const updates: string[] = [];
  const params: unknown[] = [];

  for (const col of cols) {
    if (body[col] !== undefined) {
      params.push(body[col] ?? null);
      updates.push(`${col} = $${params.length}`);
    }
  }

  if (updates.length === 0) return getSiteById(id);

  params.push(new Date()); // updated_at
  updates.push(`updated_at = $${params.length}`);

  params.push(id);
  const rows = await query<DevelopmentSite>(
    `UPDATE development_sites SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] ?? null;
}

export async function deleteSite(id: string): Promise<boolean> {
  const rows = await query(
    `DELETE FROM development_sites WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows.length > 0;
}

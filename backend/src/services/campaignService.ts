import { query } from "../db/client";
import type { Campaign, CreateCampaignBody } from "../types";

export async function createCampaign(body: CreateCampaignBody): Promise<Campaign> {
  const rows = await query<Campaign>(
    `INSERT INTO campaigns (fence_id, title, message_template, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      body.fence_id,
      body.title,
      body.message_template,
      new Date(body.start_date),
      body.end_date ? new Date(body.end_date) : null,
    ]
  );
  if (!rows[0]) throw new Error("Failed to create campaign");
  return rows[0];
}

export async function getActiveCampaignForFence(
  fenceId: string
): Promise<Campaign | null> {
  const rows = await query<Campaign>(
    `SELECT * FROM campaigns
     WHERE fence_id = $1
       AND active = TRUE
       AND start_date <= NOW()
       AND (end_date IS NULL OR end_date >= NOW())
     ORDER BY start_date DESC
     LIMIT 1`,
    [fenceId]
  );
  return rows[0] ?? null;
}

export async function listCampaigns(fenceId?: string): Promise<Campaign[]> {
  if (fenceId) {
    return query<Campaign>(
      `SELECT * FROM campaigns WHERE fence_id = $1 ORDER BY start_date DESC`,
      [fenceId]
    );
  }
  return query<Campaign>(`SELECT * FROM campaigns ORDER BY start_date DESC`);
}

export async function toggleCampaign(
  campaignId: string,
  active: boolean
): Promise<Campaign | null> {
  const rows = await query<Campaign>(
    `UPDATE campaigns SET active = $2 WHERE campaign_id = $1 RETURNING *`,
    [campaignId, active]
  );
  return rows[0] ?? null;
}

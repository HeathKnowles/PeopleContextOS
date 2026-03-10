import { query, withTransaction } from "../db/client";
import type { Campaign, CampaignWithTarget, CreateCampaignBody, TriggerType } from "../types";

export async function createCampaign(body: CreateCampaignBody): Promise<CampaignWithTarget> {
  return withTransaction(async (client) => {
    const result = await client.query<Campaign>(
      `INSERT INTO campaigns (site_id, title, message, media_url, start_time, end_time, trigger_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        body.site_id,
        body.title,
        body.message,
        body.media_url ?? null,
        body.start_time ? new Date(body.start_time) : null,
        body.end_time   ? new Date(body.end_time)   : null,
        body.trigger_type,
      ]
    );
    const campaign = result.rows[0];
    if (!campaign) throw new Error("Failed to create campaign");

    if (body.target) {
      await client.query(
        `INSERT INTO campaign_targets (campaign_id, demographic_filter, language)
         VALUES ($1, $2, $3)`,
        [
          campaign.id,
          body.target.demographic_filter ? JSON.stringify(body.target.demographic_filter) : null,
          body.target.language ?? null,
        ]
      );
    }

    return {
      ...campaign,
      demographic_filter: body.target?.demographic_filter ?? null,
      language: body.target?.language ?? null,
    };
  });
}

export async function getActiveCampaignForSite(
  siteId: string,
  triggerType: TriggerType
): Promise<CampaignWithTarget | null> {
  const rows = await query<CampaignWithTarget>(
    `SELECT c.*, ct.demographic_filter, ct.language
     FROM campaigns c
     LEFT JOIN campaign_targets ct ON ct.campaign_id = c.id
     WHERE c.site_id = $1
       AND c.trigger_type = $2
       AND (c.start_time IS NULL OR c.start_time <= NOW())
       AND (c.end_time   IS NULL OR c.end_time   >= NOW())
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [siteId, triggerType]
  );
  return rows[0] ?? null;
}

export async function listCampaigns(siteId?: string): Promise<CampaignWithTarget[]> {
  const base = `
    SELECT c.*, ct.demographic_filter, ct.language
    FROM campaigns c
    LEFT JOIN campaign_targets ct ON ct.campaign_id = c.id
  `;
  if (siteId) {
    return query<CampaignWithTarget>(
      `${base} WHERE c.site_id = $1 ORDER BY c.created_at DESC`,
      [siteId]
    );
  }
  return query<CampaignWithTarget>(`${base} ORDER BY c.created_at DESC`);
}

import { logger } from "../utils/logger";

// Use require to avoid named-export issues with pg stubs in dev
// In production with real @types/pg this can be `import { Pool, PoolClient } from "pg"`
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { Pool } = require("pg") as { Pool: any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPool(): any {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool.on("error", (err: Error) => logger.error({ err }, "PG pool error"));
  }
  return pool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as unknown as T[];
}

export async function withTransaction<T>(
  fn: (client: {
    query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
  }) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function runMigrations(): Promise<void> {
  const db = getPool();
  await db.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id   TEXT        PRIMARY KEY,
      platform    TEXT        NOT NULL CHECK (platform IN ('android','ios')),
      fcm_token   TEXT,
      app_version TEXT        NOT NULL DEFAULT '1.0',
      last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS geo_fences (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name         TEXT        NOT NULL,
      latitude     DOUBLE PRECISION NOT NULL,
      longitude    DOUBLE PRECISION NOT NULL,
      radius       INT         NOT NULL,
      category     TEXT        NOT NULL DEFAULT 'general',
      metadata     JSONB       NOT NULL DEFAULT '{}',
      project_info TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS geo_fences_location_idx
    ON geo_fences
    USING GIST (
      ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      campaign_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      fence_id         UUID        NOT NULL REFERENCES geo_fences(id) ON DELETE CASCADE,
      title            TEXT        NOT NULL,
      message_template TEXT        NOT NULL,
      active           BOOLEAN     NOT NULL DEFAULT TRUE,
      start_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      end_date         TIMESTAMPTZ
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS event_logs (
      event_id   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id  TEXT        NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      fence_id   UUID        NOT NULL REFERENCES geo_fences(id) ON DELETE CASCADE,
      event_type TEXT        NOT NULL CHECK (event_type IN ('ENTER','EXIT','DWELL')),
      timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS event_logs_device_idx ON event_logs (device_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS event_logs_fence_idx ON event_logs (fence_id);`);

  logger.info("Database migrations complete");
}

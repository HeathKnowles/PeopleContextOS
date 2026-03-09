import { Pool } from "pg";
import type { PoolClient } from "pg";
import { logger } from "../utils/logger";

let pool: Pool | null = null;

function getPool(): Pool {
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

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as unknown as T[];
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
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

  // PostGIS must be created by a superuser (run once manually):
  //   sudo -u postgres psql -d <dbname> -c "CREATE EXTENSION IF NOT EXISTS postgis;"
  // The app user only needs USAGE on the extension, not CREATE.
  // We skip this silently if it already exists or we lack permission.
  try {
    await db.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
  } catch (err) {
    // Non-fatal — PostGIS may already be installed or require superuser (see note above)
    logger.debug({ err }, "CREATE EXTENSION postgis skipped");
  }

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

  // This index uses PostGIS types — verify PostGIS is reachable before attempting
  try {
    const pgisCheck = await db.query<{ postgis_version: string }>(`SELECT PostGIS_Lib_Version() AS postgis_version;`);
    logger.info({ postgis_version: pgisCheck.rows[0]?.postgis_version }, "PostGIS detected");
    await db.query(`
      CREATE INDEX IF NOT EXISTS geo_fences_location_idx
      ON geo_fences
      USING GIST (
        geography(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326))
      );
    `);
    logger.info("geo_fences GIST index ready");
  } catch (err) {
    logger.warn({ err }, "geo_fences GIST index not created — PostGIS may not be installed.");
  }

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

  // ─── Better-Auth tables ────────────────────────────────────────────────────
  await db.query(`
    CREATE TABLE IF NOT EXISTS "user" (
      id             TEXT        PRIMARY KEY,
      name           TEXT        NOT NULL,
      email          TEXT        NOT NULL UNIQUE,
      email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
      image          TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      id         TEXT        PRIMARY KEY,
      expires_at TIMESTAMPTZ NOT NULL,
      token      TEXT        NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT,
      user_id    TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "account" (
      id                       TEXT        PRIMARY KEY,
      account_id               TEXT        NOT NULL,
      provider_id              TEXT        NOT NULL,
      user_id                  TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      access_token             TEXT,
      refresh_token            TEXT,
      id_token                 TEXT,
      access_token_expires_at  TIMESTAMPTZ,
      refresh_token_expires_at TIMESTAMPTZ,
      scope                    TEXT,
      password                 TEXT,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS "verification" (
      id         TEXT        PRIMARY KEY,
      identifier TEXT        NOT NULL,
      value      TEXT        NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    );
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS session_user_id_idx         ON "session"(user_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS session_token_idx           ON "session"(token);`);
  await db.query(`CREATE INDEX IF NOT EXISTS account_user_id_idx         ON "account"(user_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS account_provider_idx        ON "account"(provider_id, account_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);`);

  logger.info("Database migrations complete");
}

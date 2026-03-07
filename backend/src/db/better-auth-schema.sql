-- Better-Auth core tables (email/password provider, PostgreSQL)
-- Run this once against your database before starting the server.
-- See: https://www.better-auth.com/docs/concepts/database

CREATE TABLE IF NOT EXISTS "user" (
  id                TEXT        PRIMARY KEY,
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  email_verified    BOOLEAN     NOT NULL DEFAULT FALSE,
  image             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  id                TEXT        PRIMARY KEY,
  expires_at        TIMESTAMPTZ NOT NULL,
  token             TEXT        NOT NULL UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address        TEXT,
  user_agent        TEXT,
  user_id           TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  id                      TEXT        PRIMARY KEY,
  account_id              TEXT        NOT NULL,
  provider_id             TEXT        NOT NULL,
  user_id                 TEXT        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token            TEXT,
  refresh_token           TEXT,
  id_token                TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope                   TEXT,
  password                TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id          TEXT        PRIMARY KEY,
  identifier  TEXT        NOT NULL,
  value       TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS session_user_id_idx        ON "session"(user_id);
CREATE INDEX IF NOT EXISTS session_token_idx          ON "session"(token);
CREATE INDEX IF NOT EXISTS account_user_id_idx        ON "account"(user_id);
CREATE INDEX IF NOT EXISTS account_provider_idx       ON "account"(provider_id, account_id);
CREATE INDEX IF NOT EXISTS verification_identifier_idx ON "verification"(identifier);

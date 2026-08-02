BEGIN;

CREATE TABLE IF NOT EXISTS app_user (
  id text PRIMARY KEY,
  email text,
  name text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_unique
  ON app_user (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_handoff (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  provider_expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_session (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_session_active_user
  ON app_session (user_id, expires_at)
  WHERE revoked_at IS NULL;

COMMIT;

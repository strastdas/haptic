BEGIN;

CREATE TABLE IF NOT EXISTS cloud_collection (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cloud_collection_user_created
  ON cloud_collection (user_id, created_at);

CREATE TABLE IF NOT EXISTS cloud_note (
  id uuid PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES cloud_collection(id) ON DELETE CASCADE,
  path text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 1024 AND path !~ '^/'),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_note_collection_path_unique UNIQUE (collection_id, path)
);

CREATE INDEX IF NOT EXISTS cloud_note_collection_path
  ON cloud_note (collection_id, path);

COMMIT;

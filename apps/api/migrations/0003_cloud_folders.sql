BEGIN;

CREATE TABLE IF NOT EXISTS cloud_folder (
  id uuid PRIMARY KEY,
  collection_id uuid NOT NULL REFERENCES cloud_collection(id) ON DELETE CASCADE,
  path text NOT NULL CHECK (
    char_length(path) BETWEEN 1 AND 1024
    AND path !~ '^/'
    AND position(chr(92) in path) = 0
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_folder_collection_path_unique UNIQUE (collection_id, path)
);

CREATE INDEX IF NOT EXISTS cloud_folder_collection_path
  ON cloud_folder (collection_id, path);

COMMIT;

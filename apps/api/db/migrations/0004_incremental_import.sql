\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE source_sync_checkpoints (
  source_id text PRIMARY KEY REFERENCES data_sources(id) ON DELETE CASCADE,
  cursor jsonb CHECK (cursor IS NULL OR jsonb_typeof(cursor) = 'object'),
  high_watermark timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= created_at)
);

INSERT INTO schema_migrations (version)
VALUES ('0004_incremental_import')
ON CONFLICT (version) DO NOTHING;

COMMIT;

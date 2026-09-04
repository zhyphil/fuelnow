\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  saved_cursor jsonb;
  saved_high_watermark timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0004_incremental_import'
  ) THEN
    RAISE EXCEPTION 'Migration 0004_incremental_import is not recorded';
  END IF;

  IF to_regclass('public.source_sync_checkpoints') IS NULL THEN
    RAISE EXCEPTION 'source_sync_checkpoints table is missing';
  END IF;

  INSERT INTO data_sources (
    id,
    name,
    source_url,
    licence_name,
    licence_url,
    attribution_text,
    enabled
  )
  VALUES (
    '__incremental_import_verification__',
    'Incremental import verification',
    'https://example.invalid/source',
    'Verification only',
    'https://example.invalid/licence',
    'Transactional verification record',
    false
  );

  INSERT INTO source_sync_checkpoints (source_id, cursor, high_watermark)
  VALUES (
    '__incremental_import_verification__',
    '{"page": 1}'::jsonb,
    '2026-09-04T00:10:00Z'
  )
  ON CONFLICT (source_id) DO UPDATE
  SET
    cursor = EXCLUDED.cursor,
    high_watermark = EXCLUDED.high_watermark,
    updated_at = now();

  INSERT INTO source_sync_checkpoints (source_id, cursor, high_watermark)
  VALUES (
    '__incremental_import_verification__',
    '{"page": 2}'::jsonb,
    '2026-09-04T00:20:00Z'
  )
  ON CONFLICT (source_id) DO UPDATE
  SET
    cursor = EXCLUDED.cursor,
    high_watermark = EXCLUDED.high_watermark,
    updated_at = now();

  SELECT cursor, high_watermark
  INTO saved_cursor, saved_high_watermark
  FROM source_sync_checkpoints
  WHERE source_id = '__incremental_import_verification__';

  IF saved_cursor <> '{"page": 2}'::jsonb OR
    saved_high_watermark <> '2026-09-04T00:20:00Z'::timestamptz
  THEN
    RAISE EXCEPTION 'Incremental checkpoint did not advance atomically';
  END IF;
END
$$;

ROLLBACK;

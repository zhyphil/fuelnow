\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  first_record source_records;
  replayed_record source_records;
  updated_record source_records;
  stale_record source_records;
  identity_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0003_source_record_idempotency'
  ) THEN
    RAISE EXCEPTION 'Migration 0003_source_record_idempotency is not recorded';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index
    JOIN pg_class ON pg_class.oid = pg_index.indexrelid
    WHERE pg_class.relname = 'source_records_source_identity_uidx'
      AND pg_index.indisunique
      AND pg_index.indisvalid
      AND pg_index.indisready
  ) THEN
    RAISE EXCEPTION 'Source identity unique index is missing or invalid';
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
    '__idempotency_verification__',
    'Idempotency verification',
    'https://example.invalid/source',
    'Verification only',
    'https://example.invalid/licence',
    'Transactional verification record',
    false
  );

  SELECT * INTO first_record
  FROM upsert_source_record(
    '__idempotency_verification__',
    'station-42',
    NULL,
    '{"version": 1}'::jsonb,
    '2026-09-04T00:00:00Z',
    NULL,
    '2026-09-04T00:05:00Z'
  );

  SELECT * INTO replayed_record
  FROM upsert_source_record(
    '__idempotency_verification__',
    'station-42',
    NULL,
    '{"version": 1}'::jsonb,
    '2026-09-04T00:00:00Z',
    NULL,
    '2026-09-04T00:05:00Z'
  );

  IF replayed_record.id <> first_record.id OR
    replayed_record.updated_at <> first_record.updated_at
  THEN
    RAISE EXCEPTION 'Identical replay changed the source record';
  END IF;

  SELECT * INTO updated_record
  FROM upsert_source_record(
    '__idempotency_verification__',
    'station-42',
    NULL,
    '{"version": 2}'::jsonb,
    '2026-09-04T00:10:00Z',
    NULL,
    '2026-09-04T00:15:00Z'
  );

  IF updated_record.id <> first_record.id OR
    updated_record.raw_payload <> '{"version": 2}'::jsonb
  THEN
    RAISE EXCEPTION 'Newer source payload did not update in place';
  END IF;

  SELECT * INTO stale_record
  FROM upsert_source_record(
    '__idempotency_verification__',
    'station-42',
    NULL,
    '{"version": 0}'::jsonb,
    '2026-09-03T23:50:00Z',
    NULL,
    '2026-09-03T23:55:00Z'
  );

  IF stale_record.id <> first_record.id OR
    stale_record.raw_payload <> '{"version": 2}'::jsonb OR
    stale_record.fetched_at <> '2026-09-04T00:15:00Z'::timestamptz
  THEN
    RAISE EXCEPTION 'Older source payload overwrote the current record';
  END IF;

  SELECT count(*) INTO identity_count
  FROM source_records
  WHERE source_id = '__idempotency_verification__'
    AND source_record_id = 'station-42';

  IF identity_count <> 1 THEN
    RAISE EXCEPTION 'Expected one source identity row, found %', identity_count;
  END IF;
END
$$;

ROLLBACK;

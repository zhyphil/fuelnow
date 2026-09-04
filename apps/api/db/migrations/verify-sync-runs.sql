\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  succeeded_run_id bigint;
  failed_run_id bigint;
  completed_run sync_runs;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0007_sync_run_observability'
  ) THEN
    RAISE EXCEPTION 'Migration 0007_sync_run_observability is not recorded';
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
    '__sync_run_verification__',
    'Sync run verification',
    'https://example.invalid/source',
    'Verification only',
    'https://example.invalid/licence',
    'Transactional verification record',
    true
  );

  SELECT start_sync_run(
    '__sync_run_verification__',
    'incremental',
    '2026-09-04T00:00:00Z'
  ) INTO succeeded_run_id;

  BEGIN
    PERFORM start_sync_run(
      '__sync_run_verification__',
      'incremental',
      '2026-09-04T00:00:01Z'
    );
    RAISE EXCEPTION 'Concurrent source run unexpectedly succeeded';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  SELECT * INTO completed_run
  FROM finish_sync_run(
    succeeded_run_id,
    'succeeded',
    '2026-09-04T00:00:01.234Z',
    2,
    3,
    0,
    NULL,
    NULL
  );

  IF completed_run.duration_ms <> 1234 OR
    completed_run.pages_processed <> 2 OR
    completed_run.records_processed <> 3
  THEN
    RAISE EXCEPTION 'Succeeded sync metrics were not recorded correctly';
  END IF;

  SELECT start_sync_run(
    '__sync_run_verification__',
    'full_snapshot',
    '2026-09-04T00:01:00Z'
  ) INTO failed_run_id;

  SELECT * INTO completed_run
  FROM finish_sync_run(
    failed_run_id,
    'failed',
    '2026-09-04T00:01:02Z',
    1,
    10,
    1,
    'SOURCE_TIMEOUT',
    'Provider request timed out'
  );

  IF completed_run.duration_ms <> 2000 OR
    completed_run.failed_pages <> 1 OR
    completed_run.error_code <> 'SOURCE_TIMEOUT'
  THEN
    RAISE EXCEPTION 'Failed sync metrics were not recorded correctly';
  END IF;

  BEGIN
    PERFORM finish_sync_run(
      failed_run_id,
      'failed',
      '2026-09-04T00:01:03Z',
      1,
      10,
      1,
      'SOURCE_TIMEOUT',
      'Duplicate completion'
    );
    RAISE EXCEPTION 'Completed sync run unexpectedly completed twice';
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN NULL;
  END;
END
$$;

ROLLBACK;

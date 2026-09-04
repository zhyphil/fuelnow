\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  initial_generation bigint;
  current_generation bigint;
  cache_written boolean;
  cached_payload jsonb;
  source_changed boolean;
  invalidated_scopes integer;
  pruned_entries integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '0009_query_cache'
  ) THEN
    RAISE EXCEPTION 'Migration 0009_query_cache is not recorded';
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
    '__query_cache_verification__',
    'Query cache verification',
    'https://example.invalid/source',
    'Verification only',
    'https://example.invalid/licence',
    'Transactional verification record',
    true
  );

  INSERT INTO source_cache_scopes (source_id, country, service_type)
  VALUES ('__query_cache_verification__', 'FR', 'fuel');

  SELECT get_query_cache_generation(
    'FR',
    'fuel',
    '2026-09-04T00:00:00Z'
  ) INTO initial_generation;

  SELECT put_query_cache(
    'service_point_search',
    repeat('a', 64),
    'FR',
    'fuel',
    initial_generation,
    '{"result":["station-1"]}'::jsonb,
    '2026-09-04T00:00:00Z',
    '2026-09-04T00:05:00Z'
  ) INTO cache_written;

  IF NOT cache_written THEN
    RAISE EXCEPTION 'Current-generation cache entry was rejected';
  END IF;

  SELECT read_query_cache(
    'service_point_search',
    repeat('a', 64),
    'FR',
    'fuel',
    '2026-09-04T00:04:59Z'
  ) INTO cached_payload;

  IF cached_payload <> '{"result":["station-1"]}'::jsonb THEN
    RAISE EXCEPTION 'Live cache entry was not returned';
  END IF;

  SELECT changed INTO source_changed
  FROM upsert_source_record_with_change(
    '__query_cache_verification__',
    'record-1',
    NULL,
    '{"id":"record-1","price":1.50}'::jsonb,
    '2026-09-04T00:05:00Z',
    NULL,
    '2026-09-04T00:05:01Z'
  );

  IF NOT source_changed THEN
    RAISE EXCEPTION 'New source record was not reported as changed';
  END IF;

  SELECT invalidate_source_query_cache(
    '__query_cache_verification__',
    '2026-09-04T00:05:01Z'
  ) INTO invalidated_scopes;

  IF invalidated_scopes <> 1 THEN
    RAISE EXCEPTION 'Source cache scope was not invalidated';
  END IF;

  SELECT read_query_cache(
    'service_point_search',
    repeat('a', 64),
    'FR',
    'fuel',
    '2026-09-04T00:05:02Z'
  ) INTO cached_payload;

  IF cached_payload IS NOT NULL THEN
    RAISE EXCEPTION 'Invalidated cache entry remained readable';
  END IF;

  SELECT put_query_cache(
    'service_point_search',
    repeat('b', 64),
    'FR',
    'fuel',
    initial_generation,
    '{"result":[]}'::jsonb,
    '2026-09-04T00:05:02Z',
    '2026-09-04T00:10:02Z'
  ) INTO cache_written;

  IF cache_written THEN
    RAISE EXCEPTION 'Stale-generation cache write was accepted';
  END IF;

  SELECT get_query_cache_generation(
    'FR',
    'fuel',
    '2026-09-04T00:05:02Z'
  ) INTO current_generation;

  IF current_generation <> initial_generation + 1 THEN
    RAISE EXCEPTION 'Cache generation did not advance exactly once';
  END IF;

  SELECT changed INTO source_changed
  FROM upsert_source_record_with_change(
    '__query_cache_verification__',
    'record-1',
    NULL,
    '{"id":"record-1","price":1.50}'::jsonb,
    '2026-09-04T00:05:00Z',
    NULL,
    '2026-09-04T00:05:01Z'
  );

  IF source_changed THEN
    RAISE EXCEPTION 'Identical source replay was reported as changed';
  END IF;

  BEGIN
    PERFORM put_query_cache(
      'service_point_search',
      repeat('c', 64),
      'FR',
      'fuel',
      current_generation,
      '{"result":[]}'::jsonb,
      '2026-09-04T00:06:00Z',
      '2026-09-04T01:06:01Z'
    );
    RAISE EXCEPTION 'Cache entry exceeded the one-hour TTL cap';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  SELECT prune_query_cache(
    '2026-09-04T00:06:00Z',
    '2026-09-04T00:05:01Z'
  ) INTO pruned_entries;

  IF pruned_entries <> 1 THEN
    RAISE EXCEPTION 'Invalidated cache entry was not pruned';
  END IF;
END
$$;

ROLLBACK;

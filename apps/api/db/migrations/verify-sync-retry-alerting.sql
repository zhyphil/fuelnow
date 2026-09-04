\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  first_run_id bigint;
  retry_run_id bigint;
  permanent_run_id bigint;
  stale_run_id bigint;
  exhausted_alert_id bigint;
  stale_insert_count integer;
  decision sync_retry_decisions;
  alert sync_alert_outbox;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0008_sync_retry_alerting'
  ) THEN
    RAISE EXCEPTION 'Migration 0008_sync_retry_alerting is not recorded';
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
    '__sync_retry_verification__',
    'Sync retry verification',
    'https://example.invalid/source',
    'Verification only',
    'https://example.invalid/licence',
    'Transactional verification record',
    true
  );

  SELECT start_sync_run_attempt(
    '__sync_retry_verification__',
    'incremental',
    '2026-09-04T00:00:00Z',
    1::smallint
  ) INTO first_run_id;

  SELECT * INTO decision
  FROM finish_failed_sync_run(
    first_run_id,
    '2026-09-04T00:00:01Z',
    0,
    0,
    1,
    'SOURCE_TIMEOUT',
    'Provider timed out',
    'transient',
    2::smallint,
    '2026-09-04T00:00:05Z'
  );

  IF NOT decision.should_retry OR decision.next_attempt_at IS NULL THEN
    RAISE EXCEPTION 'Transient failure was not scheduled for retry';
  END IF;

  IF EXISTS (
    SELECT 1 FROM sync_alert_outbox WHERE sync_run_id = first_run_id
  ) THEN
    RAISE EXCEPTION 'Retryable failure generated a noisy alert';
  END IF;

  BEGIN
    PERFORM start_sync_run_attempt(
      '__sync_retry_verification__',
      'incremental',
      '2026-09-04T00:00:02Z',
      1::smallint
    );
    RAISE EXCEPTION 'Fresh run bypassed a pending retry';
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN NULL;
  END;

  BEGIN
    PERFORM start_sync_run_attempt(
      '__sync_retry_verification__',
      'incremental',
      '2026-09-04T00:00:04Z',
      2::smallint
    );
    RAISE EXCEPTION 'Retry started before its due time';
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN NULL;
  END;

  SELECT start_sync_run_attempt(
    '__sync_retry_verification__',
    'incremental',
    '2026-09-04T00:00:05Z',
    2::smallint
  ) INTO retry_run_id;

  IF NOT EXISTS (
    SELECT 1
    FROM sync_runs
    WHERE id = retry_run_id
      AND attempt_number = 2
      AND retry_of_run_id = first_run_id
  ) THEN
    RAISE EXCEPTION 'Retry ancestry was not recorded';
  END IF;

  SELECT * INTO decision
  FROM finish_failed_sync_run(
    retry_run_id,
    '2026-09-04T00:00:06Z',
    1,
    5,
    1,
    'SOURCE_TIMEOUT',
    'Provider still timed out',
    'transient',
    2::smallint,
    NULL
  );

  IF decision.should_retry THEN
    RAISE EXCEPTION 'Exhausted failure scheduled another retry';
  END IF;

  SELECT id INTO exhausted_alert_id
  FROM sync_alert_outbox
  WHERE sync_run_id = retry_run_id
    AND alert_type = 'sync_retry_exhausted';

  IF exhausted_alert_id IS NULL THEN
    RAISE EXCEPTION 'Exhausted retry did not enqueue an alert';
  END IF;

  IF EXISTS (
    SELECT 1 FROM sync_alert_outbox
    WHERE id = exhausted_alert_id AND payload ? 'errorMessage'
  ) THEN
    RAISE EXCEPTION 'Alert payload exposed the provider error message';
  END IF;

  SELECT * INTO alert
  FROM complete_sync_alert_delivery(
    exhausted_alert_id,
    false,
    '2026-09-04T00:00:07Z',
    'Notification endpoint unavailable'
  );

  IF alert.status <> 'delivery_failed' OR alert.delivery_attempts <> 1 THEN
    RAISE EXCEPTION 'Failed alert delivery was not tracked';
  END IF;

  SELECT * INTO alert
  FROM complete_sync_alert_delivery(
    exhausted_alert_id,
    true,
    '2026-09-04T00:00:08Z',
    NULL
  );

  IF alert.status <> 'delivered' OR alert.delivery_attempts <> 2 THEN
    RAISE EXCEPTION 'Successful alert redelivery was not tracked';
  END IF;

  SELECT start_sync_run_attempt(
    '__sync_retry_verification__',
    'full_snapshot',
    '2026-09-04T00:01:00Z',
    1::smallint
  ) INTO permanent_run_id;

  PERFORM finish_failed_sync_run(
    permanent_run_id,
    '2026-09-04T00:01:01Z',
    0,
    0,
    1,
    'SOURCE_SCHEMA_INVALID',
    'Provider schema is incompatible',
    'permanent',
    4::smallint,
    NULL
  );

  IF NOT EXISTS (
    SELECT 1 FROM sync_alert_outbox
    WHERE sync_run_id = permanent_run_id
      AND alert_type = 'sync_permanent_failure'
  ) THEN
    RAISE EXCEPTION 'Permanent failure did not enqueue an alert';
  END IF;

  SELECT start_sync_run_attempt(
    '__sync_retry_verification__',
    'incremental',
    '2026-09-04T00:10:00Z',
    1::smallint
  ) INTO stale_run_id;

  SELECT enqueue_stale_sync_run_alerts(
    '2026-09-04T01:10:01Z',
    interval '1 hour'
  ) INTO stale_insert_count;

  IF stale_insert_count <> 1 THEN
    RAISE EXCEPTION 'Stale run alert was not enqueued';
  END IF;

  SELECT enqueue_stale_sync_run_alerts(
    '2026-09-04T01:11:00Z',
    interval '1 hour'
  ) INTO stale_insert_count;

  IF stale_insert_count <> 0 OR (
    SELECT count(*) FROM sync_alert_outbox
    WHERE sync_run_id = stale_run_id AND alert_type = 'sync_stale_run'
  ) <> 1 THEN
    RAISE EXCEPTION 'Stale run alert was not deduplicated';
  END IF;
END
$$;

ROLLBACK;

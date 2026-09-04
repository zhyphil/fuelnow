\set ON_ERROR_STOP on

BEGIN;

\i /fixtures/base.sql

DO $$
DECLARE
  site_status text;
  service_status text;
  service_status_time timestamptz;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0012_service_opening_evidence'
  ) THEN
    RAISE EXCEPTION 'Migration 0012_service_opening_evidence is not recorded';
  END IF;

  UPDATE service_point_services
  SET
    opening_status = 'closed',
    opening_status_evaluated_at = '2026-01-15T12:00:00Z'
  WHERE service_point_id = '00000000-0000-4000-8000-000000000101'
    AND service_type = 'air';

  SELECT
    opening_status,
    service_opening_status,
    service_opening_status_evaluated_at
  INTO site_status, service_status, service_status_time
  FROM search_service_point_candidates(1.4442, 43.6047, 100, 'air', 20)
  LIMIT 1;

  IF site_status <> 'open' OR service_status <> 'closed' THEN
    RAISE EXCEPTION 'Site and service opening evidence were not kept separate';
  END IF;
  IF service_status_time <> '2026-01-15T12:00:00Z'::timestamptz THEN
    RAISE EXCEPTION 'Service opening evaluation time was not returned';
  END IF;

  BEGIN
    UPDATE service_point_services
    SET opening_status = 'open', opening_status_evaluated_at = NULL
    WHERE service_point_id = '00000000-0000-4000-8000-000000000101'
      AND service_type = 'wash';
    RAISE EXCEPTION 'Known service opening status without a timestamp was accepted';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END
$$;

ROLLBACK;

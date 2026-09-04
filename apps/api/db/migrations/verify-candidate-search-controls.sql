\set ON_ERROR_STOP on

BEGIN;

DO $verification$
DECLARE
  all_count integer;
  france_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM schema_migrations
    WHERE version = '0013_candidate_search_controls'
  ) THEN
    RAISE EXCEPTION 'Migration 0013_candidate_search_controls is not recorded';
  END IF;

  INSERT INTO service_points (id, country, name, location)
  VALUES
    (
      '00000000-0000-4000-8000-000000000901',
      'FR',
      'Candidate control verification FR',
      ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography
    ),
    (
      '00000000-0000-4000-8000-000000000902',
      'ES',
      'Candidate control verification ES',
      ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography
    );

  INSERT INTO service_point_services (service_point_id, service_type)
  VALUES
    ('00000000-0000-4000-8000-000000000901', 'fuel'),
    ('00000000-0000-4000-8000-000000000902', 'fuel');

  SELECT count(*) INTO all_count
  FROM search_service_point_candidates(1, 43, 1000, 'fuel', 50, NULL);

  SELECT count(*) INTO france_count
  FROM search_service_point_candidates(1, 43, 1000, 'fuel', 50, 'FR');

  IF all_count <> 2 OR france_count <> 1 THEN
    RAISE EXCEPTION 'Optional country filter returned incorrect candidate counts';
  END IF;

  BEGIN
    PERFORM search_service_point_candidates(1, 43, 1000, 'fuel', 50, 'DE');
    RAISE EXCEPTION 'Unsupported country was accepted';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Unsupported country was accepted' THEN
        RAISE;
      END IF;
  END;
END
$verification$;

ROLLBACK;

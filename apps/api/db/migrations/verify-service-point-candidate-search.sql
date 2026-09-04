\set ON_ERROR_STOP on

BEGIN;

\i /fixtures/base.sql

DO $$
DECLARE
  candidate_count integer;
  first_candidate_id uuid;
  maximum_distance double precision;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0010_service_point_candidate_search'
  ) THEN
    RAISE EXCEPTION 'Migration 0010_service_point_candidate_search is not recorded';
  END IF;

  SELECT count(*), max(straight_line_distance_m)
  INTO candidate_count, maximum_distance
  FROM search_service_point_candidates(1.4442, 43.6047, 2000, 'fuel', 20);

  IF candidate_count <> 2 OR maximum_distance > 2000 THEN
    RAISE EXCEPTION 'Toulouse radius search returned unexpected candidates';
  END IF;

  SELECT id INTO first_candidate_id
  FROM search_service_point_candidates(1.4442, 43.6047, 2000, 'fuel', 20)
  LIMIT 1;

  IF first_candidate_id <> '00000000-0000-4000-8000-000000000101' THEN
    RAISE EXCEPTION 'Candidate search is not ordered by distance';
  END IF;

  SELECT count(*) INTO candidate_count
  FROM search_service_point_candidates(1.4442, 43.6047, 100, 'air', 20);

  IF candidate_count <> 1 THEN
    RAISE EXCEPTION 'Air service eligibility was not applied';
  END IF;

  SELECT count(*) INTO candidate_count
  FROM search_service_point_candidates(2.8675, 42.4650, 1000, 'fuel', 20);

  IF candidate_count <> 2 THEN
    RAISE EXCEPTION 'Cross-border radius search did not return both countries';
  END IF;

  SELECT count(*) INTO candidate_count
  FROM search_service_point_candidates(1.4442, 43.6047, 2000, 'fuel', 1);

  IF candidate_count <> 1 THEN
    RAISE EXCEPTION 'Candidate limit was not applied';
  END IF;

  UPDATE service_points
  SET
    lifecycle_status = 'permanently_closed',
    lifecycle_changed_at = '2026-01-15T12:01:00Z',
    closure_reason = 'Synthetic permanent closure'
  WHERE id = '00000000-0000-4000-8000-000000000102';

  SELECT count(*) INTO candidate_count
  FROM search_service_point_candidates(1.4442, 43.6047, 2000, 'fuel', 20);

  IF candidate_count <> 1 THEN
    RAISE EXCEPTION 'Permanently closed point remained search eligible';
  END IF;

  BEGIN
    PERFORM search_service_point_candidates(181, 43, 1000, 'fuel', 20);
    RAISE EXCEPTION 'Invalid longitude was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'longitude must be between -180 and 180' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM search_service_point_candidates(2, 43, 0, 'fuel', 20);
    RAISE EXCEPTION 'Invalid radius was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'radius must be between 1 and 100000 metres' THEN RAISE; END IF;
  END;
END
$$;

ROLLBACK;

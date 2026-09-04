\set ON_ERROR_STOP on

BEGIN;

DO $verification$
DECLARE
  point_id uuid := '10000000-0000-4000-8000-000000000011';
  first_reservation uuid := '10000000-0000-4000-8000-000000000012';
  denied_reservation uuid := '10000000-0000-4000-8000-000000000013';
  reserved boolean;
  finalized boolean;
  cached_count integer;
  persisted_origin_columns integer;
  usage route_usage_monthly;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '0011_route_cache_budget'
  ) THEN
    RAISE EXCEPTION 'Migration 0011_route_cache_budget is not recorded';
  END IF;

  INSERT INTO service_points (
    id,
    country,
    location,
    created_at,
    updated_at
  )
  VALUES (
    point_id,
    'FR',
    ST_SetSRID(ST_MakePoint(1.444, 43.605), 4326)::geography,
    '2026-09-04T00:00:00Z',
    '2026-09-04T00:00:00Z'
  );

  SELECT count(*) INTO persisted_origin_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'route_cache_entries'
    AND column_name IN ('origin', 'origin_longitude', 'origin_latitude');
  IF persisted_origin_columns <> 0 THEN
    RAISE EXCEPTION 'Route cache persists an exact origin column';
  END IF;

  PERFORM put_route_cache_entries(
    jsonb_build_array(jsonb_build_object(
      'cache_key_hash', repeat('a', 64),
      'provider', 'mapbox',
      'profile', 'driving-traffic',
      'destination_id', point_id,
      'road_distance_m', 1234.5,
      'eta_seconds', 180,
      'calculated_at', '2026-09-04T00:00:00Z',
      'traffic_aware', true
    )),
    '2026-09-04T00:00:00Z',
    300
  );

  SELECT count(*) INTO cached_count
  FROM read_route_cache(
    ARRAY[repeat('a', 64), repeat('b', 64)],
    '2026-09-04T00:04:59Z'
  );
  IF cached_count <> 1 THEN
    RAISE EXCEPTION 'Live route cache entry was not returned';
  END IF;

  SELECT count(*) INTO cached_count
  FROM read_route_cache(
    ARRAY[repeat('a', 64)],
    '2026-09-04T00:05:00Z'
  );
  IF cached_count <> 0 THEN
    RAISE EXCEPTION 'Expired route cache entry remained readable';
  END IF;

  SELECT reserve_route_elements(
    first_reservation,
    'mapbox',
    '2026-09-01',
    7,
    9,
    '2026-09-04T00:00:00Z'
  ) INTO reserved;
  IF NOT reserved THEN
    RAISE EXCEPTION 'Valid route budget reservation was denied';
  END IF;

  SELECT reserve_route_elements(
    denied_reservation,
    'mapbox',
    '2026-09-01',
    3,
    9,
    '2026-09-04T00:00:01Z'
  ) INTO reserved;
  IF reserved THEN
    RAISE EXCEPTION 'Monthly route budget was exceeded';
  END IF;
  IF EXISTS (SELECT 1 FROM route_usage_reservations WHERE id = denied_reservation) THEN
    RAISE EXCEPTION 'Denied reservation was persisted';
  END IF;

  SELECT finalize_route_usage(
    first_reservation,
    6,
    '2026-09-04T00:00:02Z'
  ) INTO finalized;
  IF NOT finalized THEN
    RAISE EXCEPTION 'Route usage reservation was not finalized';
  END IF;
  SELECT finalize_route_usage(
    first_reservation,
    6,
    '2026-09-04T00:00:03Z'
  ) INTO finalized;
  IF finalized THEN
    RAISE EXCEPTION 'Route usage reservation finalized twice';
  END IF;

  SELECT * INTO usage
  FROM route_usage_monthly
  WHERE provider = 'mapbox' AND billing_month = '2026-09-01';
  IF usage.reserved_elements <> 7 OR
     usage.successful_elements <> 6 OR
     usage.failed_elements <> 1 OR
     usage.request_count <> 1 THEN
    RAISE EXCEPTION 'Route usage aggregate is incorrect';
  END IF;

  IF prune_route_cache('2026-09-04T00:05:00Z') <> 1 THEN
    RAISE EXCEPTION 'Expired route cache entry was not pruned';
  END IF;
END
$verification$;

ROLLBACK;

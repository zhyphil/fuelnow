\set ON_ERROR_STOP on

BEGIN;

\ir base.sql
\ir base.sql

DO $$
DECLARE
  actual_count integer;
BEGIN
  SELECT count(*) INTO actual_count
  FROM data_sources WHERE id LIKE '__fixture__%';
  IF actual_count <> 5 THEN
    RAISE EXCEPTION 'Expected 5 fixture sources, found %', actual_count;
  END IF;

  SELECT count(*) INTO actual_count
  FROM service_points
  WHERE id::text LIKE '00000000-0000-4000-8000-000000000%';
  IF actual_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 fixture service points, found %', actual_count;
  END IF;

  SELECT count(*) INTO actual_count
  FROM service_point_services
  WHERE service_point_id::text LIKE '00000000-0000-4000-8000-000000000%';
  IF actual_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 fixture service declarations, found %', actual_count;
  END IF;

  SELECT count(*) INTO actual_count
  FROM source_records WHERE source_id LIKE '__fixture__%';
  IF actual_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 fixture source records, found %', actual_count;
  END IF;

  SELECT count(*) INTO actual_count
  FROM fuel_offers
  WHERE service_point_id::text LIKE '00000000-0000-4000-8000-000000000%';
  IF actual_count <> 7 THEN
    RAISE EXCEPTION 'Expected 7 fixture fuel offers, found %', actual_count;
  END IF;

  SELECT count(*) INTO actual_count
  FROM fuel_prices
  WHERE service_point_id::text LIKE '00000000-0000-4000-8000-000000000%';
  IF actual_count <> 6 THEN
    RAISE EXCEPTION 'Expected 6 idempotent fixture fuel prices, found %', actual_count;
  END IF;

  IF (
    SELECT count(*)
    FROM service_points
    WHERE id::text LIKE '00000000-0000-4000-8000-000000000%'
      AND country = 'FR'
  ) <> 3 OR (
    SELECT count(*)
    FROM service_points
    WHERE id::text LIKE '00000000-0000-4000-8000-000000000%'
      AND country = 'ES'
  ) <> 3 THEN
    RAISE EXCEPTION 'Fixture must contain three service points per country';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM service_points AS point
    JOIN fuel_offers AS offer ON offer.service_point_id = point.id
    WHERE point.id = '00000000-0000-4000-8000-000000000102'
      AND point.lifecycle_status = 'temporarily_closed'
      AND offer.out_of_stock
  ) THEN
    RAISE EXCEPTION 'Fixture closure and stockout scenario is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM charging_sites
    WHERE service_point_id = '00000000-0000-4000-8000-000000000202'
      AND available_evses = 1
      AND known_status_evses = 2
      AND total_evses = 2
  ) THEN
    RAISE EXCEPTION 'Fixture EVSE availability scenario is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM fuel_prices
    WHERE service_point_id = '00000000-0000-4000-8000-000000000203'
      AND freshness = 'stale'
  ) THEN
    RAISE EXCEPTION 'Fixture stale price scenario is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM data_sources
    WHERE id LIKE '__fixture__%'
      AND (
        source_url NOT LIKE 'https://example.invalid/%' OR
        licence_url NOT LIKE 'https://example.invalid/%'
      )
  ) THEN
    RAISE EXCEPTION 'Fixture unexpectedly references a live provider';
  END IF;
END
$$;

ROLLBACK;

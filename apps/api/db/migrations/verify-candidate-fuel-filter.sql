\set ON_ERROR_STOP on

BEGIN;

DO $verification$
DECLARE
  all_count integer;
  diesel_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM schema_migrations
    WHERE version = '0014_candidate_fuel_filter'
  ) THEN
    RAISE EXCEPTION 'Migration 0014_candidate_fuel_filter is not recorded';
  END IF;

  INSERT INTO service_points (id, country, name, location)
  VALUES
    ('00000000-0000-4000-8000-000000000911', 'FR', 'Diesel', ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography),
    ('00000000-0000-4000-8000-000000000912', 'FR', 'E85', ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography),
    ('00000000-0000-4000-8000-000000000913', 'FR', 'Diesel not offered', ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography);

  INSERT INTO service_point_services (service_point_id, service_type)
  VALUES
    ('00000000-0000-4000-8000-000000000911', 'fuel'),
    ('00000000-0000-4000-8000-000000000912', 'fuel'),
    ('00000000-0000-4000-8000-000000000913', 'fuel');

  INSERT INTO fuel_offers (
    service_point_id,
    fuel_type,
    source_fuel_id,
    source_label,
    available,
    out_of_stock,
    unavailable_reason
  )
  VALUES
    ('00000000-0000-4000-8000-000000000911', 'diesel', 'diesel', 'Diesel', true, false, NULL),
    ('00000000-0000-4000-8000-000000000912', 'e85', 'e85', 'E85', true, false, NULL),
    ('00000000-0000-4000-8000-000000000913', 'diesel', 'diesel', 'Diesel', false, false, 'permanent_non_offering');

  SELECT count(*) INTO all_count
  FROM search_service_point_candidates(1, 43, 1000, 'fuel', 50, 'FR', NULL);

  SELECT count(*) INTO diesel_count
  FROM search_service_point_candidates(1, 43, 1000, 'fuel', 50, 'FR', 'diesel');

  IF all_count <> 3 OR diesel_count <> 1 THEN
    RAISE EXCEPTION 'Fuel type filter returned incorrect candidate counts';
  END IF;

  BEGIN
    PERFORM search_service_point_candidates(1, 43, 1000, 'wash', 50, 'FR', 'diesel');
    RAISE EXCEPTION 'Fuel type filter was accepted for a non-Fuel service';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Fuel type filter was accepted for a non-Fuel service' THEN
        RAISE;
      END IF;
  END;
END
$verification$;

ROLLBACK;

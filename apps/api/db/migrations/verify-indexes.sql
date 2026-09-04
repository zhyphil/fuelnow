\set ON_ERROR_STOP on

DO $$
DECLARE
  required_index text;
  required_indexes text[] := ARRAY[
    'service_points_location_gist',
    'service_points_country_opening_status_idx',
    'service_point_services_type_point_idx',
    'fuel_offers_type_availability_point_idx',
    'fuel_prices_latest_idx',
    'charging_evses_point_status_idx',
    'charging_connectors_filter_idx',
    'air_services_working_status_idx',
    'wash_services_working_status_idx'
  ];
BEGIN
  FOREACH required_index IN ARRAY required_indexes LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_index
      JOIN pg_class ON pg_class.oid = pg_index.indexrelid
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      WHERE pg_namespace.nspname = 'public'
        AND pg_class.relname = required_index
        AND pg_index.indisvalid
        AND pg_index.indisready
    ) THEN
      RAISE EXCEPTION 'Required ready and valid index % is missing', required_index;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '0002_query_indexes'
  ) THEN
    RAISE EXCEPTION 'Migration 0002_query_indexes is not recorded';
  END IF;

  IF pg_get_indexdef('service_points_location_gist'::regclass)
    NOT LIKE '%USING gist (location)%'
  THEN
    RAISE EXCEPTION 'service_points_location_gist is not a GiST location index';
  END IF;
END
$$;

SET enable_seqscan = off;

EXPLAIN (COSTS OFF)
SELECT id
FROM service_points
WHERE ST_DWithin(
  location,
  ST_SetSRID(ST_MakePoint(1.4442, 43.6047), 4326)::geography,
  10000
);

EXPLAIN (COSTS OFF)
SELECT service_point_id
FROM service_point_services
WHERE service_type = 'fuel';

EXPLAIN (COSTS OFF)
SELECT service_point_id, fuel_type, amount
FROM fuel_prices
WHERE service_point_id = '00000000-0000-0000-0000-000000000001'
  AND fuel_type = 'diesel'
ORDER BY source_observed_at DESC NULLS LAST, created_at DESC
LIMIT 1;

RESET enable_seqscan;

\set ON_ERROR_STOP on

DO $$
DECLARE
  required_table text;
  required_tables text[] := ARRAY[
    'schema_migrations',
    'data_sources',
    'service_points',
    'service_point_services',
    'source_records',
    'field_provenance',
    'fuel_offers',
    'fuel_prices',
    'charging_sites',
    'charging_evses',
    'charging_connectors',
    'charging_tariff_components',
    'air_services',
    'wash_services',
    'wash_service_types',
    'wash_programs',
    'sync_runs'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    RAISE EXCEPTION 'PostGIS extension is missing';
  END IF;

  FOREACH required_table IN ARRAY required_tables LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'Required table % is missing', required_table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE version = '0001_initial'
  ) THEN
    RAISE EXCEPTION 'Migration 0001_initial is not recorded';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_points'
      AND column_name = 'location'
      AND udt_name = 'geography'
  ) THEN
    RAISE EXCEPTION 'service_points.location is not PostGIS geography';
  END IF;
END
$$;

SELECT current_setting('server_version') AS postgres_version;
SELECT PostGIS_Version() AS postgis_version;
SELECT version, applied_at FROM schema_migrations ORDER BY version;

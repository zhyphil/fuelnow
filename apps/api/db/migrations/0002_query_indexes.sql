\set ON_ERROR_STOP on

BEGIN;

CREATE INDEX IF NOT EXISTS service_points_location_gist
  ON service_points USING gist (location);

CREATE INDEX IF NOT EXISTS service_points_country_opening_status_idx
  ON service_points (country, opening_status, id);

CREATE INDEX IF NOT EXISTS service_point_services_type_point_idx
  ON service_point_services (service_type, service_point_id);

CREATE INDEX IF NOT EXISTS fuel_offers_type_availability_point_idx
  ON fuel_offers (fuel_type, available, out_of_stock, service_point_id);

CREATE INDEX IF NOT EXISTS fuel_prices_latest_idx
  ON fuel_prices (
    service_point_id,
    fuel_type,
    source_observed_at DESC NULLS LAST,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS charging_evses_point_status_idx
  ON charging_evses (service_point_id, status);

CREATE INDEX IF NOT EXISTS charging_connectors_filter_idx
  ON charging_connectors (connector_type, power_kw, evse_id)
  WHERE operational IS DISTINCT FROM false;

CREATE INDEX IF NOT EXISTS air_services_working_status_idx
  ON air_services (working_status, service_point_id);

CREATE INDEX IF NOT EXISTS wash_services_working_status_idx
  ON wash_services (working_status, service_point_id);

INSERT INTO schema_migrations (version)
VALUES ('0002_query_indexes')
ON CONFLICT (version) DO NOTHING;

COMMIT;

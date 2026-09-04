\set ON_ERROR_STOP on

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_sources (
  id text PRIMARY KEY CHECK (btrim(id) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  source_url text NOT NULL CHECK (source_url LIKE 'https://%'),
  licence_name text NOT NULL CHECK (btrim(licence_name) <> ''),
  licence_url text NOT NULL CHECK (licence_url LIKE 'https://%'),
  attribution_text text NOT NULL CHECK (btrim(attribution_text) <> ''),
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= created_at)
);

CREATE TABLE IF NOT EXISTS service_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL CHECK (country IN ('FR', 'ES')),
  name text,
  brand text,
  location geography(Point, 4326) NOT NULL,
  address_street text,
  address_house_number text,
  address_postal_code text,
  address_locality text,
  address_administrative_area text,
  address_formatted text,
  timezone text CHECK (
    timezone IS NULL OR
    (country = 'FR' AND timezone = 'Europe/Paris') OR
    (country = 'ES' AND timezone = 'Europe/Madrid')
  ),
  opening_hours jsonb CHECK (
    opening_hours IS NULL OR jsonb_typeof(opening_hours) = 'object'
  ),
  opening_status text NOT NULL DEFAULT 'unknown' CHECK (
    opening_status IN ('open', 'closed', 'closing_soon', 'opening_soon', 'unknown')
  ),
  opening_status_evaluated_at timestamptz,
  temporary_closure boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ST_SRID(location::geometry) = 4326),
  CHECK (ST_Y(location::geometry) BETWEEN -90 AND 90),
  CHECK (ST_X(location::geometry) BETWEEN -180 AND 180),
  CHECK (updated_at >= created_at),
  CHECK (opening_status = 'unknown' OR opening_status_evaluated_at IS NOT NULL),
  CHECK (temporary_closure IS DISTINCT FROM true OR opening_status = 'closed')
);

CREATE TABLE IF NOT EXISTS service_point_services (
  service_point_id uuid NOT NULL REFERENCES service_points(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (
    service_type IN ('fuel', 'charging', 'air', 'wash')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_point_id, service_type)
);

CREATE TABLE IF NOT EXISTS source_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL REFERENCES data_sources(id),
  source_record_id text NOT NULL CHECK (btrim(source_record_id) <> ''),
  service_point_id uuid REFERENCES service_points(id) ON DELETE SET NULL,
  raw_payload jsonb NOT NULL CHECK (
    jsonb_typeof(raw_payload) IN ('object', 'array')
  ),
  source_observed_at timestamptz,
  source_published_at timestamptz,
  fetched_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    source_observed_at IS NULL OR source_observed_at <= fetched_at
  ),
  CHECK (
    source_published_at IS NULL OR source_published_at <= fetched_at
  )
);

CREATE TABLE IF NOT EXISTS field_provenance (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_point_id uuid NOT NULL REFERENCES service_points(id) ON DELETE CASCADE,
  field_path text NOT NULL CHECK (field_path LIKE '/%'),
  source_record_id bigint NOT NULL REFERENCES source_records(id) ON DELETE RESTRICT,
  observed_at timestamptz,
  fetched_at timestamptz NOT NULL,
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  confidence_score smallint NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  conflict boolean NOT NULL DEFAULT false,
  CHECK (observed_at IS NULL OR observed_at <= fetched_at),
  CHECK (
    (confidence = 'high' AND confidence_score BETWEEN 80 AND 100) OR
    (confidence = 'medium' AND confidence_score BETWEEN 50 AND 79) OR
    (confidence = 'low' AND confidence_score BETWEEN 0 AND 49)
  )
);

CREATE TABLE IF NOT EXISTS fuel_offers (
  service_point_id uuid NOT NULL REFERENCES service_points(id) ON DELETE CASCADE,
  fuel_type text NOT NULL CHECK (
    fuel_type IN (
      'sp95', 'sp95_e10', 'sp98', 'e85', 'diesel',
      'premium_diesel', 'lpg', 'cng', 'lng'
    )
  ),
  source_fuel_id text NOT NULL CHECK (btrim(source_fuel_id) <> ''),
  source_label text NOT NULL CHECK (btrim(source_label) <> ''),
  available boolean,
  out_of_stock boolean,
  unavailable_reason text CHECK (
    unavailable_reason IS NULL OR
    unavailable_reason IN (
      'temporary_shortage', 'permanent_non_offering', 'unknown'
    )
  ),
  source_observed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_point_id, fuel_type),
  CHECK (
    available IS NOT TRUE OR
    (out_of_stock IS FALSE AND unavailable_reason IS NULL)
  ),
  CHECK (
    out_of_stock IS NOT TRUE OR
    (available IS FALSE AND unavailable_reason IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS fuel_prices (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_point_id uuid NOT NULL,
  fuel_type text NOT NULL,
  amount numeric(12, 4) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  unit text NOT NULL CHECK (unit IN ('liter', 'kilogram')),
  tax_included boolean,
  membership_required boolean,
  source_observed_at timestamptz,
  freshness text NOT NULL CHECK (
    freshness IN ('live', 'verified', 'recent', 'stale', 'unknown')
  ),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (service_point_id, fuel_type)
    REFERENCES fuel_offers(service_point_id, fuel_type) ON DELETE CASCADE,
  CHECK (
    (fuel_type IN ('cng', 'lng') AND unit = 'kilogram') OR
    (fuel_type NOT IN ('cng', 'lng') AND unit = 'liter')
  )
);

CREATE TABLE IF NOT EXISTS charging_sites (
  service_point_id uuid PRIMARY KEY REFERENCES service_points(id) ON DELETE CASCADE,
  operator_name text,
  network_name text,
  available_evses integer CHECK (available_evses >= 0),
  known_status_evses integer CHECK (known_status_evses >= 0),
  unknown_status_evses integer CHECK (unknown_status_evses >= 0),
  total_evses integer NOT NULL CHECK (total_evses > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (available_evses IS NULL AND known_status_evses IS NULL AND unknown_status_evses IS NULL) OR
    (
      available_evses IS NOT NULL AND
      known_status_evses IS NOT NULL AND
      unknown_status_evses IS NOT NULL AND
      available_evses <= known_status_evses AND
      known_status_evses + unknown_status_evses = total_evses
    )
  )
);

CREATE TABLE IF NOT EXISTS charging_evses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_point_id uuid NOT NULL REFERENCES charging_sites(service_point_id) ON DELETE CASCADE,
  source_evse_id text,
  status text NOT NULL DEFAULT 'unknown' CHECK (
    status IN ('available', 'occupied', 'out_of_service', 'reserved', 'unknown')
  ),
  operational boolean,
  source_observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'unknown' OR source_observed_at IS NOT NULL),
  CHECK (
    status NOT IN ('available', 'occupied', 'reserved') OR
    operational IS DISTINCT FROM false
  ),
  CHECK (status <> 'out_of_service' OR operational IS DISTINCT FROM true),
  CHECK (updated_at >= created_at)
);

CREATE TABLE IF NOT EXISTS charging_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evse_id uuid NOT NULL REFERENCES charging_evses(id) ON DELETE CASCADE,
  source_connector_id text,
  connector_type text CHECK (
    connector_type IS NULL OR
    connector_type IN (
      'ccs_combo_2', 'type_2', 'type_2_attached', 'chademo',
      'domestic_socket', 'tesla_eu', 'unknown'
    )
  ),
  power_kw numeric(10, 3) CHECK (power_kw > 0),
  operational boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= created_at)
);

CREATE TABLE IF NOT EXISTS charging_tariff_components (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  connector_id uuid NOT NULL REFERENCES charging_connectors(id) ON DELETE CASCADE,
  source_tariff_id text,
  amount numeric(12, 4) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  unit text NOT NULL CHECK (unit IN ('kwh', 'minute', 'session')),
  tax_included boolean,
  membership_required boolean,
  restriction_text text,
  step_size numeric(12, 4) CHECK (step_size > 0),
  source_observed_at timestamptz,
  freshness text NOT NULL CHECK (
    freshness IN ('live', 'verified', 'recent', 'stale', 'unknown')
  ),
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS air_services (
  service_point_id uuid PRIMARY KEY REFERENCES service_points(id) ON DELETE CASCADE,
  working_status text NOT NULL DEFAULT 'unknown' CHECK (
    working_status IN ('working', 'broken', 'temporarily_unavailable', 'unknown')
  ),
  free boolean,
  price_amount numeric(12, 4) CHECK (price_amount >= 0),
  access text CHECK (access IN ('public', 'customers_only', 'unknown')),
  last_verified_at timestamptz,
  location_hint text,
  source_labels text[] NOT NULL CHECK (cardinality(source_labels) > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (working_status = 'unknown' OR last_verified_at IS NOT NULL),
  CHECK (free IS DISTINCT FROM true OR price_amount IS NULL OR price_amount = 0),
  CHECK (free IS DISTINCT FROM false OR price_amount IS NULL OR price_amount > 0)
);

CREATE TABLE IF NOT EXISTS wash_services (
  service_point_id uuid PRIMARY KEY REFERENCES service_points(id) ON DELETE CASCADE,
  working_status text NOT NULL DEFAULT 'unknown' CHECK (
    working_status IN ('working', 'closed', 'temporarily_unavailable', 'unknown')
  ),
  starting_price_amount numeric(12, 4) CHECK (starting_price_amount >= 0),
  vacuum_available boolean,
  interior_cleaning boolean,
  last_verified_at timestamptz,
  source_labels text[] NOT NULL CHECK (cardinality(source_labels) > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (working_status = 'unknown' OR last_verified_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS wash_service_types (
  service_point_id uuid NOT NULL REFERENCES wash_services(service_point_id) ON DELETE CASCADE,
  wash_type text NOT NULL CHECK (
    wash_type IN (
      'automatic_rollers', 'automatic_touchless',
      'high_pressure_self_service', 'hand_wash', 'interior_cleaning',
      'vacuum', 'unknown'
    )
  ),
  PRIMARY KEY (service_point_id, wash_type)
);

CREATE TABLE IF NOT EXISTS wash_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_point_id uuid NOT NULL REFERENCES wash_services(service_point_id) ON DELETE CASCADE,
  source_program_id text,
  name text NOT NULL CHECK (btrim(name) <> ''),
  wash_type text NOT NULL CHECK (
    wash_type IN (
      'automatic_rollers', 'automatic_touchless',
      'high_pressure_self_service', 'hand_wash', 'interior_cleaning',
      'vacuum'
    )
  ),
  price_amount numeric(12, 4) CHECK (price_amount >= 0),
  duration_minutes integer CHECK (duration_minutes > 0),
  features text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (updated_at >= created_at)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL REFERENCES data_sources(id),
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (completed_at IS NULL OR completed_at >= started_at),
  CHECK (
    (status = 'running' AND completed_at IS NULL) OR
    (status IN ('succeeded', 'failed') AND completed_at IS NOT NULL)
  )
);

INSERT INTO schema_migrations (version)
VALUES ('0001_initial')
ON CONFLICT (version) DO NOTHING;

COMMIT;

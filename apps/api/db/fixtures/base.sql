-- Fuel Now deterministic integration fixture.
-- All names and records are synthetic and reserved under the __fixture__ prefix.

INSERT INTO data_sources (
  id,
  name,
  source_url,
  licence_name,
  licence_url,
  attribution_text,
  enabled,
  created_at,
  updated_at
)
VALUES
  ('__fixture__fr_fuel', 'Synthetic France Fuel', 'https://example.invalid/fixture/fr-fuel', 'Fixture only', 'https://example.invalid/fixture-licence', 'Synthetic test data', true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'),
  ('__fixture__es_fuel', 'Synthetic Spain Fuel', 'https://example.invalid/fixture/es-fuel', 'Fixture only', 'https://example.invalid/fixture-licence', 'Synthetic test data', true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'),
  ('__fixture__fr_charge', 'Synthetic France Charging', 'https://example.invalid/fixture/fr-charge', 'Fixture only', 'https://example.invalid/fixture-licence', 'Synthetic test data', true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'),
  ('__fixture__es_charge', 'Synthetic Spain Charging', 'https://example.invalid/fixture/es-charge', 'Fixture only', 'https://example.invalid/fixture-licence', 'Synthetic test data', true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'),
  ('__fixture__osm', 'Synthetic OSM Supplement', 'https://example.invalid/fixture/osm', 'Fixture only', 'https://example.invalid/fixture-licence', 'Synthetic test data', true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO source_cache_scopes (source_id, country, service_type, created_at)
VALUES
  ('__fixture__fr_fuel', 'FR', 'fuel', '2026-01-15T12:00:00Z'),
  ('__fixture__fr_fuel', 'FR', 'air', '2026-01-15T12:00:00Z'),
  ('__fixture__fr_fuel', 'FR', 'wash', '2026-01-15T12:00:00Z'),
  ('__fixture__es_fuel', 'ES', 'fuel', '2026-01-15T12:00:00Z'),
  ('__fixture__fr_charge', 'FR', 'charging', '2026-01-15T12:00:00Z'),
  ('__fixture__es_charge', 'ES', 'charging', '2026-01-15T12:00:00Z'),
  ('__fixture__osm', 'FR', 'air', '2026-01-15T12:00:00Z'),
  ('__fixture__osm', 'FR', 'wash', '2026-01-15T12:00:00Z'),
  ('__fixture__osm', 'ES', 'air', '2026-01-15T12:00:00Z'),
  ('__fixture__osm', 'ES', 'wash', '2026-01-15T12:00:00Z')
ON CONFLICT (source_id, country, service_type) DO NOTHING;

INSERT INTO service_points (
  id,
  country,
  name,
  brand,
  location,
  address_street,
  address_house_number,
  address_postal_code,
  address_locality,
  address_formatted,
  timezone,
  opening_status,
  opening_status_evaluated_at,
  temporary_closure,
  created_at,
  updated_at,
  lifecycle_status,
  lifecycle_changed_at,
  closure_reason
)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'FR', 'Fixture Toulouse Multi-service', 'Fixture', ST_SetSRID(ST_MakePoint(1.4442, 43.6047), 4326)::geography, 'Rue de Test', '1', '31000', 'Toulouse', '1 Rue de Test, 31000 Toulouse', 'Europe/Paris', 'open', '2026-01-15T12:00:00Z', false, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', 'active', '2026-01-15T12:00:00Z', NULL),
  ('00000000-0000-4000-8000-000000000102', 'FR', 'Fixture Toulouse Temporarily Closed', NULL, ST_SetSRID(ST_MakePoint(1.4542, 43.6147), 4326)::geography, 'Rue de Test', '2', '31000', 'Toulouse', '2 Rue de Test, 31000 Toulouse', 'Europe/Paris', 'closed', '2026-01-15T12:00:00Z', true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', 'temporarily_closed', '2026-01-15T12:00:00Z', 'Synthetic maintenance'),
  ('00000000-0000-4000-8000-000000000103', 'FR', 'Fixture Le Perthus Fuel', NULL, ST_SetSRID(ST_MakePoint(2.8620, 42.4600), 4326)::geography, NULL, NULL, '66480', 'Le Perthus', '66480 Le Perthus', 'Europe/Paris', 'unknown', NULL, NULL, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', 'active', '2026-01-15T12:00:00Z', NULL),
  ('00000000-0000-4000-8000-000000000201', 'ES', 'Fixture Barcelona Fuel and Wash', 'Fixture', ST_SetSRID(ST_MakePoint(2.1734, 41.3851), 4326)::geography, 'Calle de Prueba', '1', '08002', 'Barcelona', '1 Calle de Prueba, 08002 Barcelona', 'Europe/Madrid', 'open', '2026-01-15T12:00:00Z', false, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', 'active', '2026-01-15T12:00:00Z', NULL),
  ('00000000-0000-4000-8000-000000000202', 'ES', 'Fixture Barcelona Charging', NULL, ST_SetSRID(ST_MakePoint(2.1834, 41.3951), 4326)::geography, 'Calle de Prueba', '2', '08002', 'Barcelona', '2 Calle de Prueba, 08002 Barcelona', 'Europe/Madrid', 'unknown', NULL, NULL, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', 'active', '2026-01-15T12:00:00Z', NULL),
  ('00000000-0000-4000-8000-000000000203', 'ES', 'Fixture La Jonquera Fuel', NULL, ST_SetSRID(ST_MakePoint(2.8730, 42.4700), 4326)::geography, NULL, NULL, '17700', 'La Jonquera', '17700 La Jonquera', 'Europe/Madrid', 'unknown', NULL, NULL, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', 'active', '2026-01-15T12:00:00Z', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO service_point_services (service_point_id, service_type, created_at)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'fuel', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000101', 'air', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000101', 'wash', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000102', 'fuel', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000103', 'fuel', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000201', 'fuel', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000201', 'wash', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000202', 'charging', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000203', 'fuel', '2026-01-15T12:00:00Z')
ON CONFLICT (service_point_id, service_type) DO NOTHING;

INSERT INTO fuel_offers (
  service_point_id,
  fuel_type,
  source_fuel_id,
  source_label,
  available,
  out_of_stock,
  unavailable_reason,
  source_observed_at,
  updated_at
)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'diesel', 'fixture-diesel', 'Gazole', true, false, NULL, '2026-01-15T11:55:00Z', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000101', 'sp95_e10', 'fixture-e10', 'SP95-E10', true, false, NULL, '2026-01-15T11:55:00Z', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000102', 'diesel', 'fixture-diesel', 'Gazole', false, true, 'temporary_shortage', '2026-01-15T11:40:00Z', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000103', 'diesel', 'fixture-diesel', 'Gazole', true, false, NULL, '2026-01-15T10:00:00Z', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000201', 'diesel', 'fixture-diesel', 'Gasóleo A', true, false, NULL, '2026-01-15T11:50:00Z', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000201', 'sp95_e10', 'fixture-e10', 'Gasolina 95 E10', NULL, NULL, NULL, '2026-01-15T11:50:00Z', '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000203', 'diesel', 'fixture-diesel', 'Gasóleo A', true, false, NULL, '2026-01-14T12:00:00Z', '2026-01-15T12:00:00Z')
ON CONFLICT (service_point_id, fuel_type) DO NOTHING;

INSERT INTO fuel_prices (
  service_point_id,
  fuel_type,
  amount,
  currency,
  unit,
  tax_included,
  membership_required,
  source_observed_at,
  freshness,
  confidence,
  created_at
)
SELECT fixture.*
FROM (
  VALUES
    ('00000000-0000-4000-8000-000000000101'::uuid, 'diesel', 1.6590, 'EUR', 'liter', true, false, '2026-01-15T11:55:00Z'::timestamptz, 'recent', 'high', '2026-01-15T12:00:00Z'::timestamptz),
    ('00000000-0000-4000-8000-000000000101'::uuid, 'sp95_e10', 1.7190, 'EUR', 'liter', true, false, '2026-01-15T11:55:00Z'::timestamptz, 'recent', 'high', '2026-01-15T12:00:00Z'::timestamptz),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'diesel', 1.6990, 'EUR', 'liter', true, false, '2026-01-15T10:00:00Z'::timestamptz, 'stale', 'medium', '2026-01-15T12:00:00Z'::timestamptz),
    ('00000000-0000-4000-8000-000000000201'::uuid, 'diesel', 1.6190, 'EUR', 'liter', true, false, '2026-01-15T11:50:00Z'::timestamptz, 'recent', 'high', '2026-01-15T12:00:00Z'::timestamptz),
    ('00000000-0000-4000-8000-000000000201'::uuid, 'sp95_e10', 1.6890, 'EUR', 'liter', true, false, '2026-01-15T11:50:00Z'::timestamptz, 'recent', 'high', '2026-01-15T12:00:00Z'::timestamptz),
    ('00000000-0000-4000-8000-000000000203'::uuid, 'diesel', 1.5790, 'EUR', 'liter', true, false, '2026-01-14T12:00:00Z'::timestamptz, 'stale', 'medium', '2026-01-15T12:00:00Z'::timestamptz)
) AS fixture(
  service_point_id,
  fuel_type,
  amount,
  currency,
  unit,
  tax_included,
  membership_required,
  source_observed_at,
  freshness,
  confidence,
  created_at
)
WHERE NOT EXISTS (
  SELECT 1
  FROM fuel_prices AS existing
  WHERE existing.service_point_id = fixture.service_point_id
    AND existing.fuel_type = fixture.fuel_type
    AND existing.source_observed_at = fixture.source_observed_at
    AND existing.created_at = fixture.created_at
);

INSERT INTO charging_sites (
  service_point_id,
  operator_name,
  network_name,
  available_evses,
  known_status_evses,
  unknown_status_evses,
  total_evses,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000202',
  'Fixture Operator',
  'Fixture Network',
  1,
  2,
  0,
  2,
  '2026-01-15T12:00:00Z'
)
ON CONFLICT (service_point_id) DO NOTHING;

INSERT INTO charging_evses (
  id,
  service_point_id,
  source_evse_id,
  status,
  operational,
  source_observed_at,
  created_at,
  updated_at
)
VALUES
  ('10000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000202', 'fixture-evse-1', 'available', true, '2026-01-15T11:59:00Z', '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'),
  ('10000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000202', 'fixture-evse-2', 'occupied', true, '2026-01-15T11:59:00Z', '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO charging_connectors (
  id,
  evse_id,
  source_connector_id,
  connector_type,
  power_kw,
  operational,
  created_at,
  updated_at
)
VALUES
  ('20000000-0000-4000-8000-000000000201', '10000000-0000-4000-8000-000000000201', 'fixture-connector-1', 'ccs_combo_2', 150.000, true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'),
  ('20000000-0000-4000-8000-000000000202', '10000000-0000-4000-8000-000000000202', 'fixture-connector-2', 'type_2', 22.000, true, '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO air_services (
  service_point_id,
  working_status,
  free,
  price_amount,
  access,
  last_verified_at,
  location_hint,
  source_labels,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000101',
  'working',
  true,
  0,
  'public',
  '2026-01-15T11:30:00Z',
  'Beside the synthetic shop',
  ARRAY['Synthetic air fixture'],
  '2026-01-15T12:00:00Z'
)
ON CONFLICT (service_point_id) DO NOTHING;

INSERT INTO wash_services (
  service_point_id,
  working_status,
  starting_price_amount,
  vacuum_available,
  interior_cleaning,
  last_verified_at,
  source_labels,
  updated_at
)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'working', 6.0000, true, false, '2026-01-15T11:30:00Z', ARRAY['Synthetic wash fixture'], '2026-01-15T12:00:00Z'),
  ('00000000-0000-4000-8000-000000000201', 'unknown', NULL, NULL, NULL, NULL, ARRAY['Synthetic wash presence only'], '2026-01-15T12:00:00Z')
ON CONFLICT (service_point_id) DO NOTHING;

INSERT INTO wash_service_types (service_point_id, wash_type)
VALUES
  ('00000000-0000-4000-8000-000000000101', 'automatic_rollers'),
  ('00000000-0000-4000-8000-000000000101', 'vacuum')
ON CONFLICT (service_point_id, wash_type) DO NOTHING;

DO $$
BEGIN
PERFORM upsert_source_record(
  '__fixture__fr_fuel',
  'fixture-fr-101',
  '00000000-0000-4000-8000-000000000101',
  '{"fixture":true,"country":"FR","kind":"fuel"}',
  '2026-01-15T11:55:00Z',
  NULL,
  '2026-01-15T12:00:00Z'
);

PERFORM upsert_source_record(
  '__fixture__fr_fuel',
  'fixture-fr-102',
  '00000000-0000-4000-8000-000000000102',
  '{"fixture":true,"country":"FR","kind":"fuel","closed":true}',
  '2026-01-15T11:40:00Z',
  NULL,
  '2026-01-15T12:00:00Z'
);

PERFORM upsert_source_record(
  '__fixture__fr_fuel',
  'fixture-fr-103',
  '00000000-0000-4000-8000-000000000103',
  '{"fixture":true,"country":"FR","kind":"fuel","border":true}',
  '2026-01-15T10:00:00Z',
  NULL,
  '2026-01-15T12:00:00Z'
);

PERFORM upsert_source_record(
  '__fixture__es_fuel',
  'fixture-es-201',
  '00000000-0000-4000-8000-000000000201',
  '{"fixture":true,"country":"ES","kind":"fuel"}',
  NULL,
  '2026-01-15T11:50:00Z',
  '2026-01-15T12:00:00Z'
);

PERFORM upsert_source_record(
  '__fixture__es_charge',
  'fixture-es-202',
  '00000000-0000-4000-8000-000000000202',
  '{"fixture":true,"country":"ES","kind":"charging"}',
  '2026-01-15T11:59:00Z',
  NULL,
  '2026-01-15T12:00:00Z'
);

PERFORM upsert_source_record(
  '__fixture__es_fuel',
  'fixture-es-203',
  '00000000-0000-4000-8000-000000000203',
  '{"fixture":true,"country":"ES","kind":"fuel","border":true}',
  NULL,
  '2026-01-14T12:00:00Z',
  '2026-01-15T12:00:00Z'
);
END
$$;

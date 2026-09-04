\set ON_ERROR_STOP on

BEGIN;

DO $verification$
DECLARE
  all_count integer;
  ccs_count integer;
  power_count integer;
  combined_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM schema_migrations
    WHERE version = '0015_candidate_ev_filter'
  ) THEN
    RAISE EXCEPTION 'Migration 0015_candidate_ev_filter is not recorded';
  END IF;

  INSERT INTO service_points (id, country, name, location)
  VALUES
    ('00000000-0000-4000-8000-000000000921', 'FR', 'Fast CCS', ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography),
    ('00000000-0000-4000-8000-000000000922', 'FR', 'Split capabilities', ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography),
    ('00000000-0000-4000-8000-000000000923', 'FR', 'Non-operational connector', ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography),
    ('00000000-0000-4000-8000-000000000924', 'FR', 'Unknown high power connector', ST_SetSRID(ST_MakePoint(1, 43), 4326)::geography);

  INSERT INTO service_point_services (service_point_id, service_type)
  SELECT id, 'charging'
  FROM service_points
  WHERE id BETWEEN
    '00000000-0000-4000-8000-000000000921' AND
    '00000000-0000-4000-8000-000000000924';

  INSERT INTO charging_sites (service_point_id, total_evses)
  SELECT id, 1
  FROM service_points
  WHERE id BETWEEN
    '00000000-0000-4000-8000-000000000921' AND
    '00000000-0000-4000-8000-000000000924';

  INSERT INTO charging_evses (id, service_point_id)
  VALUES
    ('10000000-0000-4000-8000-000000000921', '00000000-0000-4000-8000-000000000921'),
    ('10000000-0000-4000-8000-000000000922', '00000000-0000-4000-8000-000000000922'),
    ('10000000-0000-4000-8000-000000000923', '00000000-0000-4000-8000-000000000923'),
    ('10000000-0000-4000-8000-000000000924', '00000000-0000-4000-8000-000000000924');

  INSERT INTO charging_connectors (
    evse_id,
    connector_type,
    power_kw,
    operational
  )
  VALUES
    ('10000000-0000-4000-8000-000000000921', 'ccs_combo_2', 150, true),
    ('10000000-0000-4000-8000-000000000922', 'ccs_combo_2', 50, true),
    ('10000000-0000-4000-8000-000000000922', 'type_2', 350, true),
    ('10000000-0000-4000-8000-000000000923', 'chademo', 200, false),
    ('10000000-0000-4000-8000-000000000924', 'unknown', 200, true);

  SELECT count(*) INTO all_count
  FROM search_service_point_candidates(
    1, 43, 1000, 'charging', 50, 'FR', NULL, NULL, NULL
  );

  SELECT count(*) INTO ccs_count
  FROM search_service_point_candidates(
    1, 43, 1000, 'charging', 50, 'FR', NULL, 'ccs_combo_2', NULL
  );

  SELECT count(*) INTO power_count
  FROM search_service_point_candidates(
    1, 43, 1000, 'charging', 50, 'FR', NULL, NULL, 100
  );

  SELECT count(*) INTO combined_count
  FROM search_service_point_candidates(
    1, 43, 1000, 'charging', 50, 'FR', NULL, 'ccs_combo_2', 100
  );

  IF all_count <> 4 OR ccs_count <> 2 OR power_count <> 3 OR combined_count <> 1 THEN
    RAISE EXCEPTION 'EV connector filters returned incorrect candidate counts';
  END IF;

  BEGIN
    PERFORM search_service_point_candidates(
      1, 43, 1000, 'fuel', 50, 'FR', NULL, 'ccs_combo_2', 50
    );
    RAISE EXCEPTION 'EV connector filters were accepted for a non-Charge service';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'EV connector filters were accepted for a non-Charge service' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM search_service_point_candidates(
      1, 43, 1000, 'charging', 50, 'FR', NULL, 'unknown', NULL
    );
    RAISE EXCEPTION 'Unknown connector was accepted as a selectable filter';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'Unknown connector was accepted as a selectable filter' THEN
        RAISE;
      END IF;
  END;
END
$verification$;

ROLLBACK;

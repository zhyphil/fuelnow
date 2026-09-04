\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  verification_source_record_id bigint;
  verification_service_point_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0005_service_point_merge'
  ) THEN
    RAISE EXCEPTION 'Migration 0005_service_point_merge is not recorded';
  END IF;

  INSERT INTO data_sources (
    id,
    name,
    source_url,
    licence_name,
    licence_url,
    attribution_text,
    enabled
  )
  VALUES (
    '__service_point_merge_verification__',
    'Service-point merge verification',
    'https://example.invalid/source',
    'Verification only',
    'https://example.invalid/licence',
    'Transactional verification record',
    false
  );

  INSERT INTO service_points (country, location)
  VALUES (
    'FR',
    ST_SetSRID(ST_MakePoint(1.4442, 43.6047), 4326)::geography
  )
  RETURNING id INTO verification_service_point_id;

  SELECT id INTO verification_source_record_id
  FROM upsert_source_record(
    '__service_point_merge_verification__',
    'station-42',
    verification_service_point_id,
    '{"id": "station-42"}'::jsonb,
    NULL,
    NULL,
    '2026-09-04T00:00:00Z'
  );

  INSERT INTO service_point_match_decisions (
    source_record_id,
    outcome,
    target_service_point_id,
    candidate_service_point_ids,
    score,
    reason_codes,
    rule_version
  )
  VALUES (
    verification_source_record_id,
    'matched',
    verification_service_point_id,
    ARRAY[verification_service_point_id],
    85,
    ARRAY['address_exact', 'nearby_25m'],
    'v1'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM service_point_match_decisions AS decision
    JOIN source_records AS source_record
      ON source_record.id = decision.source_record_id
    WHERE decision.source_record_id = verification_source_record_id
      AND decision.target_service_point_id = verification_service_point_id
      AND source_record.service_point_id = verification_service_point_id
  ) THEN
    RAISE EXCEPTION 'Match decision and source link are not aligned';
  END IF;

  BEGIN
    UPDATE service_point_match_decisions
    SET target_service_point_id = NULL
    WHERE source_record_id = verification_source_record_id;
    RAISE EXCEPTION 'Invalid matched decision unexpectedly succeeded';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END
$$;

ROLLBACK;

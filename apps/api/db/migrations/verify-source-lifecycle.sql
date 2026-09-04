\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  verification_record source_records;
  verification_service_point_id uuid;
  changed_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE version = '0006_source_lifecycle'
  ) THEN
    RAISE EXCEPTION 'Migration 0006_source_lifecycle is not recorded';
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
    '__source_lifecycle_verification__',
    'Source lifecycle verification',
    'https://example.invalid/source',
    'Verification only',
    'https://example.invalid/licence',
    'Transactional verification record',
    true
  );

  INSERT INTO service_points (country, location)
  VALUES (
    'FR',
    ST_SetSRID(ST_MakePoint(1.4442, 43.6047), 4326)::geography
  )
  RETURNING id INTO verification_service_point_id;

  INSERT INTO fuel_offers (
    service_point_id,
    fuel_type,
    source_fuel_id,
    source_label,
    available,
    out_of_stock,
    unavailable_reason
  )
  VALUES (
    verification_service_point_id,
    'diesel',
    'Gazole',
    'Gazole',
    NULL,
    NULL,
    NULL
  );

  SELECT * INTO verification_record
  FROM upsert_source_record(
    '__source_lifecycle_verification__',
    'station-42',
    verification_service_point_id,
    '{"id": "station-42"}'::jsonb,
    NULL,
    NULL,
    '2026-09-04T00:00:00Z'
  );

  SELECT mark_source_records_missing(
    '__source_lifecycle_verification__',
    '2026-09-04T00:10:00Z',
    '2026-09-04T00:15:00Z',
    'omitted_from_complete_snapshot'
  ) INTO changed_count;

  IF changed_count <> 1 OR NOT EXISTS (
    SELECT 1 FROM source_records
    WHERE id = verification_record.id
      AND lifecycle_status = 'missing'
      AND missing_since = '2026-09-04T00:15:00Z'
  ) THEN
    RAISE EXCEPTION 'Complete-snapshot omission was not recorded as missing';
  END IF;

  SELECT * INTO verification_record
  FROM upsert_source_record(
    '__source_lifecycle_verification__',
    'station-42',
    verification_service_point_id,
    '{"id": "station-42", "seen_again": true}'::jsonb,
    NULL,
    NULL,
    '2026-09-04T00:20:00Z'
  );

  IF verification_record.lifecycle_status <> 'active' OR
    verification_record.missing_since IS NOT NULL
  THEN
    RAISE EXCEPTION 'Newer seen evidence did not reactivate the source record';
  END IF;

  IF NOT mark_source_record_deleted(
    '__source_lifecycle_verification__',
    'station-42',
    '2026-09-04T00:30:00Z',
    'explicit_source_deletion'
  ) THEN
    RAISE EXCEPTION 'Explicit source deletion did not change the record';
  END IF;

  UPDATE service_points
  SET
    lifecycle_status = 'temporarily_closed',
    lifecycle_changed_at = '2026-09-04T00:35:00Z',
    closure_reason = 'source_temporary_closure',
    temporary_closure = true,
    opening_status = 'closed',
    opening_status_evaluated_at = '2026-09-04T00:35:00Z'
  WHERE id = verification_service_point_id;

  UPDATE fuel_offers
  SET
    available = false,
    out_of_stock = true,
    unavailable_reason = 'temporary_shortage',
    source_observed_at = '2026-09-04T00:40:00Z',
    updated_at = '2026-09-04T00:40:00Z'
  WHERE service_point_id = verification_service_point_id
    AND fuel_type = 'diesel';

  SELECT withdraw_data_source(
    '__source_lifecycle_verification__',
    '2026-09-04T00:50:00Z',
    'licence_withdrawn'
  ) INTO changed_count;

  IF changed_count <> 1 OR NOT EXISTS (
    SELECT 1 FROM data_sources
    WHERE id = '__source_lifecycle_verification__'
      AND lifecycle_status = 'withdrawn'
      AND enabled = false
  ) OR NOT EXISTS (
    SELECT 1 FROM source_records
    WHERE id = verification_record.id
      AND lifecycle_status = 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'Source withdrawal did not disable source records';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM service_point_lifecycle_events
    WHERE service_point_id = verification_service_point_id
      AND lifecycle_status = 'temporarily_closed'
  ) OR NOT EXISTS (
    SELECT 1 FROM fuel_offer_availability_events
    WHERE service_point_id = verification_service_point_id
      AND fuel_type = 'diesel'
      AND out_of_stock = true
      AND unavailable_reason = 'temporary_shortage'
  ) THEN
    RAISE EXCEPTION 'Closure or Fuel availability event history is missing';
  END IF;

  BEGIN
    PERFORM upsert_source_record(
      '__source_lifecycle_verification__',
      'station-42',
      verification_service_point_id,
      '{"id": "station-42", "invalid_revival": true}'::jsonb,
      NULL,
      NULL,
      '2026-09-04T01:00:00Z'
    );
    RAISE EXCEPTION 'Withdrawn source unexpectedly accepted active data';
  EXCEPTION
    WHEN object_not_in_prerequisite_state THEN NULL;
  END;

  BEGIN
    DELETE FROM source_records WHERE id = verification_record.id;
    RAISE EXCEPTION 'Lifecycle source record was hard deleted';
  EXCEPTION
    WHEN restrict_violation THEN NULL;
  END;
END
$$;

ROLLBACK;

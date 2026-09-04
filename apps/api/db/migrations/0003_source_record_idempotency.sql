\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE source_records
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE source_records
  ADD CONSTRAINT source_records_updated_after_created
  CHECK (updated_at >= created_at);

CREATE UNIQUE INDEX source_records_source_identity_uidx
  ON source_records (source_id, source_record_id);

CREATE OR REPLACE FUNCTION upsert_source_record(
  p_source_id text,
  p_source_record_id text,
  p_service_point_id uuid,
  p_raw_payload jsonb,
  p_source_observed_at timestamptz,
  p_source_published_at timestamptz,
  p_fetched_at timestamptz
)
RETURNS source_records
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  WITH upserted AS (
    INSERT INTO source_records (
      source_id,
      source_record_id,
      service_point_id,
      raw_payload,
      source_observed_at,
      source_published_at,
      fetched_at
    )
    VALUES (
      p_source_id,
      p_source_record_id,
      p_service_point_id,
      p_raw_payload,
      p_source_observed_at,
      p_source_published_at,
      p_fetched_at
    )
    ON CONFLICT (source_id, source_record_id) DO UPDATE
    SET
      service_point_id = COALESCE(
        EXCLUDED.service_point_id,
        source_records.service_point_id
      ),
      raw_payload = EXCLUDED.raw_payload,
      source_observed_at = EXCLUDED.source_observed_at,
      source_published_at = EXCLUDED.source_published_at,
      fetched_at = EXCLUDED.fetched_at,
      updated_at = now()
    WHERE
      EXCLUDED.fetched_at > source_records.fetched_at OR
      (
        EXCLUDED.fetched_at = source_records.fetched_at AND
        (
          EXCLUDED.service_point_id IS DISTINCT FROM source_records.service_point_id OR
          EXCLUDED.raw_payload IS DISTINCT FROM source_records.raw_payload OR
          EXCLUDED.source_observed_at IS DISTINCT FROM source_records.source_observed_at OR
          EXCLUDED.source_published_at IS DISTINCT FROM source_records.source_published_at
        )
      )
    RETURNING source_records.*
  )
  SELECT * FROM upserted
  UNION ALL
  SELECT existing.*
  FROM source_records AS existing
  WHERE existing.source_id = p_source_id
    AND existing.source_record_id = p_source_record_id
    AND NOT EXISTS (SELECT 1 FROM upserted)
  LIMIT 1
$function$;

INSERT INTO schema_migrations (version)
VALUES ('0003_source_record_idempotency')
ON CONFLICT (version) DO NOTHING;

COMMIT;

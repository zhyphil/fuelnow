\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE data_sources
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN withdrawn_at timestamptz,
  ADD COLUMN withdrawal_reason text,
  ADD CONSTRAINT data_sources_lifecycle_status_check CHECK (
    lifecycle_status IN ('active', 'paused', 'withdrawn')
  ),
  ADD CONSTRAINT data_sources_withdrawal_check CHECK (
    (
      lifecycle_status = 'withdrawn' AND
      withdrawn_at IS NOT NULL AND
      withdrawal_reason IS NOT NULL AND
      btrim(withdrawal_reason) <> ''
    ) OR
    (
      lifecycle_status <> 'withdrawn' AND
      withdrawn_at IS NULL AND
      withdrawal_reason IS NULL
    )
  );

ALTER TABLE source_records
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN status_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_seen_at timestamptz,
  ADD COLUMN missing_since timestamptz,
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN withdrawn_at timestamptz,
  ADD COLUMN lifecycle_reason text;

UPDATE source_records
SET
  last_seen_at = fetched_at,
  status_changed_at = fetched_at;

ALTER TABLE source_records
  ALTER COLUMN last_seen_at SET NOT NULL,
  ADD CONSTRAINT source_records_lifecycle_status_check CHECK (
    lifecycle_status IN ('active', 'missing', 'deleted', 'withdrawn')
  ),
  ADD CONSTRAINT source_records_lifecycle_shape_check CHECK (
    (
      lifecycle_status = 'active' AND
      missing_since IS NULL AND deleted_at IS NULL AND withdrawn_at IS NULL AND
      lifecycle_reason IS NULL
    ) OR
    (
      lifecycle_status = 'missing' AND
      missing_since IS NOT NULL AND deleted_at IS NULL AND withdrawn_at IS NULL AND
      lifecycle_reason IS NOT NULL AND
      btrim(lifecycle_reason) <> ''
    ) OR
    (
      lifecycle_status = 'deleted' AND
      missing_since IS NULL AND deleted_at IS NOT NULL AND withdrawn_at IS NULL AND
      lifecycle_reason IS NOT NULL AND
      btrim(lifecycle_reason) <> ''
    ) OR
    (
      lifecycle_status = 'withdrawn' AND
      missing_since IS NULL AND deleted_at IS NULL AND withdrawn_at IS NOT NULL AND
      lifecycle_reason IS NOT NULL AND
      btrim(lifecycle_reason) <> ''
    )
  );

ALTER TABLE service_points
  ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'active',
  ADD COLUMN lifecycle_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN closure_reason text,
  ADD CONSTRAINT service_points_lifecycle_status_check CHECK (
    lifecycle_status IN (
      'active', 'temporarily_closed', 'permanently_closed', 'unverified'
    )
  ),
  ADD CONSTRAINT service_points_closure_reason_check CHECK (
    (lifecycle_status = 'active' AND closure_reason IS NULL) OR
    (
      lifecycle_status <> 'active' AND
      closure_reason IS NOT NULL AND
      btrim(closure_reason) <> ''
    )
  );

CREATE TABLE source_record_lifecycle_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_record_id bigint NOT NULL REFERENCES source_records(id) ON DELETE RESTRICT,
  lifecycle_status text NOT NULL CHECK (
    lifecycle_status IN ('active', 'missing', 'deleted', 'withdrawn')
  ),
  effective_at timestamptz NOT NULL,
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX source_record_lifecycle_events_record_time_idx
  ON source_record_lifecycle_events (source_record_id, effective_at DESC);

CREATE TABLE service_point_lifecycle_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_point_id uuid NOT NULL REFERENCES service_points(id) ON DELETE RESTRICT,
  lifecycle_status text NOT NULL CHECK (
    lifecycle_status IN (
      'active', 'temporarily_closed', 'permanently_closed', 'unverified'
    )
  ),
  effective_at timestamptz NOT NULL,
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_point_lifecycle_events_point_time_idx
  ON service_point_lifecycle_events (service_point_id, effective_at DESC);

CREATE TABLE fuel_offer_availability_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  service_point_id uuid NOT NULL,
  fuel_type text NOT NULL,
  available boolean,
  out_of_stock boolean,
  unavailable_reason text CHECK (
    unavailable_reason IS NULL OR
    unavailable_reason IN (
      'temporary_shortage', 'permanent_non_offering', 'unknown'
    )
  ),
  effective_at timestamptz NOT NULL,
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (service_point_id, fuel_type)
    REFERENCES fuel_offers(service_point_id, fuel_type) ON DELETE RESTRICT
);

CREATE INDEX fuel_offer_availability_events_offer_time_idx
  ON fuel_offer_availability_events (
    service_point_id,
    fuel_type,
    effective_at DESC
  );

INSERT INTO source_record_lifecycle_events (
  source_record_id,
  lifecycle_status,
  effective_at,
  reason
)
SELECT id, lifecycle_status, status_changed_at, 'migration_baseline'
FROM source_records;

INSERT INTO service_point_lifecycle_events (
  service_point_id,
  lifecycle_status,
  effective_at,
  reason
)
SELECT id, lifecycle_status, lifecycle_changed_at, 'migration_baseline'
FROM service_points;

INSERT INTO fuel_offer_availability_events (
  service_point_id,
  fuel_type,
  available,
  out_of_stock,
  unavailable_reason,
  effective_at,
  reason
)
SELECT
  service_point_id,
  fuel_type,
  available,
  out_of_stock,
  unavailable_reason,
  COALESCE(source_observed_at, updated_at),
  'migration_baseline'
FROM fuel_offers;

CREATE OR REPLACE FUNCTION log_source_record_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    INSERT INTO source_record_lifecycle_events (
      source_record_id,
      lifecycle_status,
      effective_at,
      reason
    )
    VALUES (
      NEW.id,
      NEW.lifecycle_status,
      NEW.status_changed_at,
      COALESCE(NEW.lifecycle_reason, 'seen')
    );
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER source_records_lifecycle_event
AFTER INSERT OR UPDATE OF lifecycle_status ON source_records
FOR EACH ROW EXECUTE FUNCTION log_source_record_lifecycle_event();

CREATE OR REPLACE FUNCTION guard_withdrawn_source_record_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.lifecycle_status <> 'withdrawn' AND EXISTS (
    SELECT 1
    FROM data_sources
    WHERE id = NEW.source_id AND lifecycle_status = 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'Cannot write active data for withdrawn source %', NEW.source_id
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER source_records_withdrawn_source_guard
BEFORE INSERT OR UPDATE ON source_records
FOR EACH ROW EXECUTE FUNCTION guard_withdrawn_source_record_write();

CREATE OR REPLACE FUNCTION log_service_point_lifecycle_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    INSERT INTO service_point_lifecycle_events (
      service_point_id,
      lifecycle_status,
      effective_at,
      reason
    )
    VALUES (
      NEW.id,
      NEW.lifecycle_status,
      NEW.lifecycle_changed_at,
      COALESCE(NEW.closure_reason, 'created')
    );
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER service_points_lifecycle_event
AFTER INSERT OR UPDATE OF lifecycle_status ON service_points
FOR EACH ROW EXECUTE FUNCTION log_service_point_lifecycle_event();

CREATE OR REPLACE FUNCTION log_fuel_offer_availability_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR
    ROW(NEW.available, NEW.out_of_stock, NEW.unavailable_reason) IS DISTINCT FROM
    ROW(OLD.available, OLD.out_of_stock, OLD.unavailable_reason)
  THEN
    INSERT INTO fuel_offer_availability_events (
      service_point_id,
      fuel_type,
      available,
      out_of_stock,
      unavailable_reason,
      effective_at,
      reason
    )
    VALUES (
      NEW.service_point_id,
      NEW.fuel_type,
      NEW.available,
      NEW.out_of_stock,
      NEW.unavailable_reason,
      COALESCE(NEW.source_observed_at, NEW.updated_at),
      'source_state'
    );
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER fuel_offers_availability_event
AFTER INSERT OR UPDATE OF available, out_of_stock, unavailable_reason ON fuel_offers
FOR EACH ROW EXECUTE FUNCTION log_fuel_offer_availability_event();

CREATE OR REPLACE FUNCTION mark_source_records_missing(
  p_source_id text,
  p_snapshot_started_at timestamptz,
  p_effective_at timestamptz,
  p_reason text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  changed_count integer;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Missing-record reason must not be blank';
  END IF;

  UPDATE source_records
  SET
    lifecycle_status = 'missing',
    status_changed_at = p_effective_at,
    missing_since = p_effective_at,
    deleted_at = NULL,
    withdrawn_at = NULL,
    lifecycle_reason = p_reason,
    updated_at = now()
  WHERE source_id = p_source_id
    AND lifecycle_status = 'active'
    AND last_seen_at < p_snapshot_started_at
    AND p_effective_at >= status_changed_at;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count;
END
$function$;

CREATE OR REPLACE FUNCTION mark_source_record_deleted(
  p_source_id text,
  p_source_record_id text,
  p_effective_at timestamptz,
  p_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  changed_count integer;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Deletion reason must not be blank';
  END IF;

  UPDATE source_records
  SET
    lifecycle_status = 'deleted',
    status_changed_at = p_effective_at,
    missing_since = NULL,
    deleted_at = p_effective_at,
    withdrawn_at = NULL,
    lifecycle_reason = p_reason,
    updated_at = now()
  WHERE source_id = p_source_id
    AND source_record_id = p_source_record_id
    AND p_effective_at >= status_changed_at;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count = 1;
END
$function$;

CREATE OR REPLACE FUNCTION withdraw_data_source(
  p_source_id text,
  p_effective_at timestamptz,
  p_reason text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  changed_count integer;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Withdrawal reason must not be blank';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM source_records
    WHERE source_id = p_source_id
      AND status_changed_at > p_effective_at
  ) THEN
    RAISE EXCEPTION 'Withdrawal time predates source record state';
  END IF;

  UPDATE source_records
  SET
    lifecycle_status = 'withdrawn',
    status_changed_at = p_effective_at,
    missing_since = NULL,
    deleted_at = NULL,
    withdrawn_at = p_effective_at,
    lifecycle_reason = p_reason,
    updated_at = now()
  WHERE source_id = p_source_id
    AND lifecycle_status <> 'withdrawn'
    AND p_effective_at >= status_changed_at;

  GET DIAGNOSTICS changed_count = ROW_COUNT;

  UPDATE data_sources
  SET
    enabled = false,
    lifecycle_status = 'withdrawn',
    withdrawn_at = p_effective_at,
    withdrawal_reason = p_reason,
    updated_at = now()
  WHERE id = p_source_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown data source %', p_source_id;
  END IF;

  RETURN changed_count;
END
$function$;

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
      fetched_at,
      last_seen_at,
      status_changed_at
    )
    VALUES (
      p_source_id,
      p_source_record_id,
      p_service_point_id,
      p_raw_payload,
      p_source_observed_at,
      p_source_published_at,
      p_fetched_at,
      p_fetched_at,
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
      last_seen_at = EXCLUDED.fetched_at,
      lifecycle_status = 'active',
      status_changed_at = EXCLUDED.fetched_at,
      missing_since = NULL,
      deleted_at = NULL,
      withdrawn_at = NULL,
      lifecycle_reason = NULL,
      updated_at = now()
    WHERE
      EXCLUDED.fetched_at > source_records.fetched_at OR
      (
        EXCLUDED.fetched_at = source_records.fetched_at AND
        (
          EXCLUDED.service_point_id IS DISTINCT FROM source_records.service_point_id OR
          EXCLUDED.raw_payload IS DISTINCT FROM source_records.raw_payload OR
          EXCLUDED.source_observed_at IS DISTINCT FROM source_records.source_observed_at OR
          EXCLUDED.source_published_at IS DISTINCT FROM source_records.source_published_at OR
          source_records.lifecycle_status <> 'active'
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
VALUES ('0006_source_lifecycle')
ON CONFLICT (version) DO NOTHING;

COMMIT;

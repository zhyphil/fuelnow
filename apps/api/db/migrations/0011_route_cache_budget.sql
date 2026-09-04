\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE route_cache_entries (
  cache_key_hash text PRIMARY KEY CHECK (
    cache_key_hash ~ '^[0-9a-f]{64}$'
  ),
  provider text NOT NULL CHECK (
    btrim(provider) <> '' AND length(provider) <= 50
  ),
  profile text NOT NULL CHECK (
    profile IN ('driving', 'driving-traffic')
  ),
  destination_id uuid NOT NULL REFERENCES service_points(id) ON DELETE CASCADE,
  road_distance_m double precision NOT NULL CHECK (
    road_distance_m >= 0 AND road_distance_m <= 10000000
  ),
  eta_seconds integer NOT NULL CHECK (
    eta_seconds >= 0 AND eta_seconds <= 604800
  ),
  calculated_at timestamptz NOT NULL,
  traffic_aware boolean NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at),
  CHECK (expires_at <= created_at + interval '15 minutes')
);

CREATE INDEX route_cache_entries_expiry_idx
  ON route_cache_entries (expires_at);

CREATE TABLE route_usage_monthly (
  provider text NOT NULL CHECK (
    btrim(provider) <> '' AND length(provider) <= 50
  ),
  billing_month date NOT NULL CHECK (
    billing_month = date_trunc('month', billing_month)::date
  ),
  reserved_elements bigint NOT NULL DEFAULT 0 CHECK (reserved_elements >= 0),
  successful_elements bigint NOT NULL DEFAULT 0 CHECK (successful_elements >= 0),
  failed_elements bigint NOT NULL DEFAULT 0 CHECK (failed_elements >= 0),
  request_count bigint NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (provider, billing_month),
  CHECK (successful_elements + failed_elements <= reserved_elements)
);

CREATE TABLE route_usage_reservations (
  id uuid PRIMARY KEY,
  provider text NOT NULL CHECK (
    btrim(provider) <> '' AND length(provider) <= 50
  ),
  billing_month date NOT NULL CHECK (
    billing_month = date_trunc('month', billing_month)::date
  ),
  reserved_elements integer NOT NULL CHECK (reserved_elements BETWEEN 1 AND 24),
  successful_elements integer CHECK (
    successful_elements BETWEEN 0 AND reserved_elements
  ),
  status text NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved', 'completed')
  ),
  reserved_at timestamptz NOT NULL,
  completed_at timestamptz,
  CHECK (
    (status = 'reserved' AND successful_elements IS NULL AND completed_at IS NULL) OR
    (status = 'completed' AND successful_elements IS NOT NULL AND completed_at IS NOT NULL)
  ),
  FOREIGN KEY (provider, billing_month)
    REFERENCES route_usage_monthly(provider, billing_month)
    ON DELETE RESTRICT
);

CREATE INDEX route_usage_reservations_status_idx
  ON route_usage_reservations (status, reserved_at);

CREATE OR REPLACE FUNCTION read_route_cache(
  p_cache_key_hashes text[],
  p_now timestamptz
)
RETURNS TABLE(
  cache_key_hash text,
  provider text,
  profile text,
  destination_id uuid,
  road_distance_m double precision,
  eta_seconds integer,
  calculated_at timestamptz,
  traffic_aware boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  SELECT
    entry.cache_key_hash,
    entry.provider,
    entry.profile,
    entry.destination_id,
    entry.road_distance_m,
    entry.eta_seconds,
    entry.calculated_at,
    entry.traffic_aware
  FROM route_cache_entries AS entry
  WHERE entry.cache_key_hash = ANY(p_cache_key_hashes)
    AND entry.expires_at > p_now
$function$;

CREATE OR REPLACE FUNCTION put_route_cache_entries(
  p_entries jsonb,
  p_created_at timestamptz,
  p_ttl_seconds integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  affected_count integer;
BEGIN
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) = 0 THEN
    RAISE EXCEPTION 'Route cache entries must be a non-empty array'
      USING ERRCODE = '22023';
  END IF;
  IF p_ttl_seconds NOT BETWEEN 1 AND 900 THEN
    RAISE EXCEPTION 'Route cache TTL must be between 1 and 900 seconds'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO route_cache_entries (
    cache_key_hash,
    provider,
    profile,
    destination_id,
    road_distance_m,
    eta_seconds,
    calculated_at,
    traffic_aware,
    created_at,
    expires_at
  )
  SELECT
    item.cache_key_hash,
    item.provider,
    item.profile,
    item.destination_id,
    item.road_distance_m,
    item.eta_seconds,
    item.calculated_at,
    item.traffic_aware,
    p_created_at,
    p_created_at + make_interval(secs => p_ttl_seconds)
  FROM jsonb_to_recordset(p_entries) AS item(
    cache_key_hash text,
    provider text,
    profile text,
    destination_id uuid,
    road_distance_m double precision,
    eta_seconds integer,
    calculated_at timestamptz,
    traffic_aware boolean
  )
  ON CONFLICT (cache_key_hash) DO UPDATE
  SET
    provider = EXCLUDED.provider,
    profile = EXCLUDED.profile,
    destination_id = EXCLUDED.destination_id,
    road_distance_m = EXCLUDED.road_distance_m,
    eta_seconds = EXCLUDED.eta_seconds,
    calculated_at = EXCLUDED.calculated_at,
    traffic_aware = EXCLUDED.traffic_aware,
    created_at = EXCLUDED.created_at,
    expires_at = EXCLUDED.expires_at;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END
$function$;

CREATE OR REPLACE FUNCTION reserve_route_elements(
  p_reservation_id uuid,
  p_provider text,
  p_billing_month date,
  p_requested_elements integer,
  p_monthly_budget bigint,
  p_reserved_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  reserved boolean;
BEGIN
  IF p_billing_month <> date_trunc('month', p_billing_month)::date THEN
    RAISE EXCEPTION 'Billing month must be the first day of a month'
      USING ERRCODE = '22023';
  END IF;
  IF p_requested_elements NOT BETWEEN 1 AND 24 THEN
    RAISE EXCEPTION 'Requested route elements must be between 1 and 24'
      USING ERRCODE = '22023';
  END IF;
  IF p_monthly_budget NOT BETWEEN 0 AND 1000000000 THEN
    RAISE EXCEPTION 'Monthly route budget must be between 0 and 1000000000'
      USING ERRCODE = '22023';
  END IF;
  IF p_requested_elements > p_monthly_budget THEN
    RETURN false;
  END IF;

  INSERT INTO route_usage_monthly (
    provider,
    billing_month,
    updated_at
  )
  VALUES (p_provider, p_billing_month, p_reserved_at)
  ON CONFLICT (provider, billing_month) DO NOTHING;

  UPDATE route_usage_monthly
  SET
    reserved_elements = reserved_elements + p_requested_elements,
    request_count = request_count + 1,
    updated_at = p_reserved_at
  WHERE provider = p_provider
    AND billing_month = p_billing_month
    AND reserved_elements + p_requested_elements <= p_monthly_budget
  RETURNING true INTO reserved;

  IF NOT COALESCE(reserved, false) THEN
    RETURN false;
  END IF;

  INSERT INTO route_usage_reservations (
    id,
    provider,
    billing_month,
    reserved_elements,
    reserved_at
  )
  VALUES (
    p_reservation_id,
    p_provider,
    p_billing_month,
    p_requested_elements,
    p_reserved_at
  );

  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION finalize_route_usage(
  p_reservation_id uuid,
  p_successful_elements integer,
  p_completed_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  reservation route_usage_reservations;
BEGIN
  SELECT * INTO reservation
  FROM route_usage_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown route usage reservation %', p_reservation_id
      USING ERRCODE = '55000';
  END IF;
  IF p_successful_elements NOT BETWEEN 0 AND reservation.reserved_elements THEN
    RAISE EXCEPTION 'Successful route elements exceed reservation'
      USING ERRCODE = '22023';
  END IF;
  IF reservation.status = 'completed' THEN
    RETURN false;
  END IF;

  UPDATE route_usage_reservations
  SET
    status = 'completed',
    successful_elements = p_successful_elements,
    completed_at = p_completed_at
  WHERE id = p_reservation_id;

  UPDATE route_usage_monthly
  SET
    successful_elements = successful_elements + p_successful_elements,
    failed_elements = failed_elements + (
      reservation.reserved_elements - p_successful_elements
    ),
    updated_at = p_completed_at
  WHERE provider = reservation.provider
    AND billing_month = reservation.billing_month;

  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION prune_route_cache(p_now timestamptz)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM route_cache_entries WHERE expires_at <= p_now;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END
$function$;

INSERT INTO schema_migrations (version)
VALUES ('0011_route_cache_budget')
ON CONFLICT (version) DO NOTHING;

COMMIT;

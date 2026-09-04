\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE source_cache_scopes (
  source_id text NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  country text NOT NULL CHECK (country IN ('FR', 'ES')),
  service_type text NOT NULL CHECK (
    service_type IN ('fuel', 'charging', 'air', 'wash')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, country, service_type)
);

CREATE TABLE query_cache_generations (
  country text NOT NULL CHECK (country IN ('FR', 'ES')),
  service_type text NOT NULL CHECK (
    service_type IN ('fuel', 'charging', 'air', 'wash')
  ),
  generation bigint NOT NULL DEFAULT 1 CHECK (generation > 0),
  invalidated_at timestamptz NOT NULL,
  PRIMARY KEY (country, service_type)
);

CREATE TABLE query_cache_entries (
  namespace text NOT NULL CHECK (
    btrim(namespace) <> '' AND length(namespace) <= 100
  ),
  cache_key_hash text NOT NULL CHECK (
    cache_key_hash ~ '^[0-9a-f]{64}$'
  ),
  country text NOT NULL CHECK (country IN ('FR', 'ES')),
  service_type text NOT NULL CHECK (
    service_type IN ('fuel', 'charging', 'air', 'wash')
  ),
  generation bigint NOT NULL CHECK (generation > 0),
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload) IN ('object', 'array')
  ),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (namespace, cache_key_hash, country, service_type),
  CHECK (expires_at > created_at),
  CHECK (expires_at <= created_at + interval '1 hour')
);

CREATE INDEX query_cache_entries_expiry_idx
  ON query_cache_entries (expires_at);

CREATE INDEX query_cache_entries_scope_generation_idx
  ON query_cache_entries (country, service_type, generation);

CREATE OR REPLACE FUNCTION get_query_cache_generation(
  p_country text,
  p_service_type text,
  p_now timestamptz
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_generation bigint;
BEGIN
  INSERT INTO query_cache_generations (
    country,
    service_type,
    generation,
    invalidated_at
  )
  VALUES (p_country, p_service_type, 1, p_now)
  ON CONFLICT (country, service_type) DO NOTHING;

  SELECT generation INTO current_generation
  FROM query_cache_generations
  WHERE country = p_country AND service_type = p_service_type;

  RETURN current_generation;
END
$function$;

CREATE OR REPLACE FUNCTION put_query_cache(
  p_namespace text,
  p_cache_key_hash text,
  p_country text,
  p_service_type text,
  p_generation bigint,
  p_payload jsonb,
  p_created_at timestamptz,
  p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_generation bigint;
BEGIN
  PERFORM get_query_cache_generation(p_country, p_service_type, p_created_at);

  SELECT generation INTO current_generation
  FROM query_cache_generations
  WHERE country = p_country AND service_type = p_service_type
  FOR SHARE;

  IF current_generation <> p_generation THEN
    RETURN false;
  END IF;

  INSERT INTO query_cache_entries (
    namespace,
    cache_key_hash,
    country,
    service_type,
    generation,
    payload,
    created_at,
    expires_at
  )
  VALUES (
    p_namespace,
    p_cache_key_hash,
    p_country,
    p_service_type,
    p_generation,
    p_payload,
    p_created_at,
    p_expires_at
  )
  ON CONFLICT (namespace, cache_key_hash, country, service_type) DO UPDATE
  SET
    country = EXCLUDED.country,
    service_type = EXCLUDED.service_type,
    generation = EXCLUDED.generation,
    payload = EXCLUDED.payload,
    created_at = EXCLUDED.created_at,
    expires_at = EXCLUDED.expires_at;

  RETURN true;
END
$function$;

CREATE OR REPLACE FUNCTION read_query_cache(
  p_namespace text,
  p_cache_key_hash text,
  p_country text,
  p_service_type text,
  p_now timestamptz
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  SELECT entry.payload
  FROM query_cache_entries AS entry
  JOIN query_cache_generations AS current_generation
    ON current_generation.country = entry.country
    AND current_generation.service_type = entry.service_type
    AND current_generation.generation = entry.generation
  WHERE entry.namespace = p_namespace
    AND entry.cache_key_hash = p_cache_key_hash
    AND entry.country = p_country
    AND entry.service_type = p_service_type
    AND entry.expires_at > p_now
$function$;

CREATE OR REPLACE FUNCTION invalidate_source_query_cache(
  p_source_id text,
  p_invalidated_at timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  invalidated_scope_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM data_sources WHERE id = p_source_id) THEN
    RAISE EXCEPTION 'Unknown data source %', p_source_id
      USING ERRCODE = '55000';
  END IF;

  INSERT INTO query_cache_generations (
    country,
    service_type,
    generation,
    invalidated_at
  )
  SELECT scope.country, scope.service_type, 1, p_invalidated_at
  FROM source_cache_scopes AS scope
  WHERE scope.source_id = p_source_id
  ON CONFLICT (country, service_type) DO UPDATE
  SET
    generation = query_cache_generations.generation + 1,
    invalidated_at = EXCLUDED.invalidated_at;

  GET DIAGNOSTICS invalidated_scope_count = ROW_COUNT;
  RETURN invalidated_scope_count;
END
$function$;

CREATE OR REPLACE FUNCTION prune_query_cache(
  p_now timestamptz,
  p_invalidated_before timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM query_cache_entries AS entry
  USING query_cache_generations AS current_generation
  WHERE current_generation.country = entry.country
    AND current_generation.service_type = entry.service_type
    AND (
      entry.expires_at <= p_now OR
      (
        entry.generation <> current_generation.generation AND
        entry.created_at <= p_invalidated_before
      )
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END
$function$;

CREATE OR REPLACE FUNCTION upsert_source_record_with_change(
  p_source_id text,
  p_source_record_id text,
  p_service_point_id uuid,
  p_raw_payload jsonb,
  p_source_observed_at timestamptz,
  p_source_published_at timestamptz,
  p_fetched_at timestamptz
)
RETURNS TABLE(record_id bigint, changed boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  previous_record source_records;
  current_record source_records;
  had_previous boolean;
BEGIN
  SELECT * INTO previous_record
  FROM source_records
  WHERE source_id = p_source_id AND source_record_id = p_source_record_id
  FOR UPDATE;
  had_previous := FOUND;

  SELECT * INTO current_record
  FROM upsert_source_record(
    p_source_id,
    p_source_record_id,
    p_service_point_id,
    p_raw_payload,
    p_source_observed_at,
    p_source_published_at,
    p_fetched_at
  );

  RETURN QUERY SELECT
    current_record.id,
    NOT had_previous OR
    previous_record.service_point_id IS DISTINCT FROM current_record.service_point_id OR
    previous_record.raw_payload IS DISTINCT FROM current_record.raw_payload OR
    previous_record.source_observed_at IS DISTINCT FROM current_record.source_observed_at OR
    previous_record.source_published_at IS DISTINCT FROM current_record.source_published_at OR
    previous_record.fetched_at IS DISTINCT FROM current_record.fetched_at;
END
$function$;

INSERT INTO schema_migrations (version)
VALUES ('0009_query_cache')
ON CONFLICT (version) DO NOTHING;

COMMIT;

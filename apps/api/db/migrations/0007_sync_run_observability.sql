\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE sync_runs
  ADD COLUMN mode text NOT NULL DEFAULT 'incremental' CHECK (
    mode IN ('incremental', 'full_snapshot')
  ),
  ADD COLUMN pages_processed integer NOT NULL DEFAULT 0 CHECK (
    pages_processed >= 0
  ),
  ADD COLUMN records_processed integer NOT NULL DEFAULT 0 CHECK (
    records_processed >= 0
  ),
  ADD COLUMN failed_pages integer NOT NULL DEFAULT 0 CHECK (
    failed_pages >= 0
  ),
  ADD COLUMN duration_ms bigint CHECK (duration_ms >= 0),
  ADD COLUMN error_code text,
  ADD COLUMN error_message text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT sync_runs_completion_shape_check CHECK (
    (
      status = 'running' AND
      duration_ms IS NULL AND
      error_code IS NULL AND
      error_message IS NULL
    ) OR
    (
      status = 'succeeded' AND
      duration_ms IS NOT NULL AND
      failed_pages = 0 AND
      error_code IS NULL AND
      error_message IS NULL
    ) OR
    (
      status = 'failed' AND
      duration_ms IS NOT NULL AND
      failed_pages > 0 AND
      error_code IS NOT NULL AND
      btrim(error_code) <> '' AND
      error_message IS NOT NULL AND
      btrim(error_message) <> ''
    )
  ),
  ADD CONSTRAINT sync_runs_error_size_check CHECK (
    length(error_code) <= 100 AND length(error_message) <= 1000
  ),
  ADD CONSTRAINT sync_runs_updated_after_started_check CHECK (
    updated_at >= started_at
  );

CREATE UNIQUE INDEX sync_runs_one_running_per_source_uidx
  ON sync_runs (source_id)
  WHERE status = 'running';

CREATE INDEX sync_runs_source_started_idx
  ON sync_runs (source_id, started_at DESC);

CREATE OR REPLACE FUNCTION start_sync_run(
  p_source_id text,
  p_mode text,
  p_started_at timestamptz
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  run_id bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM data_sources
    WHERE id = p_source_id AND lifecycle_status <> 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'Unknown or withdrawn data source %', p_source_id
      USING ERRCODE = '55000';
  END IF;

  INSERT INTO sync_runs (source_id, mode, status, started_at, updated_at)
  VALUES (p_source_id, p_mode, 'running', p_started_at, p_started_at)
  RETURNING id INTO run_id;

  RETURN run_id;
END
$function$;

CREATE OR REPLACE FUNCTION finish_sync_run(
  p_run_id bigint,
  p_status text,
  p_completed_at timestamptz,
  p_pages_processed integer,
  p_records_processed integer,
  p_failed_pages integer,
  p_error_code text,
  p_error_message text
)
RETURNS sync_runs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  completed_run sync_runs;
BEGIN
  IF p_status NOT IN ('succeeded', 'failed') THEN
    RAISE EXCEPTION 'Sync run terminal status must be succeeded or failed';
  END IF;

  UPDATE sync_runs
  SET
    status = p_status,
    completed_at = p_completed_at,
    pages_processed = p_pages_processed,
    records_processed = p_records_processed,
    failed_pages = p_failed_pages,
    duration_ms = floor(
      extract(epoch FROM (p_completed_at - started_at)) * 1000
    )::bigint,
    error_code = p_error_code,
    error_message = p_error_message,
    updated_at = p_completed_at
  WHERE id = p_run_id
    AND status = 'running'
  RETURNING * INTO completed_run;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or already completed sync run %', p_run_id
      USING ERRCODE = '55000';
  END IF;

  RETURN completed_run;
END
$function$;

INSERT INTO schema_migrations (version)
VALUES ('0007_sync_run_observability')
ON CONFLICT (version) DO NOTHING;

COMMIT;

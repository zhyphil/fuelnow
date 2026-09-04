\set ON_ERROR_STOP on

BEGIN;

ALTER TABLE sync_runs
  ADD COLUMN attempt_number smallint NOT NULL DEFAULT 1 CHECK (
    attempt_number BETWEEN 1 AND 20
  ),
  ADD COLUMN retry_of_run_id bigint REFERENCES sync_runs(id) ON DELETE RESTRICT,
  ADD CONSTRAINT sync_runs_retry_shape_check CHECK (
    (attempt_number = 1 AND retry_of_run_id IS NULL) OR
    (attempt_number > 1 AND retry_of_run_id IS NOT NULL)
  );

CREATE UNIQUE INDEX sync_runs_retry_of_run_uidx
  ON sync_runs (retry_of_run_id)
  WHERE retry_of_run_id IS NOT NULL;

CREATE TABLE sync_retry_decisions (
  failed_run_id bigint PRIMARY KEY REFERENCES sync_runs(id) ON DELETE RESTRICT,
  source_id text NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  classification text NOT NULL CHECK (
    classification IN ('transient', 'permanent', 'cancelled')
  ),
  max_attempts smallint NOT NULL CHECK (max_attempts BETWEEN 1 AND 20),
  should_retry boolean NOT NULL,
  next_attempt_at timestamptz,
  retry_started_run_id bigint UNIQUE REFERENCES sync_runs(id) ON DELETE RESTRICT,
  decided_at timestamptz NOT NULL,
  CHECK (
    (should_retry AND classification = 'transient' AND next_attempt_at IS NOT NULL) OR
    (NOT should_retry AND next_attempt_at IS NULL)
  ),
  CHECK (next_attempt_at IS NULL OR next_attempt_at > decided_at)
);

CREATE INDEX sync_retry_decisions_due_idx
  ON sync_retry_decisions (next_attempt_at, failed_run_id)
  WHERE should_retry AND retry_started_run_id IS NULL;

CREATE TABLE sync_alert_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id text NOT NULL REFERENCES data_sources(id) ON DELETE RESTRICT,
  sync_run_id bigint NOT NULL REFERENCES sync_runs(id) ON DELETE RESTRICT,
  alert_type text NOT NULL CHECK (
    alert_type IN (
      'sync_permanent_failure',
      'sync_retry_exhausted',
      'sync_stale_run'
    )
  ),
  severity text NOT NULL CHECK (severity IN ('warning', 'critical')),
  dedupe_key text NOT NULL UNIQUE CHECK (
    btrim(dedupe_key) <> '' AND length(dedupe_key) <= 200
  ),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'delivered', 'delivery_failed')
  ),
  delivery_attempts integer NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
  last_delivery_error text CHECK (length(last_delivery_error) <= 1000),
  created_at timestamptz NOT NULL,
  last_attempted_at timestamptz,
  delivered_at timestamptz,
  CHECK (
    (status = 'pending' AND delivered_at IS NULL) OR
    (status = 'delivery_failed' AND delivered_at IS NULL) OR
    (status = 'delivered' AND delivered_at IS NOT NULL)
  ),
  CHECK (
    (status = 'delivery_failed' AND last_delivery_error IS NOT NULL) OR
    (status <> 'delivery_failed' AND last_delivery_error IS NULL)
  )
);

CREATE INDEX sync_alert_outbox_pending_idx
  ON sync_alert_outbox (created_at, id)
  WHERE status IN ('pending', 'delivery_failed');

CREATE OR REPLACE FUNCTION start_sync_run_attempt(
  p_source_id text,
  p_mode text,
  p_started_at timestamptz,
  p_attempt_number smallint
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  run_id bigint;
  previous_run_id bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM data_sources
    WHERE id = p_source_id AND lifecycle_status <> 'withdrawn'
  ) THEN
    RAISE EXCEPTION 'Unknown or withdrawn data source %', p_source_id
      USING ERRCODE = '55000';
  END IF;

  IF p_attempt_number = 1 THEN
    IF EXISTS (
      SELECT 1
      FROM sync_retry_decisions
      WHERE source_id = p_source_id
        AND should_retry
        AND retry_started_run_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Source % has a pending retry', p_source_id
        USING ERRCODE = '55000';
    END IF;

    RETURN start_sync_run(p_source_id, p_mode, p_started_at);
  END IF;

  SELECT decision.failed_run_id
  INTO previous_run_id
  FROM sync_retry_decisions AS decision
  JOIN sync_runs AS failed_run ON failed_run.id = decision.failed_run_id
  WHERE decision.source_id = p_source_id
    AND decision.should_retry
    AND decision.retry_started_run_id IS NULL
    AND decision.next_attempt_at <= p_started_at
    AND failed_run.status = 'failed'
    AND failed_run.mode = p_mode
    AND failed_run.attempt_number + 1 = p_attempt_number
  ORDER BY decision.next_attempt_at, decision.failed_run_id
  LIMIT 1
  FOR UPDATE OF decision SKIP LOCKED;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No due retry for source % attempt %',
      p_source_id, p_attempt_number
      USING ERRCODE = '55000';
  END IF;

  INSERT INTO sync_runs (
    source_id,
    mode,
    status,
    started_at,
    updated_at,
    attempt_number,
    retry_of_run_id
  )
  VALUES (
    p_source_id,
    p_mode,
    'running',
    p_started_at,
    p_started_at,
    p_attempt_number,
    previous_run_id
  )
  RETURNING id INTO run_id;

  UPDATE sync_retry_decisions
  SET retry_started_run_id = run_id
  WHERE failed_run_id = previous_run_id;

  RETURN run_id;
END
$function$;

CREATE OR REPLACE FUNCTION finish_failed_sync_run(
  p_run_id bigint,
  p_completed_at timestamptz,
  p_pages_processed integer,
  p_records_processed integer,
  p_failed_pages integer,
  p_error_code text,
  p_error_message text,
  p_classification text,
  p_max_attempts smallint,
  p_next_attempt_at timestamptz
)
RETURNS sync_retry_decisions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  completed_run sync_runs;
  retry_decision sync_retry_decisions;
  retry_allowed boolean;
  alert_kind text;
BEGIN
  IF p_classification NOT IN ('transient', 'permanent', 'cancelled') THEN
    RAISE EXCEPTION 'Unknown sync failure classification %', p_classification;
  END IF;

  IF p_max_attempts NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'max attempts must be between 1 and 20';
  END IF;

  SELECT * INTO completed_run
  FROM finish_sync_run(
    p_run_id,
    'failed',
    p_completed_at,
    p_pages_processed,
    p_records_processed,
    p_failed_pages,
    p_error_code,
    p_error_message
  );

  IF completed_run.attempt_number > p_max_attempts THEN
    RAISE EXCEPTION 'Run attempt exceeds configured maximum';
  END IF;

  retry_allowed :=
    p_classification = 'transient' AND
    completed_run.attempt_number < p_max_attempts;

  IF retry_allowed AND p_next_attempt_at IS NULL THEN
    RAISE EXCEPTION 'Retryable failure requires next attempt time';
  END IF;

  IF NOT retry_allowed AND p_next_attempt_at IS NOT NULL THEN
    RAISE EXCEPTION 'Terminal failure cannot schedule another attempt';
  END IF;

  INSERT INTO sync_retry_decisions (
    failed_run_id,
    source_id,
    classification,
    max_attempts,
    should_retry,
    next_attempt_at,
    decided_at
  )
  VALUES (
    completed_run.id,
    completed_run.source_id,
    p_classification,
    p_max_attempts,
    retry_allowed,
    p_next_attempt_at,
    p_completed_at
  )
  RETURNING * INTO retry_decision;

  IF p_classification <> 'cancelled' AND NOT retry_allowed THEN
    alert_kind := CASE
      WHEN p_classification = 'permanent' THEN 'sync_permanent_failure'
      ELSE 'sync_retry_exhausted'
    END;

    INSERT INTO sync_alert_outbox (
      source_id,
      sync_run_id,
      alert_type,
      severity,
      dedupe_key,
      payload,
      created_at
    )
    VALUES (
      completed_run.source_id,
      completed_run.id,
      alert_kind,
      'critical',
      alert_kind || ':' || completed_run.id::text,
      jsonb_build_object(
        'sourceId', completed_run.source_id,
        'syncRunId', completed_run.id::text,
        'attemptNumber', completed_run.attempt_number,
        'maxAttempts', p_max_attempts,
        'errorCode', p_error_code
      ),
      p_completed_at
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN retry_decision;
END
$function$;

CREATE OR REPLACE FUNCTION enqueue_stale_sync_run_alerts(
  p_detected_at timestamptz,
  p_stale_after interval DEFAULT interval '1 hour'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  inserted_count integer;
BEGIN
  IF p_stale_after <= interval '0 seconds' THEN
    RAISE EXCEPTION 'stale threshold must be positive';
  END IF;

  WITH inserted AS (
    INSERT INTO sync_alert_outbox (
      source_id,
      sync_run_id,
      alert_type,
      severity,
      dedupe_key,
      payload,
      created_at
    )
    SELECT
      run.source_id,
      run.id,
      'sync_stale_run',
      'warning',
      'sync_stale_run:' || run.id::text,
      jsonb_build_object(
        'sourceId', run.source_id,
        'syncRunId', run.id::text,
        'startedAt', run.started_at
      ),
      p_detected_at
    FROM sync_runs AS run
    WHERE run.status = 'running'
      AND run.started_at <= p_detected_at - p_stale_after
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::integer INTO inserted_count FROM inserted;

  RETURN inserted_count;
END
$function$;

CREATE OR REPLACE FUNCTION complete_sync_alert_delivery(
  p_alert_id bigint,
  p_succeeded boolean,
  p_attempted_at timestamptz,
  p_error_message text
)
RETURNS sync_alert_outbox
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  completed_alert sync_alert_outbox;
BEGIN
  IF p_succeeded AND p_error_message IS NOT NULL THEN
    RAISE EXCEPTION 'Successful alert delivery cannot include an error';
  END IF;

  IF NOT p_succeeded AND (p_error_message IS NULL OR btrim(p_error_message) = '') THEN
    RAISE EXCEPTION 'Failed alert delivery requires an error';
  END IF;

  UPDATE sync_alert_outbox
  SET
    status = CASE WHEN p_succeeded THEN 'delivered' ELSE 'delivery_failed' END,
    delivery_attempts = delivery_attempts + 1,
    last_delivery_error = CASE WHEN p_succeeded THEN NULL ELSE left(p_error_message, 1000) END,
    last_attempted_at = p_attempted_at,
    delivered_at = CASE WHEN p_succeeded THEN p_attempted_at ELSE NULL END
  WHERE id = p_alert_id
    AND status <> 'delivered'
  RETURNING * INTO completed_alert;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or already delivered sync alert %', p_alert_id
      USING ERRCODE = '55000';
  END IF;

  RETURN completed_alert;
END
$function$;

INSERT INTO schema_migrations (version)
VALUES ('0008_sync_retry_alerting')
ON CONFLICT (version) DO NOTHING;

COMMIT;

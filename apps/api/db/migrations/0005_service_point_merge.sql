\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE service_point_match_decisions (
  source_record_id bigint PRIMARY KEY REFERENCES source_records(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (
    outcome IN ('matched', 'created', 'review_required', 'rejected')
  ),
  target_service_point_id uuid REFERENCES service_points(id) ON DELETE RESTRICT,
  candidate_service_point_ids uuid[] NOT NULL DEFAULT '{}',
  score smallint CHECK (score BETWEEN 0 AND 100),
  reason_codes text[] NOT NULL CHECK (cardinality(reason_codes) > 0),
  rule_version text NOT NULL CHECK (btrim(rule_version) <> ''),
  decided_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (outcome IN ('matched', 'created') AND target_service_point_id IS NOT NULL) OR
    (outcome IN ('review_required', 'rejected') AND target_service_point_id IS NULL)
  ),
  CHECK (
    outcome <> 'review_required' OR cardinality(candidate_service_point_ids) > 0
  )
);

CREATE INDEX service_point_match_decisions_review_idx
  ON service_point_match_decisions (decided_at, source_record_id)
  WHERE outcome = 'review_required';

INSERT INTO schema_migrations (version)
VALUES ('0005_service_point_merge')
ON CONFLICT (version) DO NOTHING;

COMMIT;

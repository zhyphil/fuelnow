import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationUrl = new URL("../db/migrations/0001_initial.sql", import.meta.url);
const composeUrl = new URL("../../../compose.yaml", import.meta.url);
const indexMigrationUrl = new URL(
  "../db/migrations/0002_query_indexes.sql",
  import.meta.url,
);
const applyMigrationsUrl = new URL(
  "../db/migrations/apply-migrations.sh",
  import.meta.url,
);
const sourceIdempotencyMigrationUrl = new URL(
  "../db/migrations/0003_source_record_idempotency.sql",
  import.meta.url,
);
const sourceIdempotencyVerificationUrl = new URL(
  "../db/migrations/verify-source-idempotency.sql",
  import.meta.url,
);
const mergeMigrationUrl = new URL(
  "../db/migrations/0005_service_point_merge.sql",
  import.meta.url,
);
const lifecycleMigrationUrl = new URL(
  "../db/migrations/0006_source_lifecycle.sql",
  import.meta.url,
);
const syncRunMigrationUrl = new URL(
  "../db/migrations/0007_sync_run_observability.sql",
  import.meta.url,
);
const syncRetryMigrationUrl = new URL(
  "../db/migrations/0008_sync_retry_alerting.sql",
  import.meta.url,
);
const queryCacheMigrationUrl = new URL(
  "../db/migrations/0009_query_cache.sql",
  import.meta.url,
);
const candidateSearchMigrationUrl = new URL(
  "../db/migrations/0010_service_point_candidate_search.sql",
  import.meta.url,
);

describe("initial PostgreSQL/PostGIS schema", () => {
  it("enables PostGIS and uses WGS84 geography points", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS postgis");
    expect(migration).toContain("location geography(Point, 4326) NOT NULL");
  });

  it("creates every foundational data area", async () => {
    const migration = await readFile(migrationUrl, "utf8");
    const tables = [
      "service_points",
      "service_point_services",
      "data_sources",
      "source_records",
      "field_provenance",
      "fuel_offers",
      "fuel_prices",
      "charging_sites",
      "charging_evses",
      "charging_connectors",
      "charging_tariff_components",
      "air_services",
      "wash_services",
      "wash_service_types",
      "wash_programs",
      "sync_runs",
    ];

    for (const table of tables) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("keeps the initial migration non-destructive and repeatable", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE)\b/i);
    expect(migration).toContain("ON CONFLICT (version) DO NOTHING");
  });

  it("pins the supported database image and PostgreSQL 18 volume path", async () => {
    const compose = await readFile(composeUrl, "utf8");

    expect(compose).toContain("postgis/postgis:18-3.6@sha256:");
    expect(compose).toContain("/var/lib/postgresql");
    expect(compose).not.toContain("postgis/postgis:latest");
  });

  it("creates a GiST index for indexed radius filtering", async () => {
    const migration = await readFile(indexMigrationUrl, "utf8");

    expect(migration).toContain("service_points_location_gist");
    expect(migration).toMatch(/ON service_points USING gist \(location\)/);
  });

  it("indexes common service, availability, price and equipment filters", async () => {
    const migration = await readFile(indexMigrationUrl, "utf8");
    const expectedIndexes = [
      "service_points_country_opening_status_idx",
      "service_point_services_type_point_idx",
      "fuel_offers_type_availability_point_idx",
      "fuel_prices_latest_idx",
      "charging_evses_point_status_idx",
      "charging_connectors_filter_idx",
      "air_services_working_status_idx",
      "wash_services_working_status_idx",
    ];

    for (const index of expectedIndexes) {
      expect(migration).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
    }
  });

  it("discovers numbered migrations in order and skips recorded versions", async () => {
    const runner = await readFile(applyMigrationsUrl, "utf8");

    expect(runner).toContain("for migration in /migrations/[0-9][0-9][0-9][0-9]_*.sql");
    expect(runner).toContain("SELECT 1 FROM schema_migrations WHERE version");
    expect(runner).toContain("Skipping already applied migration");
    expect(runner).toContain('--file "$migration"');
  });

  it("names a source record by provider and provider-native identifier", async () => {
    const migration = await readFile(sourceIdempotencyMigrationUrl, "utf8");

    expect(migration).toContain("source_records_source_identity_uidx");
    expect(migration).toMatch(/ON source_records \(source_id, source_record_id\)/);
  });

  it("upserts source records without allowing older fetches to overwrite", async () => {
    const migration = await readFile(sourceIdempotencyMigrationUrl, "utf8");

    expect(migration).toContain("ON CONFLICT (source_id, source_record_id) DO UPDATE");
    expect(migration).toContain("EXCLUDED.fetched_at > source_records.fetched_at");
    expect(migration).toContain("SELECT existing.*");
  });

  it("verifies replay, update and stale-write behavior transactionally", async () => {
    const verification = await readFile(sourceIdempotencyVerificationUrl, "utf8");

    expect(verification).toContain("Identical replay changed the source record");
    expect(verification).toContain("Newer source payload did not update in place");
    expect(verification).toContain("Older source payload overwrote the current record");
    expect(verification).toContain("ROLLBACK;");
  });

  it("stores one auditable cross-source match decision per raw record", async () => {
    const migration = await readFile(mergeMigrationUrl, "utf8");

    expect(migration).toContain("CREATE TABLE service_point_match_decisions");
    expect(migration).toContain(
      "source_record_id bigint PRIMARY KEY REFERENCES source_records(id)",
    );
    expect(migration).toContain("rule_version text NOT NULL");
  });

  it("keeps ambiguous matches unlinked and queryable for review", async () => {
    const migration = await readFile(mergeMigrationUrl, "utf8");

    expect(migration).toContain("'review_required'");
    expect(migration).toContain("target_service_point_id IS NULL");
    expect(migration).toContain("service_point_match_decisions_review_idx");
  });

  it("models source records and canonical points without hard deletion", async () => {
    const migration = await readFile(lifecycleMigrationUrl, "utf8");

    expect(migration).toContain(
      "lifecycle_status IN ('active', 'missing', 'deleted', 'withdrawn')",
    );
    expect(migration).toContain(
      "'active', 'temporarily_closed', 'permanently_closed', 'unverified'",
    );
    expect(migration).not.toMatch(
      /\bDELETE FROM (?:source_records|service_points|fuel_offers)\b/,
    );
  });

  it("records immutable source, closure and Fuel availability events", async () => {
    const migration = await readFile(lifecycleMigrationUrl, "utf8");

    expect(migration).toContain("CREATE TABLE source_record_lifecycle_events");
    expect(migration).toContain("CREATE TABLE service_point_lifecycle_events");
    expect(migration).toContain("CREATE TABLE fuel_offer_availability_events");
    expect(migration.match(/ON DELETE RESTRICT/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("provides explicit missing, deletion and source-withdrawal operations", async () => {
    const migration = await readFile(lifecycleMigrationUrl, "utf8");

    expect(migration).toContain("FUNCTION mark_source_records_missing");
    expect(migration).toContain("FUNCTION mark_source_record_deleted");
    expect(migration).toContain("FUNCTION withdraw_data_source");
    expect(migration).toContain("source_records_withdrawn_source_guard");
  });

  it("records sync timing, volume, failure and bounded error fields", async () => {
    const migration = await readFile(syncRunMigrationUrl, "utf8");

    for (const column of [
      "pages_processed",
      "records_processed",
      "failed_pages",
      "duration_ms",
      "error_code",
      "error_message",
    ]) {
      expect(migration).toContain(`ADD COLUMN ${column}`);
    }
    expect(migration).toContain("length(error_message) <= 1000");
  });

  it("allows only one running sync per source", async () => {
    const migration = await readFile(syncRunMigrationUrl, "utf8");

    expect(migration).toContain(
      "CREATE UNIQUE INDEX sync_runs_one_running_per_source_uidx",
    );
    expect(migration).toContain("WHERE status = 'running'");
  });

  it("starts and terminally completes sync runs through guarded functions", async () => {
    const migration = await readFile(syncRunMigrationUrl, "utf8");

    expect(migration).toContain("FUNCTION start_sync_run");
    expect(migration).toContain("FUNCTION finish_sync_run");
    expect(migration).toContain("AND status = 'running'");
  });

  it("stores bounded retry decisions and one parent for each retry", async () => {
    const migration = await readFile(syncRetryMigrationUrl, "utf8");

    expect(migration).toContain("CREATE TABLE sync_retry_decisions");
    expect(migration).toContain("attempt_number BETWEEN 1 AND 20");
    expect(migration).toContain("sync_runs_retry_of_run_uidx");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION start_sync_run_attempt");
    expect(migration).toContain("FOR UPDATE OF decision SKIP LOCKED");
    expect(migration).toContain("lifecycle_status <> 'withdrawn'");
    expect(migration).toContain("has a pending retry");
  });

  it("atomically finishes a failure with its retry or terminal alert decision", async () => {
    const migration = await readFile(syncRetryMigrationUrl, "utf8");

    expect(migration).toContain("CREATE OR REPLACE FUNCTION finish_failed_sync_run");
    expect(migration).toContain("retry_allowed :=");
    expect(migration).toContain("sync_retry_exhausted");
    expect(migration).toContain("sync_permanent_failure");
    expect(migration).not.toContain("'errorMessage', p_error_message");
  });

  it("deduplicates stale-run alerts and tracks alert delivery attempts", async () => {
    const migration = await readFile(syncRetryMigrationUrl, "utf8");

    expect(migration).toContain("CREATE TABLE sync_alert_outbox");
    expect(migration).toContain("dedupe_key text NOT NULL UNIQUE");
    expect(migration).toContain("FUNCTION enqueue_stale_sync_run_alerts");
    expect(migration).toContain("ON CONFLICT (dedupe_key) DO NOTHING");
    expect(migration).toContain("FUNCTION complete_sync_alert_delivery");
  });

  it("stores only hashed cache keys with bounded TTLs", async () => {
    const migration = await readFile(queryCacheMigrationUrl, "utf8");

    expect(migration).toContain("CREATE TABLE query_cache_entries");
    expect(migration).toContain("cache_key_hash ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain(
      "PRIMARY KEY (namespace, cache_key_hash, country, service_type)",
    );
    expect(migration).toContain("interval '1 hour'");
    expect(migration).toContain("jsonb_typeof(payload) IN ('object', 'array')");
  });

  it("uses cache generations to reject stale reads and writes", async () => {
    const migration = await readFile(queryCacheMigrationUrl, "utf8");

    expect(migration).toContain("FUNCTION put_query_cache");
    expect(migration).toContain("current_generation <> p_generation");
    expect(migration).toContain("FUNCTION read_query_cache");
    expect(migration).toContain("current_generation.generation = entry.generation");
  });

  it("maps source changes to scoped invalidation and bounded pruning", async () => {
    const migration = await readFile(queryCacheMigrationUrl, "utf8");

    expect(migration).toContain("CREATE TABLE source_cache_scopes");
    expect(migration).toContain("FUNCTION invalidate_source_query_cache");
    expect(migration).toContain("FUNCTION upsert_source_record_with_change");
    expect(migration).toContain("FUNCTION prune_query_cache");
  });

  it("coarse-filters service candidates with indexed geography distance", async () => {
    const migration = await readFile(candidateSearchMigrationUrl, "utf8");

    expect(migration).toContain("FUNCTION search_service_point_candidates");
    expect(migration).toContain("ST_DWithin(point.location, origin, p_radius_metres)");
    expect(migration).toContain("ST_Distance(point.location, origin)");
    expect(migration).toContain("service.service_type = p_service_type");
  });

  it("excludes permanent closure while preserving later decision states", async () => {
    const migration = await readFile(candidateSearchMigrationUrl, "utf8");

    expect(migration).toContain("lifecycle_status <> 'permanently_closed'");
    expect(migration).toContain("point.opening_status");
    expect(migration).toContain("point.temporary_closure");
  });

  it("bounds radius and candidate count at the database boundary", async () => {
    const migration = await readFile(candidateSearchMigrationUrl, "utf8");

    expect(migration).toContain("p_radius_metres NOT BETWEEN 1 AND 100000");
    expect(migration).toContain("p_limit NOT BETWEEN 1 AND 500");
    expect(migration).toContain(
      "ORDER BY ST_Distance(point.location, origin), point.id",
    );
  });
});

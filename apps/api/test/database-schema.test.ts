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
});

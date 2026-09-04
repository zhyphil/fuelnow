import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationUrl = new URL("../db/migrations/0001_initial.sql", import.meta.url);
const composeUrl = new URL("../../../compose.yaml", import.meta.url);

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
});

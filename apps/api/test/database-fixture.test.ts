import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

interface FixtureManifest {
  fixtureVersion: number;
  synthetic: boolean;
  referenceTime: string;
  sourcePrefix: string;
  sourceIds: string[];
  servicePointIds: string[];
  expectedRows: Record<string, number>;
  scenarios: string[];
}

const fixtureSqlUrl = new URL("../db/fixtures/base.sql", import.meta.url);
const fixtureManifestUrl = new URL(
  "../db/fixtures/base-manifest.json",
  import.meta.url,
);
const fixtureVerificationUrl = new URL(
  "../db/fixtures/verify-base.sql",
  import.meta.url,
);
const verificationRunnerUrl = new URL(
  "../db/migrations/verify-all.sh",
  import.meta.url,
);
const composeUrl = new URL("../../../compose.yaml", import.meta.url);

async function manifest(): Promise<FixtureManifest> {
  return JSON.parse(await readFile(fixtureManifestUrl, "utf8")) as FixtureManifest;
}

describe("database integration fixture", () => {
  it("declares a fixed synthetic clock, reserved identities and required scenarios", async () => {
    const fixture = await manifest();

    expect(fixture).toMatchObject({
      fixtureVersion: 1,
      synthetic: true,
      referenceTime: "2026-01-15T12:00:00.000Z",
      sourcePrefix: "__fixture__",
    });
    expect(fixture.sourceIds).toHaveLength(5);
    expect(fixture.sourceIds.every((id) => id.startsWith(fixture.sourcePrefix))).toBe(
      true,
    );
    expect(fixture.scenarios).toEqual(
      expect.arrayContaining([
        "fr_open_multiservice",
        "fr_temporary_closure_and_stockout",
        "es_known_evse_availability",
        "fr_es_cross_border_fuel",
        "recent_and_stale_prices",
      ]),
    );
  });

  it("uses unique stable UUIDs and keeps the manifest synchronized with SQL", async () => {
    const fixture = await manifest();
    const sql = await readFile(fixtureSqlUrl, "utf8");

    expect(new Set(fixture.servicePointIds).size).toBe(fixture.servicePointIds.length);
    for (const id of [...fixture.sourceIds, ...fixture.servicePointIds]) {
      expect(sql).toContain(id);
    }
    for (const id of fixture.servicePointIds) {
      expect(id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
    }
  });

  it("contains no live provider URL and expects exact cross-service row counts", async () => {
    const fixture = await manifest();
    const sql = await readFile(fixtureSqlUrl, "utf8");

    expect(sql).toContain("https://example.invalid/");
    expect(sql).not.toMatch(
      /https:\/\/(?:data\.gouv|prix-carburants|miteco|ree|openstreetmap)/i,
    );
    expect(fixture.expectedRows).toEqual({
      dataSources: 5,
      servicePoints: 6,
      servicePointServices: 9,
      sourceRecords: 6,
      fuelOffers: 7,
      fuelPrices: 6,
      chargingSites: 1,
      chargingEvses: 2,
      chargingConnectors: 2,
      airServices: 1,
      washServices: 2,
      washServiceTypes: 2,
    });
  });

  it("loads twice, asserts and rolls back through the standard database check", async () => {
    const verification = await readFile(fixtureVerificationUrl, "utf8");
    const runner = await readFile(verificationRunnerUrl, "utf8");
    const compose = await readFile(composeUrl, "utf8");

    expect(verification.match(/\\ir base\.sql/g)).toHaveLength(2);
    expect(verification).toContain("ROLLBACK;");
    expect(runner).toContain("--file /fixtures/verify-base.sql");
    expect(compose).toContain("./apps/api/db/fixtures:/fixtures:ro");
  });
});

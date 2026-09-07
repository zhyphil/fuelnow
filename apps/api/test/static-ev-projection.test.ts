import { readFileSync } from "node:fs";
import { isChargingServicePoint } from "@fuel-now/contracts";
import { describe, expect, it } from "vitest";
import {
  normalizeStaticEvRow,
  projectStaticEvStation,
} from "../src/worker/supplement-import/projectStaticEv.js";

const fr: Array<Record<string, unknown>> = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/france-ev/toulouse-static-sample.json", import.meta.url),
    "utf8",
  ),
).records;
const es: Array<Record<string, unknown>> = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/spain-ev/target-geography-sample.json", import.meta.url),
    "utf8",
  ),
).records;
const fetchedAt = "2026-09-07T13:00:00Z";
const good = fr.find((row) => row.consolidated_is_lon_lat_correct === "true")!;

describe("static EV source projection", () => {
  it("does not retain unneeded contact fields from source rows", () => {
    const result = projectStaticEvStation(
      "FR",
      [{ ...good, contact_operateur: "private@example.invalid", telephone: "private" }],
      fetchedAt,
    );
    expect(JSON.stringify(result)).not.toContain("private");
  });
  it("maps French PDC connector flags without inflating simultaneous EVSE counts", () => {
    const projected = projectStaticEvStation("FR", [good], fetchedAt);
    expect(isChargingServicePoint(projected.point)).toBe(true);
    expect(projected.point.charging.totalEvses).toBe(1);
    expect(projected.point.charging.evses[0]?.connectors.length).toBeGreaterThan(1);
    expect(projected.point.charging).toMatchObject({
      availableEvses: null,
      knownStatusEvses: null,
      unknownStatusEvses: null,
      price: null,
    });
    expect(projected.point.charging.evses[0]).toMatchObject({
      operational: null,
      status: "unknown",
      sourceObservedAt: null,
    });
  });
  it("groups Spanish connector rows under their EVSE and scopes connector IDs", () => {
    const first = es[0]!;
    const records = [
      first,
      { ...first, connector_id: "second", connector_type: "IEC_62196_T2_COMBO" },
    ];
    const projected = projectStaticEvStation("ES", records, fetchedAt);
    expect(isChargingServicePoint(projected.point)).toBe(true);
    expect(projected.point.charging.totalEvses).toBe(1);
    expect(
      projected.point.charging.evses[0]?.connectors.map(
        (connector) => connector.connectorType,
      ),
    ).toEqual(["type_2_attached", "ccs_combo_2"]);
    expect(projected.point.sourceSummary.attributionText).toContain(
      "Origen de los datos:",
    );
  });
  it("keeps unsupported connectors unknown and does not parse tariff text into prices", () => {
    const point = projectStaticEvStation(
      "ES",
      [{ ...es[0], connector_type: "IEC_62196_T1", tariff: "0 EUR" }],
      fetchedAt,
    ).point;
    expect(point.charging.evses[0]?.connectors[0]).toMatchObject({
      connectorType: "unknown",
      tariffs: null,
    });
    expect(point.charging.price).toBeNull();
  });
  it("quarantines the known bad French coordinates", () => {
    expect(() => projectStaticEvStation("FR", [fr[0]!], fetchedAt)).toThrow(
      "coordinate quality",
    );
  });
  it.each(["0", "-1", "160000", "NaN", ""])("quarantines invalid power %s", (power) => {
    expect(() =>
      normalizeStaticEvRow("FR", { ...good, puissance_nominale: power }, fetchedAt),
    ).toThrow();
  });
  it("rejects duplicates, inconsistent grouping, future dates and unsupported timezones", () => {
    expect(() => projectStaticEvStation("FR", [good, good], fetchedAt)).toThrow(
      "Duplicate",
    );
    expect(() =>
      projectStaticEvStation(
        "FR",
        [good, { ...good, id_pdc_itinerance: "OTHER", consolidated_latitude: "48.5" }],
        fetchedAt,
      ),
    ).toThrow("Inconsistent");
    expect(() =>
      normalizeStaticEvRow("FR", { ...good, date_maj: "2099-01-01" }, fetchedAt),
    ).toThrow("timestamp");
    expect(() =>
      normalizeStaticEvRow(
        "ES",
        { ...es[0], longitude: "-16.5", latitude: "28.5" },
        fetchedAt,
      ),
    ).toThrow("geography");
  });
  it("retains identity across snapshots and never calls collection time a verification", () => {
    const a = projectStaticEvStation("FR", [good], fetchedAt);
    const b = projectStaticEvStation("FR", [good], "2026-09-08T13:00:00Z");
    expect(a.point.id).toBe(b.point.id);
    expect(a.point.charging.evses[0]?.id).toBe(b.point.charging.evses[0]?.id);
    expect(a.point.sourceSummary.verifiedAt).toBeNull();
  });
});

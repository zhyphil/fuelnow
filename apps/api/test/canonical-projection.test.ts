import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assertCanonicalProjection } from "../src/worker/source-import/canonicalProjection.js";
import { projectStaticEvStation } from "../src/worker/supplement-import/projectStaticEv.js";

const records = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/france-ev/toulouse-static-sample.json", import.meta.url),
    "utf8",
  ),
).records;
function entry() {
  const ev = projectStaticEvStation(
    "FR",
    [
      records.find(
        (row: Record<string, unknown>) =>
          row.consolidated_is_lon_lat_correct === "true",
      ),
    ],
    "2026-09-07T13:00:00Z",
  );
  return {
    rawPayload: ev.raw,
    projection: {
      point: ev.point,
      sourceRecordId: ev.sourceRecordId,
      air: null,
      wash: null,
      issues: [],
    },
  };
}
describe("canonical projection write boundary", () => {
  it("accepts static EV evidence", () =>
    expect(() => assertCanonicalProjection(entry())).not.toThrow());
  it("rejects unstable or mismatched canonical identity", () => {
    const value = entry();
    value.projection.point.id = "00000000-0000-4000-8000-000000000001";
    expect(() => assertCanonicalProjection(value)).toThrow();
  });
  it("does not let the static writer publish live charging evidence", () => {
    const value = entry();
    const evse = value.projection.point.charging.evses[0]!;
    evse.status = "occupied";
    evse.operational = true;
    evse.sourceObservedAt = "2026-09-07T12:00:00Z";
    expect(() => assertCanonicalProjection(value)).toThrow("Static importer");
  });
  it("rejects absent raw evidence", () =>
    expect(() =>
      assertCanonicalProjection({ ...entry(), rawPayload: null }),
    ).toThrow());
});

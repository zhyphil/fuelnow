import { expect, it } from "vitest";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import type { Evidence } from "../src/search/evidence";
import { evidenceWarnings } from "../src/search/freshness";
const evidence = sample.results[0]!.evidence as Evidence;
it("warns about stale critical price even with recent source metadata", () => {
  expect(
    evidenceWarnings({
      ...evidence,
      price: { ...evidence.price!, freshness: "stale" },
    }),
  ).toContain("staleData");
  expect(evidenceWarnings({ ...evidence, price: null })).toContain("missingData");
  expect(
    evidenceWarnings({ ...evidence, confidence: { level: "low", score: 0.2 } }),
  ).toContain("lowConfidence");
});
it("expires a live EV observation as time advances without needing a new request", () => {
  const ev: Evidence = {
    ...evidence,
    freshness: "live",
    details: {
      ...evidence.details,
      charging: {
        operator: null,
        network: null,
        connectorTypes: [],
        maximumRatedPowerKw: null,
        totalEvses: 1,
      },
    },
  };
  const observation = Date.parse(ev.status.availability.observedAt!);
  expect(evidenceWarnings(ev, observation + 300_000)).not.toContain("expiredLive");
  expect(evidenceWarnings(ev, observation + 300_001)).toContain("expiredLive");
});

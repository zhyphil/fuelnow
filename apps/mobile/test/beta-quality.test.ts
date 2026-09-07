import { expect, it } from "vitest";
import {
  ageBucket,
  captureQuality,
  freshnessMetrics,
  missingnessMetrics,
} from "../src/analytics/quality";
import { BetaSession, observeSearch } from "../src/analytics/beta";
import type { NearbyResponse } from "../src/api/client";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
const now = Date.parse("2026-09-07T12:00:00Z");
it("distinguishes zero price, unavailable and closed from missing values", () => {
  const reply = structuredClone(sample) as NearbyResponse;
  const point = reply.results[0]!;
  point.evidence.price!.amount = 0;
  point.evidence.status.availability.state = "unavailable";
  point.evidence.status.opening.state = "closed";
  expect(captureQuality(reply, now)[0]!.fields).toEqual({
    price: { eligible: 1, rawMissing: 0, unknownShown: 0 },
    availability: { eligible: 1, rawMissing: 0, unknownShown: 0 },
    opening: { eligible: 1, rawMissing: 0, unknownShown: 0 },
  });
  reply.fuelType = null;
  expect(captureQuality(reply, now)[0]!.fields.price.eligible).toBe(0);
});
it.each(["FR", "ES"] as const)(
  "does not promote invalid %s EV dynamics or prices to known",
  (country) => {
    const reply = structuredClone(sample) as NearbyResponse;
    reply.service = "charging";
    reply.results[0]!.country = country;
    const fields = captureQuality(reply, now).find(
      (row) => row.country === country,
    )!.fields;
    expect(fields.price).toMatchObject({ rawMissing: 0, unknownShown: 1 });
    expect(fields.availability).toMatchObject({ rawMissing: 0, unknownShown: 1 });
  },
);
it("aggregates unknown fields only once and preserves null empty denominators", async () => {
  const session = new BetaSession(
    () => 0,
    () => now,
  );
  session.setEnabled(true);
  const reply = structuredClone(sample) as NearbyResponse;
  reply.results[0]!.evidence.price = null;
  reply.results[0]!.evidence.status.opening.state = "unknown";
  const received = await observeSearch(async () => reply, session)(
    { latitude: 1, longitude: 2, service: "fuel" },
    new AbortController().signal,
  );
  session.expose(received);
  session.expose(received);
  expect(missingnessMetrics(session.getSnapshot(), "FR", "fuel").price).toMatchObject({
    eligible: 1,
    rawMissingRate: 1,
    unknownShownRate: 1,
  });
  expect(
    missingnessMetrics(session.getSnapshot(), "ES").price.unknownShownRate,
  ).toBeNull();
  session.setEnabled(false);
  expect(missingnessMetrics(session.getSnapshot()).opening.rawMissingRate).toBeNull();
});
it.each([
  ["live", 300_000, "live"],
  ["live", 300_001, "under1h"],
  ["recent", 3_599_999, "under1h"],
  ["recent", 3_600_000, "under24h"],
  ["recent", 86_399_999, "under24h"],
  ["recent", 86_400_000, "stale"],
  ["stale", 1, "stale"],
  ["unknown", 1, "unknown"],
  ["recent", -1, "unknown"],
] as const)("classifies %s at age %s as %s", (label, age, expected) => {
  expect(ageBucket(label, new Date(now - age).toISOString(), now)).toBe(expected);
});
it("keeps missing and invalid observation time unknown instead of using fetch time", () => {
  expect(ageBucket("live", null, now)).toBe("unknown");
  expect(ageBucket("recent", "bad", now)).toBe("unknown");
  expect(ageBucket("live", new Date(now).toISOString(), now, false)).toBe("under1h");
});
it("captures once, uses point country across borders, and leaves empty slices unknown", async () => {
  const session = new BetaSession(
    () => 0,
    () => now,
  );
  session.setEnabled(true);
  const reply = structuredClone(sample) as NearbyResponse;
  reply.results[0]!.evidence.source!.observedAt = null;
  reply.results[0]!.evidence.source!.fetchedAt = new Date(now).toISOString();
  const es = structuredClone(reply.results[0]!);
  es.country = "ES";
  es.evidence.source!.observedAt = new Date(now - 3_600_000).toISOString();
  reply.results.push(es);
  reply.resultCount = 2;
  const received = await observeSearch(async () => reply, session)(
    { latitude: 1, longitude: 2, service: "fuel" },
    new AbortController().signal,
  );
  expect(freshnessMetrics(session.getSnapshot()).total).toBe(0);
  session.expose(received);
  session.expose(received);
  expect(freshnessMetrics(session.getSnapshot())).toMatchObject({
    total: 2,
    counts: { unknown: 1, under24h: 1 },
    ratios: { unknown: 0.5, under24h: 0.5 },
  });
  expect(freshnessMetrics(session.getSnapshot(), "FR").counts.unknown).toBe(1);
  expect(
    freshnessMetrics(session.getSnapshot(), "ES", "charging").ratios.live,
  ).toBeNull();
});

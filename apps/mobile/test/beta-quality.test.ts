import { expect, it } from "vitest";
import { ageBucket, freshnessMetrics } from "../src/analytics/quality";
import { BetaSession, observeSearch } from "../src/analytics/beta";
import type { NearbyResponse } from "../src/api/client";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
const now = Date.parse("2026-09-07T12:00:00Z");
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

import { expect, it } from "vitest";
import { BetaSession, navigationMetrics, observeSearch } from "../src/analytics/beta";
import type { NearbyQuery, NearbyResponse } from "../src/api/client";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
const query: NearbyQuery = { latitude: 43, longitude: 1, service: "fuel" };
const response = () => structuredClone(sample) as NearbyResponse;
async function shown(session: BetaSession) {
  const reply = await observeSearch(async () => response(), session)(
    query,
    new AbortController().signal,
  );
  session.expose(reply);
  return reply;
}
it("requires opt-in and never invents a denominator", async () => {
  const session = new BetaSession();
  const reply = await shown(session);
  session.handoff(session.click(reply.results[0]!.id, reply), true);
  expect(navigationMetrics(session.getSnapshot()).clickRate).toBeNull();
  session.setEnabled(true);
  session.expose(reply);
  expect(session.getSnapshot().attempts).toHaveLength(0);
});
it("deduplicates searches, separates click from handoff, correlates detail selections", async () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const one = await shown(session),
    two = await shown(session);
  session.expose(one);
  session.handoff(session.click(one.results[0]!.id, one), false);
  session.select(two, two.results[0]!.id);
  session.handoff(session.click(two.results[0]!.id), true);
  session.handoff(session.click(two.results[0]!.id), true);
  expect(navigationMetrics(session.getSnapshot())).toMatchObject({
    exposedSearches: 2,
    clickedSearches: 2,
    handedOffSearches: 1,
    clickRate: 1,
    handoffRate: 0.5,
  });
  expect(JSON.stringify(session.getSnapshot())).not.toMatch(
    /latitude|longitude|pointId|requestId|Station|address/,
  );
});
it("rejects unexposed, unknown point and uncorrelated detail events", async () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const reply = await shown(session);
  session.handoff(session.click("unknown", reply), true);
  session.handoff(session.click(reply.results[0]!.id), true);
  expect(navigationMetrics(session.getSnapshot()).clickedSearches).toBe(0);
});
it("isolates revoked consent and late completions from a fresh session", () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const old = session.begin(query);
  session.setEnabled(false);
  session.setEnabled(true);
  const current = session.begin(query);
  const reply = response();
  session.finish(old, "success", reply);
  session.expose(reply);
  session.handoff(old, true);
  expect(session.getSnapshot().attempts).toMatchObject([
    { id: current, status: "pending", exposed: false },
  ]);
});
it("bounds attempts and reports incomplete windows", () => {
  const session = new BetaSession();
  session.setEnabled(true);
  for (let i = 0; i < 120; i++) session.begin(query);
  expect(session.getSnapshot().attempts).toHaveLength(100);
  expect(session.getSnapshot().discarded).toBe(20);
  expect(navigationMetrics(session.getSnapshot()).truncated).toBe(true);
});
it("ignores late aborted responses without changing the transport result", async () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const abort = new AbortController(),
    reply = response();
  const actual = await observeSearch(async () => {
    abort.abort();
    return reply;
  }, session)(query, abort.signal);
  expect(actual).toBe(reply);
  session.expose(reply);
  expect(session.getSnapshot().attempts[0]).toMatchObject({
    status: "cancelled",
    exposed: false,
  });
});

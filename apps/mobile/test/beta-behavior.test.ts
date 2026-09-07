import { expect, it } from "vitest";
import { BetaSession, behaviorMetrics, observeSearch } from "../src/analytics/beta";
import type { NearbyResponse } from "../src/api/client";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
async function shown(session: BetaSession) {
  const reply = await observeSearch(
    async () => structuredClone(sample) as NearbyResponse,
    session,
  )({ latitude: 1, longitude: 2, service: "fuel" }, new AbortController().signal);
  session.expose(reply);
  return reply;
}
it("records explicit transition directions and ignores same-sort and unobserved requests", async () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const reply = await shown(session);
  session.changeSort(reply, "nearest", "best");
  session.changeSort(reply, "best", "nearest");
  session.changeSort(reply, "nearest", "nearest");
  session.changeSort(null, "nearest", "best");
  expect(behaviorMetrics(session.getSnapshot())).toMatchObject({
    sortChanges: 2,
    transitions: { "nearest:best": 1, "best:nearest": 1 },
  });
});
it("never equates silence or switching searches with abandonment", async () => {
  const session = new BetaSession();
  session.setEnabled(true);
  await shown(session);
  const exited = await shown(session);
  session.leaveResults(exited);
  session.leaveResults(exited);
  const navigated = await shown(session);
  session.click(navigated.results[0]!.id, navigated);
  session.leaveResults(navigated);
  expect(behaviorMetrics(session.getSnapshot())).toMatchObject({
    exposedSearches: 3,
    explicitExitsWithoutNavigation: 1,
    unresolved: 1,
    explicitExitRate: 1 / 3,
    inferredAbandonments: null,
  });
  expect(
    behaviorMetrics(session.getSnapshot(), "charging").explicitExitRate,
  ).toBeNull();
});
it("clears the detail attribution when explicitly returning home", async () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const reply = await shown(session);
  session.select(reply, reply.results[0]!.id);
  session.leaveResults(reply);
  expect(session.click(reply.results[0]!.id)).toBeUndefined();
  session.setEnabled(false);
  expect(behaviorMetrics(session.getSnapshot()).sortChanges).toBe(0);
});

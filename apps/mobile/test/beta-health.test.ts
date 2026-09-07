import { expect, it } from "vitest";
import { BetaSession, observeSearch, searchHealthMetrics } from "../src/analytics/beta";
import { ApiFailure, type NearbyQuery, type NearbyResponse } from "../src/api/client";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
const query: NearbyQuery = { latitude: 1, longitude: 2, service: "fuel" };
it("keeps empty, failed, cancelled and pending denominators distinct", () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const response = structuredClone(sample) as NearbyResponse;
  session.finish(session.begin(query), "success", response);
  session.finish(session.begin(query), "success", {
    ...response,
    resultCount: 0,
    results: [],
  });
  session.finish(session.begin(query), "failure", undefined, "network");
  session.finish(session.begin(query), "cancelled");
  session.begin(query);
  expect(searchHealthMetrics(session.getSnapshot())).toMatchObject({
    attempted: 5,
    succeeded: 2,
    empty: 1,
    failed: 1,
    cancelled: 1,
    pending: 1,
    noResultRate: 0.5,
    failureRate: 1 / 3,
  });
  expect(searchHealthMetrics(session.getSnapshot(), "charging")).toMatchObject({
    attempted: 0,
    failureRate: null,
    noResultRate: null,
  });
});
it.each([
  [new ApiFailure("network"), "network"],
  [new ApiFailure("timeout"), "timeout"],
  [new ApiFailure("http", 429), "rateLimited"],
  [new ApiFailure("http", 503), "serverError"],
  [new ApiFailure("http", 404), "notFound"],
  [new ApiFailure("invalid_response"), "invalidResponse"],
  [new Error("private address and token"), "requestError"],
] as const)("classifies %s with safe reason %s", async (error, reason) => {
  const session = new BetaSession();
  session.setEnabled(true);
  const port = observeSearch(async () => {
    throw error;
  }, session);
  await expect(port(query, new AbortController().signal)).rejects.toBe(error);
  expect(searchHealthMetrics(session.getSnapshot()).failures[reason]).toBe(1);
  expect(JSON.stringify(session.getSnapshot())).not.toMatch(
    /private|address|token|message|stack/,
  );
});
it("counts retries as new attempts and cancellation once even after late failure", async () => {
  const session = new BetaSession();
  session.setEnabled(true);
  const abort = new AbortController();
  await expect(
    observeSearch(async () => {
      abort.abort();
      throw new ApiFailure("network");
    }, session)(query, abort.signal),
  ).rejects.toBeInstanceOf(ApiFailure);
  expect(searchHealthMetrics(session.getSnapshot())).toMatchObject({
    cancelled: 1,
    failed: 0,
    failureRate: null,
  });
  await observeSearch(async () => structuredClone(sample) as NearbyResponse, session)(
    query,
    new AbortController().signal,
  );
  expect(searchHealthMetrics(session.getSnapshot())).toMatchObject({
    attempted: 2,
    succeeded: 1,
    failureRate: 0,
  });
});

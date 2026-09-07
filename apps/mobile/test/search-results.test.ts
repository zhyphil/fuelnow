import { describe, expect, it, vi } from "vitest";
import sample from "../../../docs/api/examples/nearby-fuel-cheapest.json";
import { ApiFailure, createApiClient, type NearbyResponse } from "../src/api/client";
import { resolveMobileConfig } from "../src/config/environment";
import { SearchController, resultTitle, type SearchPort } from "../src/search/results";

const response = sample as NearbyResponse;
const query = {
  latitude: 43.6,
  longitude: 1.44,
  service: "fuel",
  sort: "nearest",
} as const;
function deferred() {
  let resolve!: (value: NearbyResponse) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<NearbyResponse>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe("list-first search lifecycle", () => {
  it("starts idle without searching, then loads actual API data without reordering", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(response)));
    const client = createApiClient(resolveMobileConfig(), fetcher);
    const controller = new SearchController(client.nearby);
    expect(controller.getSnapshot()).toEqual({ status: "idle" });
    expect(fetcher).not.toHaveBeenCalled();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    const pending = controller.run(query);
    expect(controller.getSnapshot()).toEqual({ status: "loading" });
    await pending;
    expect(controller.getSnapshot()).toEqual({ status: "ready", response });
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    controller.clear();
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it("aborts older queries and ignores their late successful result", async () => {
    const first = deferred();
    const second = deferred();
    const port = vi
      .fn<SearchPort>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const controller = new SearchController(port);
    const old = controller.run(query);
    const next = controller.run({ ...query, latitude: 41.3 });
    expect(port.mock.calls[0]![1].aborted).toBe(true);
    const newer = { ...response, requestId: "newer" };
    second.resolve(newer);
    await next;
    first.resolve(response);
    await old;
    expect(controller.getSnapshot()).toEqual({ status: "ready", response: newer });
  });
  it.each(["resolve", "reject"] as const)(
    "clears data and ignores a late %s after leaving or losing origin",
    async (exit) => {
      const request = deferred();
      const port = vi.fn<SearchPort>().mockReturnValue(request.promise);
      const controller = new SearchController(port);
      const pending = controller.run(query);
      controller.clear();
      expect(port.mock.calls[0]![1].aborted).toBe(true);
      if (exit === "resolve") request.resolve(response);
      else request.reject(new Error("private transport text"));
      await pending;
      expect(controller.getSnapshot()).toEqual({ status: "idle" });
    },
  );
  it("keeps empty data as a successful response with the server outcome", async () => {
    const empty: NearbyResponse = {
      ...response,
      results: [],
      resultCount: 0,
      outcome: {
        ...response.outcome,
        state: "empty",
        resultCount: 0,
        emptyReason: "no_service_points_in_radius",
      },
    };
    const controller = new SearchController(async () => empty);
    await controller.run(query);
    expect(controller.getSnapshot()).toEqual({ status: "ready", response: empty });
  });
  it.each([
    new ApiFailure("network"),
    new ApiFailure("timeout"),
    new ApiFailure("http", 429),
  ])("allows manual retry for %s without automatic retry", async (error) => {
    const port = vi
      .fn<SearchPort>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(response);
    const controller = new SearchController(port);
    await controller.run(query);
    expect(port).toHaveBeenCalledOnce();
    expect(controller.getSnapshot()).toEqual({ status: "error", retryable: true });
    await controller.run(query);
    expect(controller.getSnapshot().status).toBe("ready");
  });
  it.each([new ApiFailure("http", 400), new Error("secret coordinates")])(
    "does not expose raw error messages or suggest retry for %s",
    async (error) => {
      const controller = new SearchController(async () => {
        throw error;
      });
      await controller.run(query);
      expect(controller.getSnapshot()).toEqual({ status: "error", retryable: false });
    },
  );
  it("removes old results while refreshing", async () => {
    const pending = deferred();
    const port = vi
      .fn<SearchPort>()
      .mockResolvedValueOnce(response)
      .mockReturnValueOnce(pending.promise);
    const controller = new SearchController(port);
    await controller.run(query);
    const next = controller.run(query);
    expect(controller.getSnapshot()).toEqual({ status: "loading", refreshing: true });
    pending.resolve(response);
    await next;
  });
  it("uses name then brand then translated fallback, never a fabricated name", () => {
    const point = response.results[0]!;
    expect(resultTitle(point, "Unknown")).toBe(point.name);
    expect(resultTitle({ ...point, name: "  " }, "Unknown")).toBe(point.brand);
    expect(resultTitle({ ...point, name: null, brand: null }, "Unknown")).toBe(
      "Unknown",
    );
  });
});

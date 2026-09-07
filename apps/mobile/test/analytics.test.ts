import { afterEach, expect, it, vi } from "vitest";
import { SessionRecorder, type ProductEvent } from "../src/analytics/recorder";
afterEach(() => vi.useRealTimers());
it("is opt-in and strips arbitrary properties including location and addresses", () => {
  vi.useFakeTimers();
  const recorder = new SessionRecorder();
  const event = {
    type: "search_exposure",
    service: "fuel",
    resultCount: 5,
    latitude: 48,
    address: "private",
    url: "private",
  } as ProductEvent;
  recorder.record(event);
  expect(recorder.getSnapshot().events).toEqual([]);
  recorder.setEnabled(true);
  recorder.record(event);
  expect(recorder.getSnapshot().events).toEqual([
    { type: "search_exposure", service: "fuel", resultCount: 5 },
  ]);
  recorder.setEnabled(false);
  expect(recorder.getSnapshot().events).toEqual([]);
});
it("deduplicates exposures, bounds memory and expires the session", () => {
  vi.useFakeTimers();
  const recorder = new SessionRecorder();
  recorder.setEnabled(true);
  recorder.record({ type: "search_exposure" }, "request-1");
  recorder.record({ type: "search_exposure" }, "request-1");
  expect(recorder.getSnapshot().events).toHaveLength(1);
  for (let i = 0; i < 150; i++) recorder.record({ type: "navigation_click" });
  expect(recorder.getSnapshot().events).toHaveLength(100);
  vi.advanceTimersByTime(15 * 60_000);
  expect(recorder.getSnapshot()).toEqual({ enabled: false, events: [] });
});

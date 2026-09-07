import { afterEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => ({ watch: vi.fn() }));
vi.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  watchPositionAsync: native.watch,
  getForegroundPermissionsAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
  hasServicesEnabledAsync: vi.fn(),
}));
import { expoLocation } from "../src/location/expo";
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("one-fix native adapter", () => {
  it("removes a subscription even if its first fix arrives before registration resolves", async () => {
    const remove = vi.fn();
    native.watch.mockImplementation(async (_options, callback) => {
      callback({ coords: { latitude: 43, longitude: 1, accuracy: 300 } });
      return { remove };
    });
    expect(await expoLocation.position(new AbortController().signal)).toEqual({
      latitude: 43,
      longitude: 1,
      accuracyMetres: 300,
    });
    await Promise.resolve();
    expect(remove).toHaveBeenCalledOnce();
  });
  it.each(["timeout", "cancel"] as const)(
    "cleans up a pending listener on %s",
    async (action) => {
      vi.useFakeTimers();
      const remove = vi.fn();
      native.watch.mockResolvedValue({ remove });
      const controller = new AbortController();
      const pending = expoLocation.position(controller.signal);
      const assertion = expect(pending).rejects.toMatchObject({
        reason: action === "timeout" ? "timeout" : "unavailable",
      });
      await Promise.resolve();
      if (action === "timeout") await vi.advanceTimersByTimeAsync(10_000);
      else controller.abort();
      await assertion;
      expect(remove).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});

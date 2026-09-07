import { describe, expect, it, vi } from "vitest";
import {
  LocationController,
  LocationError,
  type LocationPort,
} from "../src/location/controller";

function port(overrides: Partial<LocationPort> = {}): LocationPort {
  return {
    permission: vi.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
    requestPermission: vi.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
    servicesEnabled: vi.fn().mockResolvedValue(true),
    position: vi
      .fn()
      .mockResolvedValue({ latitude: 43.6, longitude: 1.44, accuracyMetres: 500 }),
    ...overrides,
  };
}

describe("foreground location session", () => {
  it("does not access location on construction and accepts approximate location after a tap", async () => {
    const provider = port();
    const controller = new LocationController(provider);
    expect(controller.getSnapshot()).toEqual({ status: "idle" });
    expect(provider.permission).not.toHaveBeenCalled();
    await controller.request();
    expect(provider.requestPermission).toHaveBeenCalledOnce();
    expect(controller.getSnapshot()).toMatchObject({
      status: "ready",
      origin: { source: "gps", accuracyMetres: 500 },
    });
  });
  it("uses an existing foreground grant without prompting again", async () => {
    const provider = port({
      permission: vi.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
    });
    await new LocationController(provider).request();
    expect(provider.requestPermission).not.toHaveBeenCalled();
  });
  it.each([true, false])("handles denial with canAskAgain=%s", async (canAskAgain) => {
    const provider = port({
      requestPermission: vi.fn().mockResolvedValue({ granted: false, canAskAgain }),
    });
    const controller = new LocationController(provider);
    await controller.request();
    expect(controller.getSnapshot().status).toBe(canAskAgain ? "denied" : "blocked");
    expect(provider.position).not.toHaveBeenCalled();
  });
  it("does not reprompt a permanently blocked permission", async () => {
    const provider = port({
      permission: vi.fn().mockResolvedValue({ granted: false, canAskAgain: false }),
    });
    const controller = new LocationController(provider);
    await controller.request();
    expect(controller.getSnapshot().status).toBe("blocked");
    expect(provider.requestPermission).not.toHaveBeenCalled();
  });
  it("does not read position when system location services are off", async () => {
    const provider = port({ servicesEnabled: vi.fn().mockResolvedValue(false) });
    const controller = new LocationController(provider);
    await controller.request();
    expect(controller.getSnapshot().status).toBe("services_disabled");
    expect(provider.position).not.toHaveBeenCalled();
  });
  it.each([new LocationError("timeout"), new Error("private native error")])(
    "returns safe errors",
    async (error) => {
      const controller = new LocationController(
        port({ position: vi.fn().mockRejectedValue(error) }),
      );
      await controller.request();
      expect(controller.getSnapshot()).toEqual({
        status: error instanceof LocationError ? "timeout" : "unavailable",
      });
    },
  );
  it("ignores an old permission result after cancellation and prevents duplicate requests", async () => {
    let finish!: (value: { granted: boolean; canAskAgain: boolean }) => void;
    const provider = port({
      permission: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    });
    const controller = new LocationController(provider);
    const pending = controller.request();
    await controller.request();
    expect(provider.permission).toHaveBeenCalledOnce();
    controller.clear();
    finish({ granted: true, canAskAgain: true });
    await pending;
    expect(controller.getSnapshot()).toEqual({ status: "idle" });
    expect(provider.position).not.toHaveBeenCalled();
  });
  it("clears coordinates from session state", async () => {
    const controller = new LocationController(port());
    await controller.request();
    controller.clear();
    expect(controller.getSnapshot()).toEqual({ status: "idle" });
  });
  it.each([NaN, 91])("rejects invalid latitude %s", async (latitude) => {
    const controller = new LocationController(
      port({
        position: vi
          .fn()
          .mockResolvedValue({ latitude, longitude: 1, accuracyMetres: 10 }),
      }),
    );
    await controller.request();
    expect(controller.getSnapshot().status).toBe("unavailable");
  });
});

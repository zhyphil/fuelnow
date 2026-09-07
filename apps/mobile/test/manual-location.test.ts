import { describe, expect, it, vi } from "vitest";
import {
  findManualPlaces,
  manualPlaces,
  parseManualCoordinates,
} from "../src/location/manual";
import { LocationController } from "../src/location/controller";

describe("manual origins", () => {
  it("offers all eight reviewed anchors and filters locally", () => {
    expect(manualPlaces).toHaveLength(8);
    expect(findManualPlaces("  madrid ")[0]).toMatchObject({
      latitude: 40.4168,
      longitude: -3.7038,
    });
    expect(findManualPlaces("unlisted town")).toEqual([]);
  });
  it("supports signed coordinates and French/Spanish decimal commas", () => {
    expect(parseManualCoordinates(" 40,4168 ", "-3,7038")).toEqual({
      latitude: 40.4168,
      longitude: -3.7038,
    });
    expect(parseManualCoordinates("0", "0")).toEqual({ latitude: 0, longitude: 0 });
  });
  it.each([
    ["", "0"],
    ["90.1", "0"],
    ["0", "181"],
    ["1e1", "2"],
    ["NaN", "0"],
    ["1.2.3", "2"],
    ["0x12", "2"],
  ])("rejects invalid coordinate text %s,%s", (lat, lon) => {
    expect(parseManualCoordinates(lat, lon)).toBeNull();
  });
  it("selects manually without permission and prevents a late GPS request replacing it", async () => {
    let permission!: (value: { granted: boolean; canAskAgain: boolean }) => void;
    const provider = {
      permission: vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            permission = resolve;
          }),
      ),
      requestPermission: vi.fn(),
      servicesEnabled: vi.fn(),
      position: vi.fn(),
    };
    const controller = new LocationController(provider);
    controller.selectManual({ latitude: 40, longitude: -3 });
    expect(provider.permission).not.toHaveBeenCalled();
    const pending = controller.request();
    controller.selectManual({ latitude: 43, longitude: 1, label: "Toulouse" });
    permission({ granted: true, canAskAgain: true });
    await pending;
    expect(controller.getSnapshot()).toEqual({
      status: "ready",
      origin: {
        latitude: 43,
        longitude: 1,
        label: "Toulouse",
        accuracyMetres: null,
        source: "manual",
      },
    });
    expect(provider.position).not.toHaveBeenCalled();
  });
});

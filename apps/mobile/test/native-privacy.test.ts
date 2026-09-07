import { describe, expect, it } from "vitest";
import { auditNativePrivacy } from "../src/config/nativePrivacy";

function fixture() {
  return {
    _internal: {
      modResults: {
        android: {
          manifest: {
            manifest: {
              "uses-permission": [
                "INTERNET",
                "ACCESS_COARSE_LOCATION",
                "ACCESS_FINE_LOCATION",
              ].map((name) => ({
                $: { "android:name": `android.permission.${name}` },
              })),
              application: [{ $: { "android:allowBackup": "false" } }],
            },
          },
        },
        ios: {
          infoPlist: {
            NSLocationWhenInUseUsageDescription: "Find nearby services",
          } as Record<string, unknown>,
        },
      },
    },
  };
}
describe("native privacy configuration gate", () => {
  it("accepts only foreground location and network with backup disabled", () => {
    expect(() => auditNativePrivacy(fixture())).not.toThrow();
  });
  it.each([
    "CAMERA",
    "READ_EXTERNAL_STORAGE",
    "ACCESS_BACKGROUND_LOCATION",
    "SYSTEM_ALERT_WINDOW",
  ])("rejects added %s permission", (name) => {
    const value = fixture();
    value._internal.modResults.android.manifest.manifest["uses-permission"].push({
      $: { "android:name": `android.permission.${name}` },
    });
    expect(() => auditNativePrivacy(value)).toThrow();
  });
  it("accepts manifest merge removal markers", () => {
    const value = fixture();
    const permissions: unknown[] =
      value._internal.modResults.android.manifest.manifest["uses-permission"];
    permissions.push({
      $: { "android:name": "android.permission.CAMERA", "tools:node": "remove" },
    });
    expect(() => auditNativePrivacy(value)).not.toThrow();
  });
  it("rejects backup re-enablement", () => {
    const value = fixture();
    value._internal.modResults.android.manifest.manifest.application[0]!.$[
      "android:allowBackup"
    ] = "true";
    expect(() => auditNativePrivacy(value)).toThrow();
  });
  it.each([
    "NSLocationAlwaysUsageDescription",
    "NSCameraUsageDescription",
    "NSUserTrackingUsageDescription",
  ])("rejects added iOS %s", (key) => {
    const value = fixture();
    value._internal.modResults.ios.infoPlist[key] = "Unexpected";
    expect(() => auditNativePrivacy(value)).toThrow();
  });
  it("rejects background modes and malformed snapshots", () => {
    const value = fixture();
    value._internal.modResults.ios.infoPlist.UIBackgroundModes = ["location"];
    expect(() => auditNativePrivacy(value)).toThrow();
    for (const invalid of [null, {}, [], { _internal: {} }])
      expect(() => auditNativePrivacy(invalid)).toThrow();
  });
});

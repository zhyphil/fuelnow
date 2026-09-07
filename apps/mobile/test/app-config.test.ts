import { afterEach, describe, expect, it, vi } from "vitest";
import { AndroidConfig, type ModConfig } from "expo/config-plugins";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

async function config(environment: string | undefined, key?: string) {
  vi.stubEnv("EXPO_PUBLIC_APP_ENV", environment);
  vi.stubEnv("GOOGLE_MAPS_ANDROID_API_KEY", key);
  vi.resetModules();
  return (await import("../app.config")).default;
}

describe("native local test identity", () => {
  it("isolates the local APK without enabling maps when no key exists", async () => {
    const value = await config("test");
    expect(value.name).toBe("Fuel Now Test");
    expect(value.scheme).toBe("fuelnow-test");
    expect(value.android?.package).toBe("com.fuelnow.localtest");
    expect(value.android?.allowBackup).toBe(false);
    expect(value.extra?.androidMapsConfigured).toBe(false);
    for (const permission of [
      "SYSTEM_ALERT_WINDOW",
      "WAKE_LOCK",
      "RECEIVE_BOOT_COMPLETED",
      "FOREGROUND_SERVICE",
    ]) {
      expect(value.android?.blockedPermissions).toContain(
        `android.permission.${permission}`,
      );
    }
  });

  it.each([undefined, "development", "production"])(
    "does not assign test identity to %s builds",
    async (environment) => {
      const value = await config(environment);
      expect(value.name).toBe("Fuel Now");
      expect(value.scheme).toBe("fuelnow");
      expect(value.android?.package).toBeUndefined();
    },
  );

  it("passes an explicitly supplied key only to the native map plugin", async () => {
    const value = await config("test", "test-only-placeholder");
    expect(value.plugins).toContainEqual([
      "react-native-maps",
      { androidGoogleMapsApiKey: "test-only-placeholder" },
    ]);
    expect(value.extra).toEqual({ androidMapsConfigured: true });
  });

  it("removes debug overlay permission while preserving unrelated manifest data", async () => {
    const value = await config("test");
    const mod = (value as typeof value & { mods: ModConfig }).mods.android!.dangerous!;
    const read = vi
      .spyOn(AndroidConfig.Manifest, "readAndroidManifestAsync")
      .mockImplementation(async () => ({
        manifest: {
          $: { "xmlns:android": "http://schemas.android.com/apk/res/android" },
          queries: [],
          "uses-permission": [
            { $: { "android:name": "android.permission.SYSTEM_ALERT_WINDOW" } },
            { $: { "android:name": "android.permission.INTERNET" } },
          ],
          application: [{ $: { "android:name": ".MainApplication" } }],
        },
      }));
    const write = vi
      .spyOn(AndroidConfig.Manifest, "writeAndroidManifestAsync")
      .mockResolvedValue();
    await mod({
      ...value,
      modRequest: { platformProjectRoot: "/test/android" },
    } as Parameters<typeof mod>[0]);
    expect(read.mock.calls.map(([path]) => path)).toEqual([
      "/test/android/app/src/debug/AndroidManifest.xml",
      "/test/android/app/src/debugOptimized/AndroidManifest.xml",
    ]);
    expect(write).toHaveBeenCalledTimes(2);
    for (const [, output] of write.mock.calls) {
      expect(output.manifest["uses-permission"]).toEqual([
        { $: { "android:name": "android.permission.INTERNET" } },
      ]);
      expect(output.manifest.application?.[0]?.$["android:name"]).toBe(
        ".MainApplication",
      );
    }
  });
});

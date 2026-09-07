import type { ExpoConfig } from "expo/config";
import { AndroidConfig, withDangerousMod } from "expo/config-plugins";
import { join } from "node:path";

// Keep local APK identity separate from the future production application.
const localTest = process.env.EXPO_PUBLIC_APP_ENV === "test";

// Debug manifests have higher merge priority than android.blockedPermissions.
// Remove the template overlay permission from both local debug variants.
function withLocalDebugPrivacy(value: ExpoConfig): ExpoConfig {
  return withDangerousMod(value, [
    "android",
    async (mod) => {
      for (const variant of ["debug", "debugOptimized"]) {
        const path = join(
          mod.modRequest.platformProjectRoot,
          "app/src",
          variant,
          "AndroidManifest.xml",
        );
        const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(path);
        manifest.manifest["uses-permission"] = (
          manifest.manifest["uses-permission"] ?? []
        ).filter(
          (permission) =>
            permission.$["android:name"] !== "android.permission.SYSTEM_ALERT_WINDOW",
        );
        await AndroidConfig.Manifest.writeAndroidManifestAsync(path, manifest);
      }
      return mod;
    },
  ]);
}

const config: ExpoConfig = {
  name: localTest ? "Fuel Now Test" : "Fuel Now",
  slug: "fuel-now",
  version: "0.1.0",
  scheme: localTest ? "fuelnow-test" : "fuelnow",
  orientation: "portrait",
  userInterfaceStyle: "light",
  platforms: ["ios", "android"],
  locales: {
    en: "./locales/en.json",
    fr: "./locales/fr.json",
    es: "./locales/es.json",
  },
  plugins: [
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
    "expo-router",
    ["expo-localization", { supportedLocales: ["en", "fr", "es"] }],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Fuel Now uses your location to find nearby services and estimate routes without saving a location history.",
        locationAlwaysPermission: false,
        motionUsagePermission: false,
        isAndroidMotionActivityEnabled: false,
        locationAlwaysAndWhenInUsePermission: false,
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
  ],
  ios: { supportsTablet: false },
  android: {
    ...(localTest ? { package: "com.fuelnow.localtest" } : {}),
    allowBackup: false,
    blockedPermissions: [
      // These transitive WorkManager capabilities are unused by this app.
      "android.permission.WAKE_LOCK",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.VIBRATE",
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.FOREGROUND_SERVICE_LOCATION",
      "android.permission.ACTIVITY_RECOGNITION",
    ],
  },
  extra: { androidMapsConfigured: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY) },
};

export default localTest ? withLocalDebugPrivacy(config) : config;

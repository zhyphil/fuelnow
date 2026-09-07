import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Fuel Now",
  slug: "fuel-now",
  version: "0.1.0",
  scheme: "fuelnow",
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
    allowBackup: false,
    blockedPermissions: [
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

export default config;

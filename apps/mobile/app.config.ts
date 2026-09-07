import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Fuel Now",
  slug: "fuel-now",
  version: "0.1.0",
  scheme: "fuelnow",
  orientation: "portrait",
  userInterfaceStyle: "light",
  platforms: ["ios", "android"],
  plugins: ["expo-router"],
  ios: { supportsTablet: false },
  android: {},
};

export default config;

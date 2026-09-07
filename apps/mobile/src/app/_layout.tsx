import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../config/runtime";
import { LocationProvider } from "../location/context";
import { LanguageProvider } from "../i18n/context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LanguageProvider>
        <LocationProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </LocationProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

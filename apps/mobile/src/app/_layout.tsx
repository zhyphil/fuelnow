import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../config/runtime";
import { LocationProvider } from "../location/context";
import { LanguageProvider } from "../i18n/context";
import { SearchProvider } from "../search/context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LanguageProvider>
        <LocationProvider>
          <SearchProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </SearchProvider>
        </LocationProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

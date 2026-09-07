import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../config/runtime";
import { LocationProvider } from "../location/context";
import { LanguageProvider } from "../i18n/context";
import { SearchProvider } from "../search/context";
import { FreshnessClock } from "../components/FreshnessClock";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LanguageProvider>
        <LocationProvider>
          <SearchProvider>
            <FreshnessClock>
              <Stack screenOptions={{ headerShown: false }} />
            </FreshnessClock>
          </SearchProvider>
        </LocationProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { LanguagePreferences, deviceLanguage } from "./preferences";
import { getMessages } from "./catalog";

const Context = createContext<LanguagePreferences | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preferences] = useState(
    () =>
      new LanguagePreferences(AsyncStorage, () =>
        deviceLanguage(getLocales().map((locale) => locale.languageTag)),
      ),
  );
  useEffect(() => {
    void preferences.initialize();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") preferences.refreshSystem();
    });
    return () => subscription.remove();
  }, [preferences]);
  return <Context.Provider value={preferences}>{children}</Context.Provider>;
}
export function useLanguage() {
  const preferences = useContext(Context);
  if (!preferences) throw new Error("LanguageProvider is required");
  const state = useSyncExternalStore(preferences.subscribe, preferences.getSnapshot);
  return {
    ...state,
    copy: getMessages(state.language),
    selectLanguage: preferences.select,
  };
}

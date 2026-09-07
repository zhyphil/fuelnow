import { useRef, useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { useLanguage } from "../i18n/context";
import {
  navigationAllowed,
  openNavigation,
  type NavigationProvider,
  type NavigationTarget,
} from "../search/navigation";
import { ActionButton } from "./ActionButton";
export function NavigationButtons({ target }: { target: NavigationTarget }) {
  const {
    copy: { evidence: copy },
  } = useLanguage();
  const [failed, setFailed] = useState(false),
    [busy, setBusy] = useState(false);
  const active = useRef(false);
  const go = async (provider: NavigationProvider) => {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setFailed(false);
    const opened = await openNavigation(target, provider, Linking.openURL);
    setFailed(!opened);
    setBusy(false);
    active.current = false;
  };
  return (
    <View style={{ gap: 8 }}>
      <ActionButton
        label={`${copy.navigate} · ${Platform.OS === "ios" ? "Apple Maps" : "Google Maps"}`}
        disabled={busy || !navigationAllowed(target)}
        onPress={() => {
          void go(Platform.OS === "ios" ? "apple" : "google");
        }}
      />
      {Platform.OS === "ios" && (
        <ActionButton
          secondary
          label="Google Maps"
          disabled={busy || !navigationAllowed(target)}
          onPress={() => {
            void go("google");
          }}
        />
      )}
      {!navigationAllowed(target) && <Text>{copy.navigationDisabled}</Text>}
      {failed && <Text accessibilityRole="alert">{copy.navigationFailed}</Text>}
    </View>
  );
}

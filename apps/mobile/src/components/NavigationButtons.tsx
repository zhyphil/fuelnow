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
import { analytics } from "../analytics/recorder";
import type { NearbyResponse } from "../api/client";
export function NavigationButtons({
  target,
  response,
}: {
  target: NavigationTarget;
  response?: NearbyResponse | undefined;
}) {
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
    analytics.record({ type: "navigation_click", pointId: target.id });
    const attempt = analytics.beta.click(target.id, response);
    const opened = await openNavigation(target, provider, Linking.openURL);
    analytics.beta.handoff(attempt, opened);
    analytics.record({
      type: "navigation_handoff",
      pointId: target.id,
      success: opened,
    });
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
      {!navigationAllowed(target) && (
        <Text>
          {target.synthetic ? copy.demoNavigationDisabled : copy.navigationDisabled}
        </Text>
      )}
      {failed && <Text accessibilityRole="alert">{copy.navigationFailed}</Text>}
    </View>
  );
}

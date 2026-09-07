import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { analytics } from "../analytics/recorder";
import { useLanguage } from "../i18n/context";
import { ActionButton } from "./ActionButton";
export function DiagnosticsPanel() {
  const state = useSyncExternalStore(analytics.subscribe, analytics.getSnapshot);
  const {
    copy: { evidence: copy },
  } = useLanguage();
  return (
    <View style={{ gap: 8 }}>
      <Text>{copy.diagnosticsNotice}</Text>
      <ActionButton
        secondary
        label={state.enabled ? copy.diagnosticsOff : copy.diagnosticsOn}
        onPress={() => analytics.setEnabled(!state.enabled)}
      />
      {state.enabled && (
        <Text accessibilityLiveRegion="polite">
          {copy.diagnosticsCount}: {state.events.length}
        </Text>
      )}
    </View>
  );
}

import { useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { useLocation } from "../location/context";
import { locationMessages } from "../content/location";
import { ActionButton } from "./ActionButton";

export function LocationPanel() {
  const { state, request, clear } = useLocation();
  const [settingsFailed, setSettingsFailed] = useState(false);
  const copy = locationMessages.en;
  return (
    <View style={styles.panel}>
      <Text style={styles.explanation}>{copy.explanation}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {settingsFailed ? copy.unavailable : copy[state.status]}
      </Text>
      {state.status === "ready" &&
        (state.origin.accuracyMetres === null || state.origin.accuracyMetres > 100) && (
          <Text style={styles.status}>{copy.approximate}</Text>
        )}
      {state.status === "requesting" ? (
        <>
          <ActivityIndicator color="#173E32" />
          <ActionButton secondary label={copy.cancel} onPress={clear} />
        </>
      ) : (
        <ActionButton
          label={state.status === "idle" ? copy.useLocation : copy.retry}
          onPress={() => {
            setSettingsFailed(false);
            void request();
          }}
        />
      )}
      {(state.status === "blocked" || state.status === "services_disabled") && (
        <ActionButton
          secondary
          label={copy.settings}
          onPress={() => {
            void Linking.openSettings().catch(() => setSettingsFailed(true));
          }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 12, paddingVertical: 24 },
  explanation: { color: "#4F5D54", fontSize: 14, lineHeight: 21 },
  status: { color: "#173E32", fontSize: 14, lineHeight: 21 },
});

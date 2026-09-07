import { useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { useLocation } from "../location/context";
import { useLanguage } from "../i18n/context";
import { ActionButton } from "./ActionButton";
import { ManualLocation } from "./ManualLocation";

export function LocationPanel() {
  const { state, request, clear } = useLocation();
  const [settingsFailed, setSettingsFailed] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const {
    copy: { location: copy, manual },
  } = useLanguage();
  return (
    <View style={styles.panel}>
      <Text style={styles.explanation}>{copy.explanation}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {settingsFailed ? copy.unavailable : copy[state.status]}
      </Text>
      {state.status === "ready" && state.origin.source === "manual" && (
        <Text style={styles.status}>
          {manual.selected}: {state.origin.label ?? manual.custom}
        </Text>
      )}
      {state.status === "ready" &&
        state.origin.source === "gps" &&
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
      <ActionButton
        secondary
        label={manual.choose}
        onPress={() => {
          if (state.status === "requesting") clear();
          setManualOpen(true);
        }}
      />
      {manualOpen && <ManualLocation onClose={() => setManualOpen(false)} />}
    </View>
  );
}
const styles = StyleSheet.create({
  panel: { gap: 12, paddingVertical: 24 },
  explanation: { color: "#4F5D54", fontSize: 14, lineHeight: 21 },
  status: { color: "#173E32", fontSize: 14, lineHeight: 21 },
});

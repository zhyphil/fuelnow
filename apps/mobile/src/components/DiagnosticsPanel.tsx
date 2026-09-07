import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { analytics } from "../analytics/recorder";
import { decisionMetrics, navigationMetrics } from "../analytics/beta";
import { betaCopy } from "../content/beta";
import { useLanguage } from "../i18n/context";
import { ActionButton } from "./ActionButton";
export function DiagnosticsPanel() {
  const state = useSyncExternalStore(analytics.subscribe, analytics.getSnapshot);
  const beta = useSyncExternalStore(
    analytics.beta.subscribe,
    analytics.beta.getSnapshot,
  );
  const metrics = navigationMetrics(beta);
  const timing = decisionMetrics(beta);
  const {
    language,
    copy: { evidence: copy },
  } = useLanguage();
  const local = betaCopy[language];
  const percent = (value: number | null) =>
    value === null ? local.unknown : `${(value * 100).toFixed(1)}%`;
  return (
    <View style={{ gap: 8 }}>
      <Text>{copy.diagnosticsNotice}</Text>
      <ActionButton
        secondary
        label={state.enabled ? copy.diagnosticsOff : copy.diagnosticsOn}
        onPress={() => analytics.setEnabled(!state.enabled)}
      />
      {state.enabled && (
        <View>
          <Text>{local.title}</Text>
          <Text>
            {local.decision}:{" "}
            {timing.medianMs === null ? local.unknown : `${timing.medianMs} ms`} · n=
            {timing.samples}
          </Text>
          <Text>
            {local.exposed}: {metrics.exposedSearches}
          </Text>
          <Text>
            {local.clicks}: {percent(metrics.clickRate)}
          </Text>
          <Text>
            {local.handoffs}: {percent(metrics.handoffRate)}
          </Text>
          {metrics.truncated && <Text>{local.truncated}</Text>}
          <Text accessibilityLiveRegion="polite">
            {copy.diagnosticsCount}: {state.events.length}
          </Text>
        </View>
      )}
    </View>
  );
}

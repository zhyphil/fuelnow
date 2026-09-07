import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { analytics } from "../analytics/recorder";
import {
  behaviorMetrics,
  decisionMetrics,
  navigationMetrics,
  searchHealthMetrics,
} from "../analytics/beta";
import { betaCopy } from "../content/beta";
import {
  freshnessBuckets,
  freshnessMetrics,
  missingnessMetrics,
  qualityFields,
} from "../analytics/quality";
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
  const health = searchHealthMetrics(beta);
  const behavior = behaviorMetrics(beta);
  const freshness = freshnessMetrics(beta);
  const missing = missingnessMetrics(beta);
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
            {local.sortChanges}: {behavior.sortChanges}
          </Text>
          <Text>
            {local.exits}: {behavior.explicitExitsWithoutNavigation} ·{" "}
            {local.unresolved}: {behavior.unresolved}
          </Text>
          <Text>{local.missing}</Text>
          {qualityFields.map((field) => (
            <Text key={field}>
              {local[field]}: {percent(missing[field].unknownShownRate)} (
              {missing[field].unknownShown}/{missing[field].eligible})
            </Text>
          ))}
          <Text>
            {local.freshness} · n={freshness.total}
          </Text>
          {freshnessBuckets.map((bucket) => (
            <Text key={bucket}>
              {bucket === "unknown" ? local.unknownAge : local[bucket]}:{" "}
              {percent(freshness.ratios[bucket])}
            </Text>
          ))}
          <Text>
            {local.empty}: {percent(health.noResultRate)} ({health.empty}/
            {health.succeeded})
          </Text>
          <Text>
            {local.failure}: {percent(health.failureRate)} ({health.failed}/
            {health.succeeded + health.failed})
          </Text>
          <Text>
            {local.cancelled}: {health.cancelled} · {local.pending}: {health.pending}
          </Text>
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

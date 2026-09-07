import { Linking, Text, View } from "react-native";
import { useState, type ReactNode } from "react";
import { ActionButton } from "./ActionButton";
import { useLanguage } from "../i18n/context";
import { evidenceWarnings } from "../search/freshness";
import { useFreshnessClock } from "./FreshnessClock";
import {
  openSourceNotice,
  sourceNotices,
  sourcePageCopy,
} from "../content/sourceNotices";
import {
  statusRows,
  provenanceRows,
  fuelRows,
  chargingRows,
  airRows,
  washRows,
  type Evidence,
} from "../search/evidence";
export function EvidenceSummary({
  evidence,
  country,
  compact = false,
  actions,
}: {
  evidence: Evidence;
  country?: "FR" | "ES";
  compact?: boolean;
  actions?: ReactNode;
}) {
  const { language, copy } = useLanguage();
  const now = useFreshnessClock();
  const [expanded, setExpanded] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const notice = sourceNotices.find((source) => source.id === evidence.source?.id);
  const rows = [
    ...statusRows(evidence, language, country, now),
    ...fuelRows(evidence, language),
    ...chargingRows(evidence, country, language, now),
    ...airRows(evidence, language),
    ...washRows(evidence, language),
    ...provenanceRows(evidence, language),
  ];
  return (
    <View style={{ gap: 6 }}>
      {evidence.source && (
        <Text
          accessibilityRole={notice ? "link" : undefined}
          onPress={
            notice
              ? () => {
                  void openSourceNotice(notice.licenceUrl, Linking.openURL).then(
                    (opened) => setLinkFailed(!opened),
                  );
                }
              : undefined
          }
          style={{
            color: "#263E32",
            fontSize: 14,
            lineHeight: 21,
            textDecorationLine: notice ? "underline" : "none",
          }}
        >
          {evidence.source.attributionText}
        </Text>
      )}
      {linkFailed && (
        <Text accessibilityRole="alert">{sourcePageCopy[language].linkFailure}</Text>
      )}
      {(compact ? rows.slice(0, 3) : rows).map((row) => (
        <Text
          key={row.label}
          style={{ color: "#263E32", fontSize: 16, lineHeight: 23 }}
        >
          {row.label}: {row.value}
        </Text>
      ))}
      {actions}
      {compact && (
        <Text style={{ color: "#4F5D54", fontSize: 15 }}>
          {copy.evidence[evidence.freshness]} · {copy.evidence.confidence}:{" "}
          {copy.evidence[evidence.confidence.level]}
        </Text>
      )}
      {evidenceWarnings(evidence, now).map((warning) => (
        <Text
          key={warning}
          style={{ color: "#5B431D", backgroundColor: "#F5E8CD", padding: 8 }}
        >
          {copy.evidence[warning]}
        </Text>
      ))}
      {compact && (
        <ActionButton
          secondary
          expanded={expanded}
          label={expanded ? copy.evidence.lessEvidence : copy.evidence.moreEvidence}
          onPress={() => setExpanded(!expanded)}
        />
      )}
      {compact &&
        expanded &&
        rows.slice(3).map((row) => (
          <Text
            key={row.label}
            style={{ fontSize: 16, color: "#263E32", lineHeight: 23 }}
          >
            {row.label}: {row.value}
          </Text>
        ))}
    </View>
  );
}

import { Text, View } from "react-native";
import { useLanguage } from "../i18n/context";
import { evidenceWarnings } from "../search/freshness";
import { useFreshnessClock } from "./FreshnessClock";
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
}: {
  evidence: Evidence;
  country?: "FR" | "ES";
}) {
  const { language, copy } = useLanguage();
  const now = useFreshnessClock();
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
      {evidenceWarnings(evidence, now).map((warning) => (
        <Text
          key={warning}
          style={{ color: "#5B431D", backgroundColor: "#F5E8CD", padding: 8 }}
        >
          {copy.evidence[warning]}
        </Text>
      ))}
      {rows.map((row) => (
        <Text key={row.label}>
          {row.label}: {row.value}
        </Text>
      ))}
    </View>
  );
}

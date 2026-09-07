import { Text, View } from "react-native";
import { useLanguage } from "../i18n/context";
import {
  statusRows,
  provenanceRows,
  fuelRows,
  chargingRows,
  type Evidence,
} from "../search/evidence";
export function EvidenceSummary({
  evidence,
  country,
}: {
  evidence: Evidence;
  country?: "FR" | "ES";
}) {
  const { language } = useLanguage();
  const rows = [
    ...statusRows(evidence, language, country),
    ...fuelRows(evidence, language),
    ...chargingRows(evidence, country, language),
    ...provenanceRows(evidence, language),
  ];
  return (
    <View style={{ gap: 6 }}>
      {rows.map((row) => (
        <Text key={row.label}>
          {row.label}: {row.value}
        </Text>
      ))}
    </View>
  );
}

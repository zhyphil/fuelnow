import { Text, View } from "react-native";
import { useLanguage } from "../i18n/context";
import { statusRows, provenanceRows, type Evidence } from "../search/evidence";
export function EvidenceSummary({ evidence }: { evidence: Evidence }) {
  const { language } = useLanguage();
  const rows = [
    ...statusRows(evidence, language),
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

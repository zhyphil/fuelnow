import { Text, View } from "react-native";
import { useLanguage } from "../i18n/context";
import type { NearbyPoint } from "../search/presentation";
import { recommendationRows } from "../search/recommendations";
export function RecommendationSummary({
  recommendation,
}: {
  recommendation: NearbyPoint["recommendation"];
}) {
  const { language, copy } = useLanguage();
  if (!recommendation) return null;
  return (
    <View style={{ gap: 6 }}>
      <Text accessibilityRole="header" style={{ fontWeight: "700", color: "#173E32" }}>
        {copy.results.best}
      </Text>
      {recommendationRows(recommendation, language).map((reason) => (
        <Text
          key={reason.code}
          style={{ color: reason.kind === "limitation" ? "#5B431D" : "#173E32" }}
        >
          {reason.text}
        </Text>
      ))}
    </View>
  );
}

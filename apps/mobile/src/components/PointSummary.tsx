import { StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../i18n/context";
import { distance, journey, type NearbyPoint } from "../search/presentation";
export function PointSummary({ point }: { point: NearbyPoint }) {
  const {
    language,
    copy: { point: copy },
  } = useLanguage();
  const trip = journey(point);
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.text}>{point.address?.trim() || copy.addressUnknown}</Text>
      <Text style={styles.text}>
        {copy[trip.basis]}: {distance(trip.distance, language) ?? copy.unknown}
      </Text>
      <Text style={styles.text}>
        {copy.eta}:{" "}
        {trip.minutes === null ? copy.unknown : `${trip.minutes} ${copy.minutes}`}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  text: { fontSize: 16, lineHeight: 24, color: "#263E32" },
});

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../i18n/context";
import { useSearchSelection } from "../search/context";
import { SERVICES } from "../search/selection";

export function ServicePicker() {
  const {
    copy: { services },
  } = useLanguage();
  const { service, selectService } = useSearchSelection();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {services.choose}
      </Text>
      <View style={styles.grid}>
        {SERVICES.map((value) => {
          const selected = service === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`${services.names[value]}. ${services.descriptions[value]}`}
              accessibilityState={{ selected }}
              onPress={() => selectService(value)}
              style={({ pressed }) => [
                styles.card,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.name, selected && styles.light]}>
                {services.names[value]}
              </Text>
              <Text style={[styles.description, selected && styles.light]}>
                {services.descriptions[value]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {service && (
        <Text accessibilityLiveRegion="polite" style={styles.description}>
          {services.selected}: {services.names[service]}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 14, marginTop: 22 },
  heading: { color: "#173E32", fontSize: 20, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    flexGrow: 1,
    flexBasis: "45%",
    minHeight: 112,
    padding: 18,
    borderWidth: 1,
    borderColor: "#8F9F94",
    borderRadius: 18,
    gap: 9,
  },
  selected: { backgroundColor: "#173E32", borderColor: "#173E32" },
  pressed: { opacity: 0.8 },
  name: { color: "#173E32", fontSize: 20, fontWeight: "700" },
  description: { color: "#4F5D54", fontSize: 14, lineHeight: 21 },
  light: { color: "#FFFFFF" },
});

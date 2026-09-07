import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLanguage } from "../i18n/context";
import { useSearchSelection } from "../search/context";
import { SERVICES } from "../search/selection";

export function ServicePicker() {
  const {
    copy: { services },
  } = useLanguage();
  const { service, selectService } = useSearchSelection();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  // Include padding and the selected checkmark without shrinking accessible text.
  const twoColumns = width >= 2 * (220 * Math.max(1, fontScale) + 38) + 12;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.heading}>
        {services.choose}
      </Text>
      <View
        style={styles.grid}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
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
                !twoColumns && styles.fullWidth,
                selected && styles.selected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.name, selected && styles.light]}>
                {selected ? "✓ " : ""}
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
    borderColor: "#627369",
    borderRadius: 18,
    gap: 9,
  },
  selected: { backgroundColor: "#173E32", borderColor: "#173E32" },
  fullWidth: { flexBasis: "100%" },
  pressed: { opacity: 0.8 },
  name: { color: "#173E32", fontSize: 20, fontWeight: "700" },
  description: { color: "#4F5D54", fontSize: 14, lineHeight: 21 },
  light: { color: "#FFFFFF" },
});

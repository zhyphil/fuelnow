import { Pressable, StyleSheet, Text } from "react-native";

export function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#173E32",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#8F9F94" },
  label: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
  secondaryLabel: { color: "#173E32" },
  dim: { opacity: 0.65 },
});

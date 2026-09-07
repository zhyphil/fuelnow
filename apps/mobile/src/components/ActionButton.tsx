import { Pressable, StyleSheet, Text } from "react-native";

export function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  selected = false,
  expanded,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  selected?: boolean;
  expanded?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        disabled,
        selected,
        ...(expanded === undefined ? {} : { expanded }),
      }}
      hitSlop={8}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && styles.dim,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, (secondary || disabled) && styles.secondaryLabel]}>
        {selected ? `✓ ${label}` : label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    minWidth: 48,
    borderRadius: 16,
    backgroundColor: "#173E32",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#627369" },
  disabled: { backgroundColor: "#DDE5E0" },
  label: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", textAlign: "center" },
  secondaryLabel: { color: "#173E32" },
  dim: { opacity: 0.65 },
});

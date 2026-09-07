import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { messages } from "../content/messages";
import { LocationPanel } from "../components/LocationPanel";

export default function WelcomeScreen() {
  const copy = messages.en;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={styles.brand}>{copy.appName}</Text>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {copy.title}
          </Text>
          <Text style={styles.body}>{copy.introduction}</Text>
        </View>
        <LocationPanel />
        <Text style={styles.coverage}>{copy.coverage}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 24,
    backgroundColor: "#F5F4ED",
  },
  brand: { fontSize: 24, fontWeight: "800", color: "#173E32" },
  hero: { flex: 1, justifyContent: "center", gap: 22 },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.8, color: "#38634F" },
  title: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "700",
    letterSpacing: -1.5,
    color: "#16372D",
  },
  body: { maxWidth: 360, fontSize: 18, lineHeight: 28, color: "#4F5D54" },
  coverage: { fontSize: 14, color: "#4F5D54" },
});

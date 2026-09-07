import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../i18n/context";
import { LanguagePicker } from "../components/LanguagePicker";
import { LocationPanel } from "../components/LocationPanel";
import { ServicePicker } from "../components/ServicePicker";
import { useSearchSelection } from "../search/context";
import { useRouter } from "expo-router";
import { useLocation } from "../location/context";
import { ActionButton } from "../components/ActionButton";
import { DiagnosticsPanel } from "../components/DiagnosticsPanel";
import { sourcePageCopy } from "../content/sourceNotices";
import { mobileConfig } from "../config/runtime";

export default function WelcomeScreen() {
  const { service } = useSearchSelection();
  const router = useRouter();
  const { state: location } = useLocation();
  const {
    language,
    copy: { app: copy, results, evidence },
  } = useLanguage();
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={styles.brand}>{copy.appName}</Text>
        {mobileConfig.environment === "test" && (
          <Text accessibilityRole="alert" style={styles.coverage}>
            {evidence.localDemoNotice}
          </Text>
        )}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.title}>
            {copy.title}
          </Text>
          <Text style={styles.body}>{copy.introduction}</Text>
        </View>
        <ServicePicker />
        {service && <LocationPanel />}
        <ActionButton
          label={results.search}
          disabled={!service || location.status !== "ready"}
          onPress={() => router.push("/results")}
        />
        <Text style={styles.coverage}>{copy.coverage}</Text>
        <LanguagePicker />
        <ActionButton
          secondary
          label={sourcePageCopy[language].title}
          onPress={() => router.push("/sources")}
        />
        <DiagnosticsPanel />
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

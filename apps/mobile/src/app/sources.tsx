import { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLanguage } from "../i18n/context";
import { ActionButton } from "../components/ActionButton";
import {
  openSourceNotice,
  sourceNotices,
  sourcePageCopy,
} from "../content/sourceNotices";

export default function SourcesScreen() {
  const { language } = useLanguage();
  const copy = sourcePageCopy[language];
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const open = async (url: string) =>
    setFailed(!(await openSourceNotice(url, (link) => Linking.openURL(link))));
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <ActionButton secondary label={copy.back} onPress={() => router.back()} />
        <Text accessibilityRole="header" style={styles.title}>
          {copy.title}
        </Text>
        <Text style={styles.text}>{copy.introduction}</Text>
        <Text style={styles.text}>{copy.transformation}</Text>
        <Text style={styles.text}>{copy.uncertainty}</Text>
        <Text style={styles.text}>
          Origen de los datos: Ministerio para la Transición Ecológica y el Reto
          Demográfico
        </Text>
        {failed && (
          <Text accessibilityRole="alert" style={styles.error}>
            {copy.linkFailure}
          </Text>
        )}
        {sourceNotices.map((source) => (
          <View key={source.id} style={styles.card}>
            <Text accessibilityRole="header" style={styles.heading}>
              {source.name}
            </Text>
            <Text style={styles.text}>
              {source.scope} · {copy.states[source.state]}
            </Text>
            <Text style={styles.text}>{source.licence}</Text>
            <ActionButton
              secondary
              label={`${copy.source}: ${source.name}`}
              onPress={() => {
                void open(source.url);
              }}
            />
            <ActionButton
              secondary
              label={`${copy.licence}: ${source.licence}`}
              onPress={() => {
                void open(source.licenceUrl);
              }}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F4ED" },
  content: { padding: 24, gap: 18 },
  title: { fontSize: 30, fontWeight: "700", color: "#173E32" },
  heading: { fontSize: 20, fontWeight: "600", color: "#173E32" },
  text: { fontSize: 16, lineHeight: 24, color: "#263E32" },
  card: {
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#627369",
    borderRadius: 16,
  },
  error: { color: "#7F1D1D", fontSize: 16 },
});

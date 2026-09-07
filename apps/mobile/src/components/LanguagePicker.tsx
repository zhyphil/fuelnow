import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../i18n/context";
import { LANGUAGES } from "../i18n/preferences";
import { languageNames } from "../content/language";
import { ActionButton } from "./ActionButton";

export function LanguagePicker() {
  const { language, preference, storageFailed, copy, selectLanguage } = useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <>
      <ActionButton
        secondary
        label={`${copy.language.choose} · ${languageNames[language]}`}
        onPress={() => setVisible(true)}
      />
      {visible && (
        <Modal visible animationType="slide" onRequestClose={() => setVisible(false)}>
          <SafeAreaView style={styles.screen}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text accessibilityRole="header" style={styles.title}>
                {copy.language.choose}
              </Text>
              {LANGUAGES.map((value) => (
                <ActionButton
                  key={value}
                  secondary={value !== preference}
                  selected={value === preference}
                  label={languageNames[value]}
                  onPress={() => {
                    void selectLanguage(value);
                  }}
                />
              ))}
              <ActionButton
                secondary
                selected={preference === null}
                label={copy.language.system}
                onPress={() => {
                  void selectLanguage(null);
                }}
              />
              {storageFailed && (
                <Text accessibilityRole="alert" style={styles.notice}>
                  {copy.language.failed}
                </Text>
              )}
              <ActionButton
                label={copy.language.close}
                onPress={() => setVisible(false)}
              />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F4ED" },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700", color: "#173E32" },
  notice: { color: "#4F5D54", fontSize: 16 },
});

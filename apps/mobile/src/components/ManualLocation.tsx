import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { manualMessages } from "../content/manual";
import { findManualPlaces, parseManualCoordinates } from "../location/manual";
import { useLocation } from "../location/context";
import { ActionButton } from "./ActionButton";

export function ManualLocation({ onClose }: { onClose: () => void }) {
  const copy = manualMessages.en;
  const { selectManual } = useLocation();
  const [search, setSearch] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [invalid, setInvalid] = useState(false);
  const places = findManualPlaces(search);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <ActionButton secondary label={copy.close} onPress={onClose} />
          <Text accessibilityRole="header" style={styles.title}>
            {copy.heading}
          </Text>
          <Text style={styles.body}>{copy.notice}</Text>
          <TextInput
            accessibilityLabel={copy.search}
            placeholder={copy.search}
            value={search}
            onChangeText={setSearch}
            style={styles.input}
            autoCorrect={false}
          />
          {places.map((place) => (
            <ActionButton
              key={place.id}
              secondary
              label={`${place.name} · ${place.country}`}
              onPress={() => {
                selectManual({
                  latitude: place.latitude,
                  longitude: place.longitude,
                  label: place.name,
                });
                onClose();
              }}
            />
          ))}
          {places.length === 0 && <Text style={styles.body}>{copy.empty}</Text>}
          <Text accessibilityRole="header" style={styles.title}>
            {copy.coordinates}
          </Text>
          <View style={styles.fields}>
            <Text style={styles.body}>{copy.latitude}</Text>
            <TextInput
              accessibilityLabel={copy.latitude}
              value={latitude}
              onChangeText={setLatitude}
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={25}
              style={styles.input}
            />
            <Text style={styles.body}>{copy.longitude}</Text>
            <TextInput
              accessibilityLabel={copy.longitude}
              value={longitude}
              onChangeText={setLongitude}
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={25}
              style={styles.input}
            />
          </View>
          {invalid && (
            <Text accessibilityRole="alert" style={styles.error}>
              {copy.invalid}
            </Text>
          )}
          <ActionButton
            label={copy.apply}
            onPress={() => {
              const coordinates = parseManualCoordinates(latitude, longitude);
              if (!coordinates) {
                setInvalid(true);
                return;
              }
              selectManual(coordinates);
              onClose();
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F4ED" },
  content: { padding: 24, gap: 14 },
  fields: { gap: 8 },
  title: { fontSize: 24, fontWeight: "700", color: "#173E32" },
  body: { color: "#4F5D54", fontSize: 15, lineHeight: 23 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#8F9F94",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#173E32",
  },
  error: { color: "#9C261E", fontSize: 15 },
});

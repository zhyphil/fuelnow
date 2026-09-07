import { useState } from "react";
import { Modal, Platform, Text, View } from "react-native";
import Constants from "expo-constants";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../i18n/context";
import type { NearbyPoint } from "../search/presentation";
import { mapEnabled, mapPoints, mapRegion } from "../search/map";
import { resultTitle } from "../search/results";
import { ActionButton } from "./ActionButton";
export function ResultMap({
  points,
  onClose,
  onSelect,
}: {
  points: NearbyPoint[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const {
    copy: { evidence: copy, results },
  } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const region = mapRegion(points);
  const enabled = mapEnabled(
    Platform.OS,
    Constants.executionEnvironment === "storeClient",
    Constants.expoConfig?.extra?.androidMapsConfigured === true,
  );
  const point = points.find((point) => point.id === selected);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#F5F4ED", padding: 16, gap: 12 }}
      >
        <ActionButton secondary label={copy.back} onPress={onClose} />
        <Text>{copy.mapNotice}</Text>
        {enabled && region ? (
          <MapView
            style={{ flex: 1 }}
            initialRegion={region}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            showsUserLocation={false}
            showsMyLocationButton={false}
            toolbarEnabled={false}
          >
            {mapPoints(points).map((point, index) => (
              <Marker
                key={point.id}
                coordinate={point.location}
                title={`${index + 1}. ${resultTitle(point, results.unnamed)}`}
                onPress={() => setSelected(point.id)}
              />
            ))}
          </MapView>
        ) : (
          <Text>{copy.mapUnavailable}</Text>
        )}
        {point && (
          <View style={{ gap: 8 }}>
            <Text>{resultTitle(point, results.unnamed)}</Text>
            <ActionButton label={copy.details} onPress={() => onSelect(point.id)} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

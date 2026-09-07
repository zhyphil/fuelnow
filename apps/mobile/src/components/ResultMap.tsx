import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  const [shown, setShown] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const region = mapRegion(points);
  const enabled = mapEnabled(
    Platform.OS,
    Constants.executionEnvironment === "storeClient",
    Constants.expoConfig?.extra?.androidMapsConfigured === true,
  );
  const point = points.find((point) => point.id === selected);
  return (
    <Modal
      visible
      hardwareAccelerated
      animationType="slide"
      onShow={() => setShown(true)}
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#F5F4ED", padding: 16, gap: 12 }}
      >
        <ActionButton secondary label={copy.back} onPress={onClose} />
        <Text>{copy.mapNotice}</Text>
        <View
          style={{ flex: 1 }}
          onLayout={({ nativeEvent: { layout } }) =>
            setLayoutReady(layout.width > 0 && layout.height > 0)
          }
        >
          {!enabled || !region ? (
            <Text>{region ? copy.mapUnavailable : copy.mapNoPoints}</Text>
          ) : shown && layoutReady ? (
            <MapSession
              key={attempt}
              points={points}
              region={region}
              onSelect={setSelected}
              onRetry={() => {
                setSelected(null);
                setAttempt((value) => value + 1);
              }}
            />
          ) : (
            <Text accessibilityLiveRegion="polite">{copy.mapLoading}</Text>
          )}
        </View>
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

// A new keyed session isolates retry callbacks and timers from the previous map.
function MapSession({
  points,
  region,
  onSelect,
  onRetry,
}: {
  points: NearbyPoint[];
  region: NonNullable<ReturnType<typeof mapRegion>>;
  onSelect: (id: string) => void;
  onRetry: () => void;
}) {
  const {
    copy: { evidence: copy, results },
  } = useLanguage();
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setExpired(true), 12_000);
    return () => clearTimeout(timer);
  }, [loaded]);
  return (
    <View style={{ flex: 1, gap: 8 }}>
      {!loaded && (
        <View style={{ gap: 8 }}>
          {!expired && <ActivityIndicator color="#173E32" />}
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole={expired ? "alert" : undefined}
          >
            {expired
              ? ready
                ? copy.mapTilesFailed
                : copy.mapStartFailed
              : copy.mapLoading}
          </Text>
          {expired && (
            <ActionButton secondary label={results.retry} onPress={onRetry} />
          )}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onMapReady={() => {
            setReady(true);
            // Apple Maps does not implement Google's onMapLoaded callback.
            if (Platform.OS === "ios") setLoaded(true);
          }}
          onMapLoaded={() => setLoaded(true)}
        >
          {mapPoints(points).map((point, index) => (
            <Marker
              key={point.id}
              coordinate={point.location}
              title={`${index + 1}. ${resultTitle(point, results.unnamed)}`}
              onPress={() => onSelect(point.id)}
            />
          ))}
        </MapView>
      </View>
    </View>
  );
}

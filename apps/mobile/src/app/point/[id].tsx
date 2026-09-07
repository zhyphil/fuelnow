import { useCallback, useState, useSyncExternalStore } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../api/runtime";
import type { ServicePointResponse } from "../../api/client";
import { ActionButton } from "../../components/ActionButton";
import { EvidenceSummary } from "../../components/EvidenceSummary";
import { NavigationButtons } from "../../components/NavigationButtons";
import { useLanguage } from "../../i18n/context";
import { ResourceController } from "../../search/results";
import { detailAddress, validPointId } from "../../search/detail";
import { timestamp } from "../../search/evidence";
import { analytics } from "../../analytics/recorder";

export default function PointScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    language,
    copy: { evidence: copy, results, point: labels, services },
  } = useLanguage();
  const [controller] = useState(
    () => new ResourceController<string, ServicePointResponse>(api.servicePoint),
  );
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useFocusEffect(
    useCallback(() => {
      if (validPointId(id)) void controller.run(id);
      else controller.clear();
      return () => {
        controller.clear();
        analytics.beta.clearSelection();
      };
    }, [controller, id]),
  );
  const point = state.status === "ready" ? state.response.servicePoint : null;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F4ED" }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        <ActionButton
          secondary
          label={copy.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
        {!validPointId(id) && (
          <Text accessibilityRole="alert">{copy.invalidPoint}</Text>
        )}
        {state.status === "loading" && (
          <>
            <ActivityIndicator />
            <Text>{results.loading}</Text>
          </>
        )}
        {state.status === "error" && (
          <>
            <Text accessibilityRole="alert">{copy[state.reason]}</Text>
            {state.retryable && (
              <ActionButton
                label={results.retry}
                onPress={() => {
                  void controller.run(id);
                }}
              />
            )}
          </>
        )}
        {point && (
          <>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 28, fontWeight: "700", color: "#173E32" }}
            >
              {point.name || point.brand || results.unnamed}
            </Text>
            <Text>
              {detailAddress(point.address) ?? labels.addressUnknown} · {point.country}
            </Text>
            <NavigationButtons
              target={{
                id: point.id,
                location: point.location,
                lifecycleStatus: point.lifecycle.status,
              }}
            />
            <Text>
              {copy.lifecycle}: {copy[point.lifecycle.status]}
            </Text>
            <Text>
              {copy.hours}: {point.opening.hours?.raw || copy.unknown}
            </Text>
            <Text>
              {copy.updated}: {timestamp(point.updatedAt, language)}
            </Text>
            {point.services.map((service) => (
              <View
                key={service.serviceType}
                style={{
                  padding: 16,
                  gap: 12,
                  backgroundColor: "white",
                  borderRadius: 16,
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={{ fontSize: 22, fontWeight: "600", color: "#173E32" }}
                >
                  {services.names[service.serviceType]}
                </Text>
                <EvidenceSummary evidence={service.evidence} country={point.country} />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

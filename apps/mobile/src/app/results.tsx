import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../api/runtime";
import { ActionButton } from "../components/ActionButton";
import { useLanguage } from "../i18n/context";
import { useLocation } from "../location/context";
import { useSearchSelection } from "../search/context";
import { buildInitialSearch } from "../search/selection";
import { resultTitle, SearchController } from "../search/results";
import { SortPicker } from "../components/SortPicker";
import { PointSummary } from "../components/PointSummary";
import { EvidenceSummary } from "../components/EvidenceSummary";
import { RecommendationSummary } from "../components/RecommendationSummary";
import { withSearchSort, type Sort, type FuelType } from "../search/sorts";

export default function ResultsScreen() {
  const router = useRouter();
  const {
    copy: { results: copy, services },
  } = useLanguage();
  const { service } = useSearchSelection();
  const { state: location } = useLocation();
  const origin = location.status === "ready" ? location.origin : null;
  const [sort, setSort] = useState<Sort>("nearest");
  const [fuelType, setFuelType] = useState<FuelType>();
  const query = useMemo(() => {
    const initial = buildInitialSearch(service, origin);
    return initial ? withSearchSort(initial, sort, fuelType) : null;
  }, [service, origin, sort, fuelType]);
  const [controller] = useState(() => new SearchController(api.nearby));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useFocusEffect(
    useCallback(() => {
      if (query) void controller.run(query);
      else controller.clear();
      return controller.clear;
    }, [controller, query]),
  );
  const response = query && state.status === "ready" ? state.response : null;
  const run = () => {
    if (query) void controller.run(query);
  };
  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={response?.results ?? []}
        keyExtractor={(point) => point.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <ActionButton
              label={copy.back}
              secondary
              onPress={() => router.replace("/")}
            />
            <Text accessibilityRole="header" style={styles.title}>
              {service ? services.names[service] : copy.title}
            </Text>
            {service && query && (
              <SortPicker
                service={service}
                sort={sort}
                fuelType={fuelType}
                response={response}
                onSort={setSort}
                onFuel={(fuel) => {
                  setFuelType(fuel);
                  setSort("nearest");
                }}
              />
            )}
            {!query ? (
              <Text style={styles.body}>{copy.missing}</Text>
            ) : (
              <>
                {state.status === "loading" && (
                  <View accessibilityLiveRegion="polite">
                    <ActivityIndicator color="#173E32" />
                    <Text style={styles.body}>{copy.loading}</Text>
                  </View>
                )}
                {state.status === "error" && (
                  <View style={styles.header}>
                    <Text accessibilityRole="alert" style={styles.body}>
                      {copy.error}
                    </Text>
                    {state.retryable && (
                      <ActionButton label={copy.retry} onPress={run} />
                    )}
                  </View>
                )}
                {response && (
                  <>
                    <Text accessibilityLiveRegion="polite" style={styles.body}>
                      {copy.count}: {response.resultCount} · {copy.ordered}:{" "}
                      {copy[response.ranking.appliedSort]}
                    </Text>
                    {response.ranking.degraded && (
                      <Text style={styles.notice}>{copy.degraded}</Text>
                    )}
                    {response.outcome.warnings.length > 0 && (
                      <Text style={styles.notice}>{copy.warning}</Text>
                    )}
                    {response.search.expanded && (
                      <Text style={styles.body}>{copy.expanded}</Text>
                    )}
                    <ActionButton label={copy.refresh} secondary onPress={run} />
                  </>
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          response ? <Text style={styles.body}>{copy.empty}</Text> : null
        }
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.name}>
              {index + 1}. {resultTitle(item, copy.unnamed)}
            </Text>
            <Text style={styles.body}>
              {item.country}
              {item.brand?.trim() ? ` · ${item.brand}` : ""}
            </Text>
            <PointSummary point={item} />
            <RecommendationSummary recommendation={item.recommendation} />
            <EvidenceSummary evidence={item.evidence} country={item.country} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F4ED" },
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  header: { gap: 16, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: "700", color: "#173E32" },
  name: { fontSize: 20, fontWeight: "600", color: "#173E32" },
  body: { fontSize: 16, lineHeight: 24, color: "#4F5D54" },
  notice: {
    fontSize: 15,
    lineHeight: 22,
    padding: 12,
    backgroundColor: "#F5E8CD",
    color: "#5B431D",
    borderRadius: 12,
  },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, gap: 8 },
});

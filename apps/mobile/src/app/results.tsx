import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { analytics } from "../analytics/recorder";
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
import { ResultMap } from "../components/ResultMap";
import { NavigationButtons } from "../components/NavigationButtons";
import { LocationPanel } from "../components/LocationPanel";
import { emptyRecovery } from "../search/empty";
import { distance } from "../search/presentation";
import { withSearchSort, type Sort, type FuelType } from "../search/sorts";

export default function ResultsScreen() {
  const router = useRouter();
  const {
    language,
    copy: { results: copy, services, evidence },
  } = useLanguage();
  const { service } = useSearchSelection();
  const { state: location } = useLocation();
  const origin = location.status === "ready" ? location.origin : null;
  const [sort, setSort] = useState<Sort>("nearest");
  const [fuelType, setFuelType] = useState<FuelType>();
  const [radius, setRadius] = useState<number>();
  const [showMap, setShowMap] = useState(false);
  const query = useMemo(() => {
    const initial = buildInitialSearch(service, origin);
    return initial
      ? { ...withSearchSort(initial, sort, fuelType), ...(radius ? { radius } : {}) }
      : null;
  }, [service, origin, sort, fuelType, radius]);
  const [controller] = useState(() => new SearchController(api.nearby));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useFocusEffect(
    useCallback(() => {
      setShowMap(false);
      if (query) void controller.run(query);
      else controller.clear();
      return controller.clear;
    }, [controller, query]),
  );
  const response = query && state.status === "ready" ? state.response : null;
  const recovery = response ? emptyRecovery(response) : null;
  useEffect(() => {
    if (response)
      analytics.record(
        {
          type: "search_exposure",
          service: response.service,
          sort: response.ranking.appliedSort,
          resultCount: response.resultCount,
        },
        response.requestId,
      );
  }, [response]);
  const selectPoint = (id: string) => {
    analytics.record({
      type: "result_selection",
      pointId: id,
      ...(service ? { service } : {}),
    });
    router.push({ pathname: "/point/[id]", params: { id } });
  };
  const run = () => {
    if (query) void controller.run(query);
  };
  return (
    <SafeAreaView style={styles.screen}>
      {showMap && response && (
        <ResultMap
          points={response.results}
          onClose={() => setShowMap(false)}
          onSelect={(id) => {
            setShowMap(false);
            selectPoint(id);
          }}
        />
      )}
      <FlatList
        data={response?.results ?? []}
        refreshing={state.status === "loading" && state.refreshing === true}
        onRefresh={query && state.status !== "loading" ? run : undefined}
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
              <View style={styles.header}>
                <Text style={styles.body}>{copy.missing}</Text>
                {service && <LocationPanel />}
              </View>
            ) : (
              <>
                {state.status === "loading" && (
                  <View accessibilityLiveRegion="polite">
                    <ActivityIndicator color="#173E32" />
                    <Text style={styles.body}>
                      {state.refreshing ? evidence.refreshing : copy.loading}
                    </Text>
                    <ActionButton
                      secondary
                      label={evidence.cancelRequest}
                      onPress={controller.clear}
                    />
                  </View>
                )}
                {state.status === "idle" && (
                  <ActionButton label={copy.search} onPress={run} />
                )}
                {state.status === "error" && (
                  <View style={styles.header}>
                    <Text accessibilityRole="alert" style={styles.body}>
                      {evidence[state.reason]}
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
                    <ActionButton
                      label={evidence.map}
                      secondary
                      disabled={response.results.length === 0}
                      onPress={() => setShowMap(true)}
                    />
                  </>
                )}
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          response ? (
            <View style={styles.header}>
              <Text accessibilityRole="alert" style={styles.body}>
                {response.outcome.emptyReason
                  ? evidence[response.outcome.emptyReason]
                  : copy.empty}
              </Text>
              <Text style={styles.body}>
                {evidence.radius}:{" "}
                {distance(response.search.usedRadiusMetres, language)}
              </Text>
              {recovery?.action === "nearest" && (
                <ActionButton label={copy.nearest} onPress={() => setSort("nearest")} />
              )}
              {recovery?.action === "expand" && (
                <ActionButton
                  label={evidence.expand}
                  onPress={() => setRadius(recovery.radius)}
                />
              )}
            </View>
          ) : null
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
            <NavigationButtons target={item} />
            <ActionButton
              secondary
              label={evidence.details}
              onPress={() => selectPoint(item.id)}
            />
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

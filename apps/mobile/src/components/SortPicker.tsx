import { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "./ActionButton";
import { useLanguage } from "../i18n/context";
import type { NearbyQuery, NearbyResponse } from "../api/client";
import {
  FUEL_TYPES,
  SORTS,
  unavailableSortReason,
  type FuelType,
  type Sort,
} from "../search/sorts";

export function SortPicker({
  service,
  sort,
  fuelType,
  response,
  onSort,
  onFuel,
}: {
  service: NearbyQuery["service"];
  sort: Sort;
  fuelType: FuelType | undefined;
  response: NearbyResponse | null;
  onSort: (sort: Sort) => void;
  onFuel: (fuel: FuelType | undefined) => void;
}) {
  const {
    copy: { results, sorts: copy, language },
  } = useLanguage();
  const [showFuel, setShowFuel] = useState(false);
  return (
    <View style={styles.section}>
      {service === "fuel" && (
        <>
          <ActionButton
            secondary
            label={`${copy.fuel}: ${fuelType ? copy.fuels[fuelType] : copy.anyFuel}`}
            onPress={() => setShowFuel(true)}
          />
          {showFuel && (
            <Modal
              visible
              animationType="slide"
              onRequestClose={() => setShowFuel(false)}
            >
              <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F4ED" }}>
                <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
                  <Text accessibilityRole="header" style={styles.label}>
                    {copy.fuel}
                  </Text>
                  {([undefined, ...FUEL_TYPES] as const).map((fuel) => (
                    <ActionButton
                      key={fuel ?? "any"}
                      label={fuel ? copy.fuels[fuel] : copy.anyFuel}
                      selected={fuelType === fuel}
                      secondary={fuelType !== fuel}
                      onPress={() => {
                        onFuel(fuel);
                        setShowFuel(false);
                      }}
                    />
                  ))}
                  <ActionButton
                    label={language.close}
                    onPress={() => setShowFuel(false)}
                  />
                </ScrollView>
              </SafeAreaView>
            </Modal>
          )}
        </>
      )}
      <Text accessibilityRole="header" style={styles.label}>
        {copy.requested}: {results[sort]}
      </Text>
      <View style={styles.grid}>
        {SORTS.map((option) => {
          const reason = unavailableSortReason(option, service, fuelType, response);
          return (
            <View style={styles.cell} key={option}>
              <ActionButton
                label={results[option]}
                selected={option === sort}
                secondary={option !== sort}
                disabled={reason !== null}
                onPress={() => onSort(option)}
              />
              {reason && <Text style={styles.note}>{copy.reasons[reason]}</Text>}
            </View>
          );
        })}
      </View>
      {sort === "open_now" && <Text style={styles.note}>{copy.scheduled}</Text>}
      {sort === "best" && <Text style={styles.note}>{copy.limited}</Text>}
      {response && (
        <Text accessibilityLiveRegion="polite" style={styles.note}>
          {copy.states[response.ranking.capability.state]}
          {response.ranking.capability.reason
            ? ` · ${copy.reasons[response.ranking.capability.reason]}`
            : ""}
          {response.ranking.reason &&
          response.ranking.reason !== response.ranking.capability.reason
            ? ` · ${copy.reasons[response.ranking.reason]}`
            : ""}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  cell: { flexBasis: "46%", flexGrow: 1, gap: 8 },
  label: { fontSize: 16, fontWeight: "600", color: "#173E32" },
  note: { fontSize: 14, lineHeight: 21, color: "#4F5D54" },
});

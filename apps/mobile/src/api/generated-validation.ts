/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Generated TypeBox JavaScript checks with typed exports. Run pnpm api:types; do not edit.
function hash(value: unknown) {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
}
export const validNearby: (value: unknown) => boolean = (() => {
  const local_0 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_1 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_2 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_3 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_4 = /^https:\/\//;
  const local_5 = /^https:\/\//;
  const local_6 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_7 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_8 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  function check_ServiceType(value) {
    return (
      value === "fuel" || value === "charging" || value === "air" || value === "wash"
    );
  }
  function check_FuelType(value) {
    return (
      value === "sp95" ||
      value === "sp95_e10" ||
      value === "sp98" ||
      value === "e85" ||
      value === "diesel" ||
      value === "premium_diesel" ||
      value === "lpg" ||
      value === "cng" ||
      value === "lng"
    );
  }
  function check_SearchOutcome(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      check_SearchOutcomeState(value["state"]) &&
      check_SearchSort(value["sort"]) &&
      check_DecisionCapability(value["capability"]) &&
      Number.isInteger(value["candidateCount"]) &&
      value["candidateCount"] >= 0 &&
      Number.isInteger(value["resultCount"]) &&
      value["resultCount"] >= 0 &&
      Number.isInteger(value["priceUnknownCount"]) &&
      value["priceUnknownCount"] >= 0 &&
      Number.isInteger(value["openingStatusUnknownCount"]) &&
      value["openingStatusUnknownCount"] >= 0 &&
      Number.isInteger(value["holidayHoursUnknownCount"]) &&
      value["holidayHoursUnknownCount"] >= 0 &&
      Number.isInteger(value["equipmentStatusUnknownCount"]) &&
      value["equipmentStatusUnknownCount"] >= 0 &&
      Number.isInteger(value["routeEtaUnavailableCount"]) &&
      value["routeEtaUnavailableCount"] >= 0 &&
      Array.isArray(value["warnings"]) &&
      value["warnings"].length <= 5 &&
      ((array) => {
        for (const value of array)
          if (!check_SearchWarningCode(value)) {
            return false;
          }
        return true;
      })(value["warnings"]) &&
      ((value) => {
        const set = new Set();
        for (const element of value) {
          const hashed = hash(element);
          if (set.has(hashed)) {
            return false;
          } else {
            set.add(hashed);
          }
        }
        return true;
      })(value["warnings"]) &&
      (check_EmptyResultReason(value["emptyReason"]) ||
        value["emptyReason"] === null) &&
      (check_SearchFallbackAction(value["fallbackAction"]) ||
        value["fallbackAction"] === null) &&
      Object.getOwnPropertyNames(value).length === 13
    );
  }
  function check_SearchOutcomeState(value) {
    return value === "results" || value === "empty";
  }
  function check_SearchSort(value) {
    return (
      value === "nearest" ||
      value === "cheapest" ||
      value === "open_now" ||
      value === "best"
    );
  }
  function check_DecisionCapability(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      check_CapabilityState(value["state"]) &&
      (check_CapabilityReasonCode(value["reason"]) || value["reason"] === null) &&
      Object.getOwnPropertyNames(value).length === 2
    );
  }
  function check_CapabilityState(value) {
    return (
      value === "enabled" ||
      value === "conditional" ||
      value === "unavailable" ||
      value === "source_unhealthy" ||
      value === "legally_blocked"
    );
  }
  function check_CapabilityReasonCode(value) {
    return (
      value === "fuel_type_required" ||
      value === "price_not_available_for_service" ||
      value === "no_eligible_fuel_price" ||
      value === "decision_evidence_unavailable" ||
      value === "availability_not_supported_in_country" ||
      value === "availability_source_unhealthy" ||
      value === "service_hours_unknown" ||
      value === "equipment_status_unknown" ||
      value === "experimental_coverage_area" ||
      value === "eta_provider_unavailable"
    );
  }
  function check_SearchWarningCode(value) {
    return (
      value === "price_unknown" ||
      value === "opening_status_unknown" ||
      value === "holiday_hours_unknown" ||
      value === "equipment_status_unknown" ||
      value === "route_eta_unavailable"
    );
  }
  function check_EmptyResultReason(value) {
    return (
      value === "no_service_points_in_radius" ||
      value === "no_comparable_prices" ||
      value === "no_open_service_points" ||
      value === "opening_status_unknown" ||
      value === "capability_unavailable" ||
      value === "no_matching_service_points"
    );
  }
  function check_SearchFallbackAction(value) {
    return value === "expand_radius" || value === "show_nearest";
  }
  function check_RecommendationReasons(value) {
    return (
      Array.isArray(value) &&
      value.length <= 22 &&
      ((array) => {
        for (const value of array)
          if (!check_RecommendationReason(value)) {
            return false;
          }
        return true;
      })(value)
    );
  }
  function check_RecommendationReason(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      check_RecommendationReasonCode(value["code"]) &&
      check_RecommendationReasonKind(value["kind"]) &&
      (check_RecommendationMetric(value["metric"]) || value["metric"] === null) &&
      Object.getOwnPropertyNames(value).length === 3
    );
  }
  function check_RecommendationReasonCode(value) {
    return (
      value === "best_lower_estimated_trip_cost" ||
      value === "best_lower_price" ||
      value === "best_shorter_distance" ||
      value === "best_faster_arrival" ||
      value === "best_open_now" ||
      value === "best_opens_soon" ||
      value === "best_live_charger_availability" ||
      value === "best_compatible_rated_power" ||
      value === "best_public_access" ||
      value === "best_recent_data" ||
      value === "best_reliable_data" ||
      value === "best_price_not_comparable" ||
      value === "best_availability_unknown" ||
      value === "best_service_hours_unknown" ||
      value === "best_service_access_unknown" ||
      value === "best_wash_type_unknown" ||
      value === "best_matches_nearest" ||
      value === "best_eta_unavailable" ||
      value === "best_time_to_solution_incomplete" ||
      value === "best_data_stale" ||
      value === "best_data_low_confidence" ||
      value === "best_data_expired"
    );
  }
  function check_RecommendationReasonKind(value) {
    return value === "strength" || value === "limitation";
  }
  function check_RecommendationMetric(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      check_RecommendationMetricName(value["name"]) &&
      Number.isFinite(value["value"]) &&
      value["value"] >= 0 &&
      Object.getOwnPropertyNames(value).length === 2
    );
  }
  function check_RecommendationMetricName(value) {
    return (
      value === "estimated_trip_cost_eur" ||
      value === "price_eur" ||
      value === "distance_m" ||
      value === "eta_seconds" ||
      value === "available_evse_count" ||
      value === "rated_power_kw" ||
      value === "confidence_score"
    );
  }
  return function check(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof value["requestId"] === "string" &&
      value["requestId"].length >= 1 &&
      (value["country"] === "FR" ||
        value["country"] === "ES" ||
        value["country"] === null) &&
      check_ServiceType(value["service"]) &&
      (check_FuelType(value["fuelType"]) || value["fuelType"] === null) &&
      (value["connectorType"] === "ccs_combo_2" ||
        value["connectorType"] === "type_2" ||
        value["connectorType"] === "type_2_attached" ||
        value["connectorType"] === "chademo" ||
        value["connectorType"] === "domestic_socket" ||
        value["connectorType"] === "tesla_eu" ||
        value["connectorType"] === null) &&
      ((Number.isFinite(value["minimumPowerKw"]) &&
        value["minimumPowerKw"] <= 1000 &&
        value["minimumPowerKw"] >= 1) ||
        value["minimumPowerKw"] === null) &&
      (value["sort"] === "nearest" ||
        value["sort"] === "cheapest" ||
        value["sort"] === "open_now" ||
        value["sort"] === "best") &&
      typeof value["search"] === "object" &&
      value["search"] !== null &&
      !Array.isArray(value["search"]) &&
      Number.isInteger(value["search"]["requestedRadiusMetres"]) &&
      value["search"]["requestedRadiusMetres"] >= 1 &&
      Number.isInteger(value["search"]["usedRadiusMetres"]) &&
      value["search"]["usedRadiusMetres"] >= 1 &&
      Array.isArray(value["search"]["attemptedRadiiMetres"]) &&
      value["search"]["attemptedRadiiMetres"].length >= 1 &&
      ((array) => {
        for (const value of array)
          if (!(Number.isInteger(value) && value >= 1)) {
            return false;
          }
        return true;
      })(value["search"]["attemptedRadiiMetres"]) &&
      typeof value["search"]["expanded"] === "boolean" &&
      typeof value["search"]["minimumCandidatesMet"] === "boolean" &&
      (value["search"]["stopReason"] === "minimum_candidates_met" ||
        value["search"]["stopReason"] === "maximum_radius_reached") &&
      Object.getOwnPropertyNames(value["search"]).length === 6 &&
      typeof value["ranking"] === "object" &&
      value["ranking"] !== null &&
      !Array.isArray(value["ranking"]) &&
      (value["ranking"]["requestedSort"] === "nearest" ||
        value["ranking"]["requestedSort"] === "cheapest" ||
        value["ranking"]["requestedSort"] === "open_now" ||
        value["ranking"]["requestedSort"] === "best") &&
      (value["ranking"]["appliedSort"] === "nearest" ||
        value["ranking"]["appliedSort"] === "cheapest" ||
        value["ranking"]["appliedSort"] === "open_now" ||
        value["ranking"]["appliedSort"] === "best") &&
      typeof value["ranking"]["capability"] === "object" &&
      value["ranking"]["capability"] !== null &&
      !Array.isArray(value["ranking"]["capability"]) &&
      (value["ranking"]["capability"]["state"] === "enabled" ||
        value["ranking"]["capability"]["state"] === "conditional" ||
        value["ranking"]["capability"]["state"] === "unavailable" ||
        value["ranking"]["capability"]["state"] === "source_unhealthy" ||
        value["ranking"]["capability"]["state"] === "legally_blocked") &&
      (value["ranking"]["capability"]["reason"] === "fuel_type_required" ||
        value["ranking"]["capability"]["reason"] ===
          "price_not_available_for_service" ||
        value["ranking"]["capability"]["reason"] === "no_eligible_fuel_price" ||
        value["ranking"]["capability"]["reason"] === "decision_evidence_unavailable" ||
        value["ranking"]["capability"]["reason"] ===
          "availability_not_supported_in_country" ||
        value["ranking"]["capability"]["reason"] === "availability_source_unhealthy" ||
        value["ranking"]["capability"]["reason"] === "service_hours_unknown" ||
        value["ranking"]["capability"]["reason"] === "equipment_status_unknown" ||
        value["ranking"]["capability"]["reason"] === "experimental_coverage_area" ||
        value["ranking"]["capability"]["reason"] === "eta_provider_unavailable" ||
        value["ranking"]["capability"]["reason"] === null) &&
      Object.getOwnPropertyNames(value["ranking"]["capability"]).length === 2 &&
      typeof value["ranking"]["degraded"] === "boolean" &&
      (value["ranking"]["reason"] === "fuel_type_required" ||
        value["ranking"]["reason"] === "price_not_available_for_service" ||
        value["ranking"]["reason"] === "decision_evidence_unavailable" ||
        value["ranking"]["reason"] === "no_eligible_fuel_price" ||
        value["ranking"]["reason"] === "service_hours_unknown" ||
        value["ranking"]["reason"] === "eta_provider_unavailable" ||
        value["ranking"]["reason"] === null) &&
      Object.getOwnPropertyNames(value["ranking"]).length === 5 &&
      check_SearchOutcome(value["outcome"]) &&
      Number.isInteger(value["resultCount"]) &&
      value["resultCount"] >= 0 &&
      Array.isArray(value["results"]) &&
      value["results"].length <= 50 &&
      ((array) => {
        for (const value of array)
          if (!(
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            (typeof value["address"] === "string" || value["address"] === null) &&
            typeof value["id"] === "string" &&
            value["id"].length >= 1 &&
            (value["country"] === "FR" || value["country"] === "ES") &&
            ((typeof value["name"] === "string" && value["name"].length >= 1) ||
              value["name"] === null) &&
            ((typeof value["brand"] === "string" && value["brand"].length >= 1) ||
              value["brand"] === null) &&
            typeof value["location"] === "object" &&
            value["location"] !== null &&
            !Array.isArray(value["location"]) &&
            Number.isFinite(value["location"]["latitude"]) &&
            value["location"]["latitude"] <= 90 &&
            value["location"]["latitude"] >= -90 &&
            Number.isFinite(value["location"]["longitude"]) &&
            value["location"]["longitude"] <= 180 &&
            value["location"]["longitude"] >= -180 &&
            Object.getOwnPropertyNames(value["location"]).length === 2 &&
            (value["lifecycleStatus"] === "active" ||
              value["lifecycleStatus"] === "permanently_closed" ||
              value["lifecycleStatus"] === "temporarily_closed" ||
              value["lifecycleStatus"] === "unverified") &&
            Number.isFinite(value["straightLineDistanceM"]) &&
            value["straightLineDistanceM"] >= 0 &&
            typeof value["route"] === "object" &&
            value["route"] !== null &&
            !Array.isArray(value["route"]) &&
            (value["route"]["status"] === "calculated" ||
              value["route"]["status"] === "not_requested" ||
              value["route"]["status"] === "unavailable" ||
              value["route"]["status"] === "unreachable") &&
            ((Number.isFinite(value["route"]["roadDistanceM"]) &&
              value["route"]["roadDistanceM"] >= 0) ||
              value["route"]["roadDistanceM"] === null) &&
            ((Number.isInteger(value["route"]["etaSeconds"]) &&
              value["route"]["etaSeconds"] >= 0) ||
              value["route"]["etaSeconds"] === null) &&
            ((typeof value["route"]["calculatedAt"] === "string" &&
              local_0.test(value["route"]["calculatedAt"])) ||
              value["route"]["calculatedAt"] === null) &&
            ((typeof value["route"]["provider"] === "string" &&
              value["route"]["provider"].length >= 1) ||
              value["route"]["provider"] === null) &&
            (value["route"]["profile"] === "driving" ||
              value["route"]["profile"] === "driving-traffic" ||
              value["route"]["profile"] === null) &&
            (typeof value["route"]["trafficAware"] === "boolean" ||
              value["route"]["trafficAware"] === null) &&
            (value["route"]["reason"] === "budget_exceeded" ||
              value["route"]["reason"] === "invalid_response" ||
              value["route"]["reason"] === "provider_unavailable" ||
              value["route"]["reason"] === "rate_limited" ||
              value["route"]["reason"] === "timeout" ||
              value["route"]["reason"] === "unreachable" ||
              value["route"]["reason"] === null) &&
            Object.getOwnPropertyNames(value["route"]).length === 8 &&
            ((typeof value["recommendation"] === "object" &&
              value["recommendation"] !== null &&
              !Array.isArray(value["recommendation"]) &&
              (value["recommendation"]["formulaVersion"] === "fuel-best-v1" ||
                value["recommendation"]["formulaVersion"] === "ev-best-v1" ||
                value["recommendation"]["formulaVersion"] ===
                  "limited-service-best-v1") &&
              Number.isFinite(value["recommendation"]["score"]) &&
              value["recommendation"]["score"] <= 1 &&
              value["recommendation"]["score"] >= 0 &&
              check_RecommendationReasons(value["recommendation"]["reasons"]) &&
              Object.getOwnPropertyNames(value["recommendation"]).length === 3) ||
              value["recommendation"] === null) &&
            typeof value["evidence"] === "object" &&
            value["evidence"] !== null &&
            !Array.isArray(value["evidence"]) &&
            typeof value["evidence"]["status"] === "object" &&
            value["evidence"]["status"] !== null &&
            !Array.isArray(value["evidence"]["status"]) &&
            typeof value["evidence"]["status"]["opening"] === "object" &&
            value["evidence"]["status"]["opening"] !== null &&
            !Array.isArray(value["evidence"]["status"]["opening"]) &&
            (value["evidence"]["status"]["opening"]["state"] === "open" ||
              value["evidence"]["status"]["opening"]["state"] === "closed" ||
              value["evidence"]["status"]["opening"]["state"] === "closing_soon" ||
              value["evidence"]["status"]["opening"]["state"] === "opening_soon" ||
              value["evidence"]["status"]["opening"]["state"] === "unknown") &&
            ((typeof value["evidence"]["status"]["opening"]["evaluatedAt"] ===
              "string" &&
              local_1.test(value["evidence"]["status"]["opening"]["evaluatedAt"])) ||
              value["evidence"]["status"]["opening"]["evaluatedAt"] === null) &&
            (value["evidence"]["status"]["opening"]["basis"] === "site_schedule" ||
              value["evidence"]["status"]["opening"]["basis"] === "service_schedule") &&
            Object.getOwnPropertyNames(value["evidence"]["status"]["opening"])
              .length === 3 &&
            typeof value["evidence"]["status"]["availability"] === "object" &&
            value["evidence"]["status"]["availability"] !== null &&
            !Array.isArray(value["evidence"]["status"]["availability"]) &&
            (value["evidence"]["status"]["availability"]["state"] === "available" ||
              value["evidence"]["status"]["availability"]["state"] === "unavailable" ||
              value["evidence"]["status"]["availability"]["state"] === "unknown") &&
            ((typeof value["evidence"]["status"]["availability"]["observedAt"] ===
              "string" &&
              local_2.test(
                value["evidence"]["status"]["availability"]["observedAt"],
              )) ||
              value["evidence"]["status"]["availability"]["observedAt"] === null) &&
            ((Number.isInteger(
              value["evidence"]["status"]["availability"]["availableUnits"],
            ) &&
              value["evidence"]["status"]["availability"]["availableUnits"] >= 0) ||
              value["evidence"]["status"]["availability"]["availableUnits"] === null) &&
            ((Number.isInteger(
              value["evidence"]["status"]["availability"]["totalUnits"],
            ) &&
              value["evidence"]["status"]["availability"]["totalUnits"] >= 0) ||
              value["evidence"]["status"]["availability"]["totalUnits"] === null) &&
            Object.getOwnPropertyNames(value["evidence"]["status"]["availability"])
              .length === 4 &&
            Object.getOwnPropertyNames(value["evidence"]["status"]).length === 2 &&
            ((typeof value["evidence"]["price"] === "object" &&
              value["evidence"]["price"] !== null &&
              !Array.isArray(value["evidence"]["price"]) &&
              Number.isFinite(value["evidence"]["price"]["amount"]) &&
              value["evidence"]["price"]["amount"] >= 0 &&
              value["evidence"]["price"]["currency"] === "EUR" &&
              (value["evidence"]["price"]["unit"] === "liter" ||
                value["evidence"]["price"]["unit"] === "kilogram" ||
                value["evidence"]["price"]["unit"] === "use" ||
                value["evidence"]["price"]["unit"] === "wash_program") &&
              (typeof value["evidence"]["price"]["taxIncluded"] === "boolean" ||
                value["evidence"]["price"]["taxIncluded"] === null) &&
              (typeof value["evidence"]["price"]["membershipRequired"] === "boolean" ||
                value["evidence"]["price"]["membershipRequired"] === null) &&
              ((typeof value["evidence"]["price"]["observedAt"] === "string" &&
                local_3.test(value["evidence"]["price"]["observedAt"])) ||
                value["evidence"]["price"]["observedAt"] === null) &&
              (value["evidence"]["price"]["freshness"] === "live" ||
                value["evidence"]["price"]["freshness"] === "verified" ||
                value["evidence"]["price"]["freshness"] === "recent" ||
                value["evidence"]["price"]["freshness"] === "stale" ||
                value["evidence"]["price"]["freshness"] === "unknown") &&
              (value["evidence"]["price"]["confidence"] === "high" ||
                value["evidence"]["price"]["confidence"] === "medium" ||
                value["evidence"]["price"]["confidence"] === "low") &&
              Object.getOwnPropertyNames(value["evidence"]["price"]).length === 8) ||
              value["evidence"]["price"] === null) &&
            ((typeof value["evidence"]["source"] === "object" &&
              value["evidence"]["source"] !== null &&
              !Array.isArray(value["evidence"]["source"]) &&
              typeof value["evidence"]["source"]["id"] === "string" &&
              value["evidence"]["source"]["id"].length >= 1 &&
              typeof value["evidence"]["source"]["name"] === "string" &&
              value["evidence"]["source"]["name"].length >= 1 &&
              typeof value["evidence"]["source"]["url"] === "string" &&
              local_4.test(value["evidence"]["source"]["url"]) &&
              typeof value["evidence"]["source"]["licenceName"] === "string" &&
              value["evidence"]["source"]["licenceName"].length >= 1 &&
              typeof value["evidence"]["source"]["licenceUrl"] === "string" &&
              local_5.test(value["evidence"]["source"]["licenceUrl"]) &&
              typeof value["evidence"]["source"]["attributionText"] === "string" &&
              value["evidence"]["source"]["attributionText"].length >= 1 &&
              ((typeof value["evidence"]["source"]["observedAt"] === "string" &&
                local_6.test(value["evidence"]["source"]["observedAt"])) ||
                value["evidence"]["source"]["observedAt"] === null) &&
              ((typeof value["evidence"]["source"]["publishedAt"] === "string" &&
                local_7.test(value["evidence"]["source"]["publishedAt"])) ||
                value["evidence"]["source"]["publishedAt"] === null) &&
              typeof value["evidence"]["source"]["fetchedAt"] === "string" &&
              local_8.test(value["evidence"]["source"]["fetchedAt"]) &&
              Object.getOwnPropertyNames(value["evidence"]["source"]).length === 9) ||
              value["evidence"]["source"] === null) &&
            (value["evidence"]["freshness"] === "live" ||
              value["evidence"]["freshness"] === "verified" ||
              value["evidence"]["freshness"] === "recent" ||
              value["evidence"]["freshness"] === "stale" ||
              value["evidence"]["freshness"] === "unknown") &&
            typeof value["evidence"]["confidence"] === "object" &&
            value["evidence"]["confidence"] !== null &&
            !Array.isArray(value["evidence"]["confidence"]) &&
            (value["evidence"]["confidence"]["level"] === "high" ||
              value["evidence"]["confidence"]["level"] === "medium" ||
              value["evidence"]["confidence"]["level"] === "low") &&
            ((Number.isInteger(value["evidence"]["confidence"]["score"]) &&
              value["evidence"]["confidence"]["score"] <= 100 &&
              value["evidence"]["confidence"]["score"] >= 0) ||
              value["evidence"]["confidence"]["score"] === null) &&
            Object.getOwnPropertyNames(value["evidence"]["confidence"]).length === 2 &&
            typeof value["evidence"]["details"] === "object" &&
            value["evidence"]["details"] !== null &&
            !Array.isArray(value["evidence"]["details"]) &&
            ((typeof value["evidence"]["details"]["fuel"] === "object" &&
              value["evidence"]["details"]["fuel"] !== null &&
              !Array.isArray(value["evidence"]["details"]["fuel"]) &&
              Array.isArray(
                value["evidence"]["details"]["fuel"]["availableFuelTypes"],
              ) &&
              ((array) => {
                for (const value of array)
                  if (!(
                    value === "sp95" ||
                    value === "sp95_e10" ||
                    value === "sp98" ||
                    value === "e85" ||
                    value === "diesel" ||
                    value === "premium_diesel" ||
                    value === "lpg" ||
                    value === "cng" ||
                    value === "lng"
                  )) {
                    return false;
                  }
                return true;
              })(value["evidence"]["details"]["fuel"]["availableFuelTypes"]) &&
              ((value) => {
                const set = new Set();
                for (const element of value) {
                  const hashed = hash(element);
                  if (set.has(hashed)) {
                    return false;
                  } else {
                    set.add(hashed);
                  }
                }
                return true;
              })(value["evidence"]["details"]["fuel"]["availableFuelTypes"]) &&
              ((typeof value["evidence"]["details"]["fuel"]["requestedFuel"] ===
                "object" &&
                value["evidence"]["details"]["fuel"]["requestedFuel"] !== null &&
                !Array.isArray(value["evidence"]["details"]["fuel"]["requestedFuel"]) &&
                (value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                  "sp95" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "sp95_e10" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "sp98" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "e85" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "diesel" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "premium_diesel" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "lpg" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "cng" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "lng") &&
                (typeof value["evidence"]["details"]["fuel"]["requestedFuel"][
                  "available"
                ] === "boolean" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["available"] ===
                    null) &&
                (typeof value["evidence"]["details"]["fuel"]["requestedFuel"][
                  "outOfStock"
                ] === "boolean" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "outOfStock"
                  ] === null) &&
                (value["evidence"]["details"]["fuel"]["requestedFuel"][
                  "unavailableReason"
                ] === "temporary_shortage" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "unavailableReason"
                  ] === "permanent_non_offering" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "unavailableReason"
                  ] === "unknown" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "unavailableReason"
                  ] === null) &&
                Object.getOwnPropertyNames(
                  value["evidence"]["details"]["fuel"]["requestedFuel"],
                ).length === 4) ||
                value["evidence"]["details"]["fuel"]["requestedFuel"] === null) &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["fuel"])
                .length === 2) ||
              value["evidence"]["details"]["fuel"] === null) &&
            ((typeof value["evidence"]["details"]["charging"] === "object" &&
              value["evidence"]["details"]["charging"] !== null &&
              !Array.isArray(value["evidence"]["details"]["charging"]) &&
              ((typeof value["evidence"]["details"]["charging"]["operator"] ===
                "string" &&
                value["evidence"]["details"]["charging"]["operator"].length >= 1) ||
                value["evidence"]["details"]["charging"]["operator"] === null) &&
              ((typeof value["evidence"]["details"]["charging"]["network"] ===
                "string" &&
                value["evidence"]["details"]["charging"]["network"].length >= 1) ||
                value["evidence"]["details"]["charging"]["network"] === null) &&
              Array.isArray(
                value["evidence"]["details"]["charging"]["connectorTypes"],
              ) &&
              ((array) => {
                for (const value of array)
                  if (!(
                    value === "ccs_combo_2" ||
                    value === "type_2" ||
                    value === "type_2_attached" ||
                    value === "chademo" ||
                    value === "domestic_socket" ||
                    value === "tesla_eu" ||
                    value === "unknown"
                  )) {
                    return false;
                  }
                return true;
              })(value["evidence"]["details"]["charging"]["connectorTypes"]) &&
              ((value) => {
                const set = new Set();
                for (const element of value) {
                  const hashed = hash(element);
                  if (set.has(hashed)) {
                    return false;
                  } else {
                    set.add(hashed);
                  }
                }
                return true;
              })(value["evidence"]["details"]["charging"]["connectorTypes"]) &&
              ((Number.isFinite(
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"],
              ) &&
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"] <=
                  1000 &&
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"] >= 1) ||
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"] ===
                  null) &&
              Number.isInteger(
                value["evidence"]["details"]["charging"]["totalEvses"],
              ) &&
              value["evidence"]["details"]["charging"]["totalEvses"] >= 1 &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["charging"])
                .length === 5) ||
              value["evidence"]["details"]["charging"] === null) &&
            ((typeof value["evidence"]["details"]["air"] === "object" &&
              value["evidence"]["details"]["air"] !== null &&
              !Array.isArray(value["evidence"]["details"]["air"]) &&
              (value["evidence"]["details"]["air"]["workingStatus"] === "working" ||
                value["evidence"]["details"]["air"]["workingStatus"] === "broken" ||
                value["evidence"]["details"]["air"]["workingStatus"] ===
                  "temporarily_unavailable" ||
                value["evidence"]["details"]["air"]["workingStatus"] === "unknown") &&
              (typeof value["evidence"]["details"]["air"]["free"] === "boolean" ||
                value["evidence"]["details"]["air"]["free"] === null) &&
              (value["evidence"]["details"]["air"]["access"] === "public" ||
                value["evidence"]["details"]["air"]["access"] === "customers_only" ||
                value["evidence"]["details"]["air"]["access"] === "unknown") &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["air"]).length ===
                3) ||
              value["evidence"]["details"]["air"] === null) &&
            ((typeof value["evidence"]["details"]["wash"] === "object" &&
              value["evidence"]["details"]["wash"] !== null &&
              !Array.isArray(value["evidence"]["details"]["wash"]) &&
              (value["evidence"]["details"]["wash"]["workingStatus"] === "working" ||
                value["evidence"]["details"]["wash"]["workingStatus"] === "closed" ||
                value["evidence"]["details"]["wash"]["workingStatus"] ===
                  "temporarily_unavailable" ||
                value["evidence"]["details"]["wash"]["workingStatus"] === "unknown") &&
              Array.isArray(value["evidence"]["details"]["wash"]["washTypes"]) &&
              ((array) => {
                for (const value of array)
                  if (!(
                    value === "automatic_rollers" ||
                    value === "automatic_touchless" ||
                    value === "high_pressure_self_service" ||
                    value === "hand_wash" ||
                    value === "interior_cleaning" ||
                    value === "vacuum" ||
                    value === "unknown"
                  )) {
                    return false;
                  }
                return true;
              })(value["evidence"]["details"]["wash"]["washTypes"]) &&
              ((value) => {
                const set = new Set();
                for (const element of value) {
                  const hashed = hash(element);
                  if (set.has(hashed)) {
                    return false;
                  } else {
                    set.add(hashed);
                  }
                }
                return true;
              })(value["evidence"]["details"]["wash"]["washTypes"]) &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["wash"])
                .length === 2) ||
              value["evidence"]["details"]["wash"] === null) &&
            Object.getOwnPropertyNames(value["evidence"]["details"]).length === 4 &&
            Object.getOwnPropertyNames(value["evidence"]).length === 6 &&
            Object.getOwnPropertyNames(value).length === 11
          )) {
            return false;
          }
        return true;
      })(value["results"]) &&
      Object.getOwnPropertyNames(value).length === 12
    );
  };
})();
export const validDetail: (value: unknown) => boolean = (() => {
  const local_0 = /^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
  const local_1 = /.+\/.+/;
  const local_2 = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const local_3 = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const local_4 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_5 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_6 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_7 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_8 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_9 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_10 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_11 = /^https:\/\//;
  const local_12 = /^https:\/\//;
  const local_13 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_14 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const local_15 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  function check_ServiceType(value) {
    return (
      value === "fuel" || value === "charging" || value === "air" || value === "wash"
    );
  }
  function check_NormalizedOpeningHours(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      (value["parseStatus"] === "parsed" || value["parseStatus"] === "partial") &&
      Array.isArray(value["days"]) &&
      value["days"].length <= 7 &&
      value["days"].length >= 1 &&
      ((array) => {
        for (const value of array)
          if (!check_OpeningDay(value)) {
            return false;
          }
        return true;
      })(value["days"]) &&
      typeof value["siteSchedule24Seven"] === "boolean" &&
      (typeof value["unattendedFuelPayment24Seven"] === "boolean" ||
        value["unattendedFuelPayment24Seven"] === null) &&
      typeof value["raw"] === "string" &&
      value["raw"].length >= 1 &&
      Object.getOwnPropertyNames(value).length === 5
    );
  }
  function check_OpeningDay(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Number.isInteger(value["day"]) &&
      value["day"] <= 7 &&
      value["day"] >= 1 &&
      (value["status"] === "open" ||
        value["status"] === "closed" ||
        value["status"] === "unknown") &&
      Array.isArray(value["intervals"]) &&
      ((array) => {
        for (const value of array)
          if (!check_OpeningInterval(value)) {
            return false;
          }
        return true;
      })(value["intervals"]) &&
      Object.getOwnPropertyNames(value).length === 3
    );
  }
  function check_OpeningInterval(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof value["opensAt"] === "string" &&
      local_2.test(value["opensAt"]) &&
      typeof value["closesAt"] === "string" &&
      local_3.test(value["closesAt"]) &&
      typeof value["spansFullDay"] === "boolean" &&
      Object.getOwnPropertyNames(value).length === 3
    );
  }
  function check_OpeningStatus(value) {
    return (
      value === "open" ||
      value === "closed" ||
      value === "closing_soon" ||
      value === "opening_soon" ||
      value === "unknown"
    );
  }
  return function check(value) {
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      typeof value["requestId"] === "string" &&
      value["requestId"].length >= 1 &&
      typeof value["servicePoint"] === "object" &&
      value["servicePoint"] !== null &&
      !Array.isArray(value["servicePoint"]) &&
      typeof value["servicePoint"]["id"] === "string" &&
      local_0.test(value["servicePoint"]["id"]) &&
      (value["servicePoint"]["country"] === "FR" ||
        value["servicePoint"]["country"] === "ES") &&
      Array.isArray(value["servicePoint"]["serviceTypes"]) &&
      value["servicePoint"]["serviceTypes"].length <= 4 &&
      value["servicePoint"]["serviceTypes"].length >= 1 &&
      ((array) => {
        for (const value of array)
          if (!check_ServiceType(value)) {
            return false;
          }
        return true;
      })(value["servicePoint"]["serviceTypes"]) &&
      ((value) => {
        const set = new Set();
        for (const element of value) {
          const hashed = hash(element);
          if (set.has(hashed)) {
            return false;
          } else {
            set.add(hashed);
          }
        }
        return true;
      })(value["servicePoint"]["serviceTypes"]) &&
      ((typeof value["servicePoint"]["name"] === "string" &&
        value["servicePoint"]["name"].length >= 1) ||
        value["servicePoint"]["name"] === null) &&
      ((typeof value["servicePoint"]["brand"] === "string" &&
        value["servicePoint"]["brand"].length >= 1) ||
        value["servicePoint"]["brand"] === null) &&
      typeof value["servicePoint"]["location"] === "object" &&
      value["servicePoint"]["location"] !== null &&
      !Array.isArray(value["servicePoint"]["location"]) &&
      Number.isFinite(value["servicePoint"]["location"]["latitude"]) &&
      value["servicePoint"]["location"]["latitude"] <= 90 &&
      value["servicePoint"]["location"]["latitude"] >= -90 &&
      Number.isFinite(value["servicePoint"]["location"]["longitude"]) &&
      value["servicePoint"]["location"]["longitude"] <= 180 &&
      value["servicePoint"]["location"]["longitude"] >= -180 &&
      Object.getOwnPropertyNames(value["servicePoint"]["location"]).length === 2 &&
      ((typeof value["servicePoint"]["address"] === "object" &&
        value["servicePoint"]["address"] !== null &&
        !Array.isArray(value["servicePoint"]["address"]) &&
        ((typeof value["servicePoint"]["address"]["street"] === "string" &&
          value["servicePoint"]["address"]["street"].length >= 1) ||
          value["servicePoint"]["address"]["street"] === null) &&
        ((typeof value["servicePoint"]["address"]["houseNumber"] === "string" &&
          value["servicePoint"]["address"]["houseNumber"].length >= 1) ||
          value["servicePoint"]["address"]["houseNumber"] === null) &&
        ((typeof value["servicePoint"]["address"]["postalCode"] === "string" &&
          value["servicePoint"]["address"]["postalCode"].length >= 1) ||
          value["servicePoint"]["address"]["postalCode"] === null) &&
        ((typeof value["servicePoint"]["address"]["locality"] === "string" &&
          value["servicePoint"]["address"]["locality"].length >= 1) ||
          value["servicePoint"]["address"]["locality"] === null) &&
        ((typeof value["servicePoint"]["address"]["administrativeArea"] === "string" &&
          value["servicePoint"]["address"]["administrativeArea"].length >= 1) ||
          value["servicePoint"]["address"]["administrativeArea"] === null) &&
        (value["servicePoint"]["address"]["countryCode"] === "FR" ||
          value["servicePoint"]["address"]["countryCode"] === "ES") &&
        ((typeof value["servicePoint"]["address"]["formatted"] === "string" &&
          value["servicePoint"]["address"]["formatted"].length >= 1) ||
          value["servicePoint"]["address"]["formatted"] === null) &&
        Object.getOwnPropertyNames(value["servicePoint"]["address"]).length === 7) ||
        value["servicePoint"]["address"] === null) &&
      ((typeof value["servicePoint"]["timezone"] === "string" &&
        value["servicePoint"]["timezone"].length <= 100 &&
        value["servicePoint"]["timezone"].length >= 1 &&
        local_1.test(value["servicePoint"]["timezone"])) ||
        value["servicePoint"]["timezone"] === null) &&
      typeof value["servicePoint"]["opening"] === "object" &&
      value["servicePoint"]["opening"] !== null &&
      !Array.isArray(value["servicePoint"]["opening"]) &&
      (check_NormalizedOpeningHours(value["servicePoint"]["opening"]["hours"]) ||
        value["servicePoint"]["opening"]["hours"] === null) &&
      check_OpeningStatus(value["servicePoint"]["opening"]["status"]) &&
      ((typeof value["servicePoint"]["opening"]["evaluatedAt"] === "string" &&
        local_4.test(value["servicePoint"]["opening"]["evaluatedAt"])) ||
        value["servicePoint"]["opening"]["evaluatedAt"] === null) &&
      Object.getOwnPropertyNames(value["servicePoint"]["opening"]).length === 3 &&
      (typeof value["servicePoint"]["temporaryClosure"] === "boolean" ||
        value["servicePoint"]["temporaryClosure"] === null) &&
      typeof value["servicePoint"]["lifecycle"] === "object" &&
      value["servicePoint"]["lifecycle"] !== null &&
      !Array.isArray(value["servicePoint"]["lifecycle"]) &&
      (value["servicePoint"]["lifecycle"]["status"] === "active" ||
        value["servicePoint"]["lifecycle"]["status"] === "permanently_closed" ||
        value["servicePoint"]["lifecycle"]["status"] === "temporarily_closed" ||
        value["servicePoint"]["lifecycle"]["status"] === "unverified") &&
      typeof value["servicePoint"]["lifecycle"]["changedAt"] === "string" &&
      local_5.test(value["servicePoint"]["lifecycle"]["changedAt"]) &&
      ((typeof value["servicePoint"]["lifecycle"]["closureReason"] === "string" &&
        value["servicePoint"]["lifecycle"]["closureReason"].length >= 1) ||
        value["servicePoint"]["lifecycle"]["closureReason"] === null) &&
      Object.getOwnPropertyNames(value["servicePoint"]["lifecycle"]).length === 3 &&
      typeof value["servicePoint"]["createdAt"] === "string" &&
      local_6.test(value["servicePoint"]["createdAt"]) &&
      typeof value["servicePoint"]["updatedAt"] === "string" &&
      local_7.test(value["servicePoint"]["updatedAt"]) &&
      Array.isArray(value["servicePoint"]["services"]) &&
      value["servicePoint"]["services"].length <= 4 &&
      value["servicePoint"]["services"].length >= 1 &&
      ((array) => {
        for (const value of array)
          if (!(
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            (value["serviceType"] === "fuel" ||
              value["serviceType"] === "charging" ||
              value["serviceType"] === "air" ||
              value["serviceType"] === "wash") &&
            typeof value["evidence"] === "object" &&
            value["evidence"] !== null &&
            !Array.isArray(value["evidence"]) &&
            typeof value["evidence"]["status"] === "object" &&
            value["evidence"]["status"] !== null &&
            !Array.isArray(value["evidence"]["status"]) &&
            typeof value["evidence"]["status"]["opening"] === "object" &&
            value["evidence"]["status"]["opening"] !== null &&
            !Array.isArray(value["evidence"]["status"]["opening"]) &&
            (value["evidence"]["status"]["opening"]["state"] === "open" ||
              value["evidence"]["status"]["opening"]["state"] === "closed" ||
              value["evidence"]["status"]["opening"]["state"] === "closing_soon" ||
              value["evidence"]["status"]["opening"]["state"] === "opening_soon" ||
              value["evidence"]["status"]["opening"]["state"] === "unknown") &&
            ((typeof value["evidence"]["status"]["opening"]["evaluatedAt"] ===
              "string" &&
              local_8.test(value["evidence"]["status"]["opening"]["evaluatedAt"])) ||
              value["evidence"]["status"]["opening"]["evaluatedAt"] === null) &&
            (value["evidence"]["status"]["opening"]["basis"] === "site_schedule" ||
              value["evidence"]["status"]["opening"]["basis"] === "service_schedule") &&
            Object.getOwnPropertyNames(value["evidence"]["status"]["opening"])
              .length === 3 &&
            typeof value["evidence"]["status"]["availability"] === "object" &&
            value["evidence"]["status"]["availability"] !== null &&
            !Array.isArray(value["evidence"]["status"]["availability"]) &&
            (value["evidence"]["status"]["availability"]["state"] === "available" ||
              value["evidence"]["status"]["availability"]["state"] === "unavailable" ||
              value["evidence"]["status"]["availability"]["state"] === "unknown") &&
            ((typeof value["evidence"]["status"]["availability"]["observedAt"] ===
              "string" &&
              local_9.test(
                value["evidence"]["status"]["availability"]["observedAt"],
              )) ||
              value["evidence"]["status"]["availability"]["observedAt"] === null) &&
            ((Number.isInteger(
              value["evidence"]["status"]["availability"]["availableUnits"],
            ) &&
              value["evidence"]["status"]["availability"]["availableUnits"] >= 0) ||
              value["evidence"]["status"]["availability"]["availableUnits"] === null) &&
            ((Number.isInteger(
              value["evidence"]["status"]["availability"]["totalUnits"],
            ) &&
              value["evidence"]["status"]["availability"]["totalUnits"] >= 0) ||
              value["evidence"]["status"]["availability"]["totalUnits"] === null) &&
            Object.getOwnPropertyNames(value["evidence"]["status"]["availability"])
              .length === 4 &&
            Object.getOwnPropertyNames(value["evidence"]["status"]).length === 2 &&
            ((typeof value["evidence"]["price"] === "object" &&
              value["evidence"]["price"] !== null &&
              !Array.isArray(value["evidence"]["price"]) &&
              Number.isFinite(value["evidence"]["price"]["amount"]) &&
              value["evidence"]["price"]["amount"] >= 0 &&
              value["evidence"]["price"]["currency"] === "EUR" &&
              (value["evidence"]["price"]["unit"] === "liter" ||
                value["evidence"]["price"]["unit"] === "kilogram" ||
                value["evidence"]["price"]["unit"] === "use" ||
                value["evidence"]["price"]["unit"] === "wash_program") &&
              (typeof value["evidence"]["price"]["taxIncluded"] === "boolean" ||
                value["evidence"]["price"]["taxIncluded"] === null) &&
              (typeof value["evidence"]["price"]["membershipRequired"] === "boolean" ||
                value["evidence"]["price"]["membershipRequired"] === null) &&
              ((typeof value["evidence"]["price"]["observedAt"] === "string" &&
                local_10.test(value["evidence"]["price"]["observedAt"])) ||
                value["evidence"]["price"]["observedAt"] === null) &&
              (value["evidence"]["price"]["freshness"] === "live" ||
                value["evidence"]["price"]["freshness"] === "verified" ||
                value["evidence"]["price"]["freshness"] === "recent" ||
                value["evidence"]["price"]["freshness"] === "stale" ||
                value["evidence"]["price"]["freshness"] === "unknown") &&
              (value["evidence"]["price"]["confidence"] === "high" ||
                value["evidence"]["price"]["confidence"] === "medium" ||
                value["evidence"]["price"]["confidence"] === "low") &&
              Object.getOwnPropertyNames(value["evidence"]["price"]).length === 8) ||
              value["evidence"]["price"] === null) &&
            ((typeof value["evidence"]["source"] === "object" &&
              value["evidence"]["source"] !== null &&
              !Array.isArray(value["evidence"]["source"]) &&
              typeof value["evidence"]["source"]["id"] === "string" &&
              value["evidence"]["source"]["id"].length >= 1 &&
              typeof value["evidence"]["source"]["name"] === "string" &&
              value["evidence"]["source"]["name"].length >= 1 &&
              typeof value["evidence"]["source"]["url"] === "string" &&
              local_11.test(value["evidence"]["source"]["url"]) &&
              typeof value["evidence"]["source"]["licenceName"] === "string" &&
              value["evidence"]["source"]["licenceName"].length >= 1 &&
              typeof value["evidence"]["source"]["licenceUrl"] === "string" &&
              local_12.test(value["evidence"]["source"]["licenceUrl"]) &&
              typeof value["evidence"]["source"]["attributionText"] === "string" &&
              value["evidence"]["source"]["attributionText"].length >= 1 &&
              ((typeof value["evidence"]["source"]["observedAt"] === "string" &&
                local_13.test(value["evidence"]["source"]["observedAt"])) ||
                value["evidence"]["source"]["observedAt"] === null) &&
              ((typeof value["evidence"]["source"]["publishedAt"] === "string" &&
                local_14.test(value["evidence"]["source"]["publishedAt"])) ||
                value["evidence"]["source"]["publishedAt"] === null) &&
              typeof value["evidence"]["source"]["fetchedAt"] === "string" &&
              local_15.test(value["evidence"]["source"]["fetchedAt"]) &&
              Object.getOwnPropertyNames(value["evidence"]["source"]).length === 9) ||
              value["evidence"]["source"] === null) &&
            (value["evidence"]["freshness"] === "live" ||
              value["evidence"]["freshness"] === "verified" ||
              value["evidence"]["freshness"] === "recent" ||
              value["evidence"]["freshness"] === "stale" ||
              value["evidence"]["freshness"] === "unknown") &&
            typeof value["evidence"]["confidence"] === "object" &&
            value["evidence"]["confidence"] !== null &&
            !Array.isArray(value["evidence"]["confidence"]) &&
            (value["evidence"]["confidence"]["level"] === "high" ||
              value["evidence"]["confidence"]["level"] === "medium" ||
              value["evidence"]["confidence"]["level"] === "low") &&
            ((Number.isInteger(value["evidence"]["confidence"]["score"]) &&
              value["evidence"]["confidence"]["score"] <= 100 &&
              value["evidence"]["confidence"]["score"] >= 0) ||
              value["evidence"]["confidence"]["score"] === null) &&
            Object.getOwnPropertyNames(value["evidence"]["confidence"]).length === 2 &&
            typeof value["evidence"]["details"] === "object" &&
            value["evidence"]["details"] !== null &&
            !Array.isArray(value["evidence"]["details"]) &&
            ((typeof value["evidence"]["details"]["fuel"] === "object" &&
              value["evidence"]["details"]["fuel"] !== null &&
              !Array.isArray(value["evidence"]["details"]["fuel"]) &&
              Array.isArray(
                value["evidence"]["details"]["fuel"]["availableFuelTypes"],
              ) &&
              ((array) => {
                for (const value of array)
                  if (!(
                    value === "sp95" ||
                    value === "sp95_e10" ||
                    value === "sp98" ||
                    value === "e85" ||
                    value === "diesel" ||
                    value === "premium_diesel" ||
                    value === "lpg" ||
                    value === "cng" ||
                    value === "lng"
                  )) {
                    return false;
                  }
                return true;
              })(value["evidence"]["details"]["fuel"]["availableFuelTypes"]) &&
              ((value) => {
                const set = new Set();
                for (const element of value) {
                  const hashed = hash(element);
                  if (set.has(hashed)) {
                    return false;
                  } else {
                    set.add(hashed);
                  }
                }
                return true;
              })(value["evidence"]["details"]["fuel"]["availableFuelTypes"]) &&
              ((typeof value["evidence"]["details"]["fuel"]["requestedFuel"] ===
                "object" &&
                value["evidence"]["details"]["fuel"]["requestedFuel"] !== null &&
                !Array.isArray(value["evidence"]["details"]["fuel"]["requestedFuel"]) &&
                (value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                  "sp95" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "sp95_e10" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "sp98" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "e85" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "diesel" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "premium_diesel" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "lpg" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "cng" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["fuelType"] ===
                    "lng") &&
                (typeof value["evidence"]["details"]["fuel"]["requestedFuel"][
                  "available"
                ] === "boolean" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"]["available"] ===
                    null) &&
                (typeof value["evidence"]["details"]["fuel"]["requestedFuel"][
                  "outOfStock"
                ] === "boolean" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "outOfStock"
                  ] === null) &&
                (value["evidence"]["details"]["fuel"]["requestedFuel"][
                  "unavailableReason"
                ] === "temporary_shortage" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "unavailableReason"
                  ] === "permanent_non_offering" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "unavailableReason"
                  ] === "unknown" ||
                  value["evidence"]["details"]["fuel"]["requestedFuel"][
                    "unavailableReason"
                  ] === null) &&
                Object.getOwnPropertyNames(
                  value["evidence"]["details"]["fuel"]["requestedFuel"],
                ).length === 4) ||
                value["evidence"]["details"]["fuel"]["requestedFuel"] === null) &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["fuel"])
                .length === 2) ||
              value["evidence"]["details"]["fuel"] === null) &&
            ((typeof value["evidence"]["details"]["charging"] === "object" &&
              value["evidence"]["details"]["charging"] !== null &&
              !Array.isArray(value["evidence"]["details"]["charging"]) &&
              ((typeof value["evidence"]["details"]["charging"]["operator"] ===
                "string" &&
                value["evidence"]["details"]["charging"]["operator"].length >= 1) ||
                value["evidence"]["details"]["charging"]["operator"] === null) &&
              ((typeof value["evidence"]["details"]["charging"]["network"] ===
                "string" &&
                value["evidence"]["details"]["charging"]["network"].length >= 1) ||
                value["evidence"]["details"]["charging"]["network"] === null) &&
              Array.isArray(
                value["evidence"]["details"]["charging"]["connectorTypes"],
              ) &&
              ((array) => {
                for (const value of array)
                  if (!(
                    value === "ccs_combo_2" ||
                    value === "type_2" ||
                    value === "type_2_attached" ||
                    value === "chademo" ||
                    value === "domestic_socket" ||
                    value === "tesla_eu" ||
                    value === "unknown"
                  )) {
                    return false;
                  }
                return true;
              })(value["evidence"]["details"]["charging"]["connectorTypes"]) &&
              ((value) => {
                const set = new Set();
                for (const element of value) {
                  const hashed = hash(element);
                  if (set.has(hashed)) {
                    return false;
                  } else {
                    set.add(hashed);
                  }
                }
                return true;
              })(value["evidence"]["details"]["charging"]["connectorTypes"]) &&
              ((Number.isFinite(
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"],
              ) &&
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"] <=
                  1000 &&
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"] >= 1) ||
                value["evidence"]["details"]["charging"]["maximumRatedPowerKw"] ===
                  null) &&
              Number.isInteger(
                value["evidence"]["details"]["charging"]["totalEvses"],
              ) &&
              value["evidence"]["details"]["charging"]["totalEvses"] >= 1 &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["charging"])
                .length === 5) ||
              value["evidence"]["details"]["charging"] === null) &&
            ((typeof value["evidence"]["details"]["air"] === "object" &&
              value["evidence"]["details"]["air"] !== null &&
              !Array.isArray(value["evidence"]["details"]["air"]) &&
              (value["evidence"]["details"]["air"]["workingStatus"] === "working" ||
                value["evidence"]["details"]["air"]["workingStatus"] === "broken" ||
                value["evidence"]["details"]["air"]["workingStatus"] ===
                  "temporarily_unavailable" ||
                value["evidence"]["details"]["air"]["workingStatus"] === "unknown") &&
              (typeof value["evidence"]["details"]["air"]["free"] === "boolean" ||
                value["evidence"]["details"]["air"]["free"] === null) &&
              (value["evidence"]["details"]["air"]["access"] === "public" ||
                value["evidence"]["details"]["air"]["access"] === "customers_only" ||
                value["evidence"]["details"]["air"]["access"] === "unknown") &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["air"]).length ===
                3) ||
              value["evidence"]["details"]["air"] === null) &&
            ((typeof value["evidence"]["details"]["wash"] === "object" &&
              value["evidence"]["details"]["wash"] !== null &&
              !Array.isArray(value["evidence"]["details"]["wash"]) &&
              (value["evidence"]["details"]["wash"]["workingStatus"] === "working" ||
                value["evidence"]["details"]["wash"]["workingStatus"] === "closed" ||
                value["evidence"]["details"]["wash"]["workingStatus"] ===
                  "temporarily_unavailable" ||
                value["evidence"]["details"]["wash"]["workingStatus"] === "unknown") &&
              Array.isArray(value["evidence"]["details"]["wash"]["washTypes"]) &&
              ((array) => {
                for (const value of array)
                  if (!(
                    value === "automatic_rollers" ||
                    value === "automatic_touchless" ||
                    value === "high_pressure_self_service" ||
                    value === "hand_wash" ||
                    value === "interior_cleaning" ||
                    value === "vacuum" ||
                    value === "unknown"
                  )) {
                    return false;
                  }
                return true;
              })(value["evidence"]["details"]["wash"]["washTypes"]) &&
              ((value) => {
                const set = new Set();
                for (const element of value) {
                  const hashed = hash(element);
                  if (set.has(hashed)) {
                    return false;
                  } else {
                    set.add(hashed);
                  }
                }
                return true;
              })(value["evidence"]["details"]["wash"]["washTypes"]) &&
              Object.getOwnPropertyNames(value["evidence"]["details"]["wash"])
                .length === 2) ||
              value["evidence"]["details"]["wash"] === null) &&
            Object.getOwnPropertyNames(value["evidence"]["details"]).length === 4 &&
            Object.getOwnPropertyNames(value["evidence"]).length === 6 &&
            Object.getOwnPropertyNames(value).length === 2
          )) {
            return false;
          }
        return true;
      })(value["servicePoint"]["services"]) &&
      Object.getOwnPropertyNames(value["servicePoint"]).length === 14 &&
      Object.getOwnPropertyNames(value).length === 2
    );
  };
})();

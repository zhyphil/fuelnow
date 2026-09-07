// Generated from the running API schema. Run pnpm api:types; do not edit.
export interface paths {
  "/v1/nearby": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Search nearby service points
     * @description Returns capability-aware Fuel, Charge, Air or Wash results with bounded expansion, evidence quality and explicit decision fallback metadata.
     */
    get: operations["searchNearbyServicePoints"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/v1/service-points/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /**
     * Get a canonical service point
     * @description Returns stable canonical detail and one evidence block for each declared service.
     */
    get: operations["getServicePoint"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: never;
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  searchNearbyServicePoints: {
    parameters: {
      query: {
        latitude: number;
        longitude: number;
        country?: "FR" | "ES";
        service: "fuel" | "charging" | "air" | "wash";
        fuelType?:
          | "sp95"
          | "sp95_e10"
          | "sp98"
          | "e85"
          | "diesel"
          | "premium_diesel"
          | "lpg"
          | "cng"
          | "lng";
        connectorType?:
          | "ccs_combo_2"
          | "type_2"
          | "type_2_attached"
          | "chademo"
          | "domestic_socket"
          | "tesla_eu";
        minimumPowerKw?: number;
        radius?: number;
        sort?: "nearest" | "cheapest" | "open_now" | "best";
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Default Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            country: ("FR" | "ES") | null;
            service: "fuel" | "charging" | "air" | "wash";
            fuelType:
              | (
                  | "sp95"
                  | "sp95_e10"
                  | "sp98"
                  | "e85"
                  | "diesel"
                  | "premium_diesel"
                  | "lpg"
                  | "cng"
                  | "lng"
                )
              | null;
            connectorType:
              | (
                  | "ccs_combo_2"
                  | "type_2"
                  | "type_2_attached"
                  | "chademo"
                  | "domestic_socket"
                  | "tesla_eu"
                )
              | null;
            minimumPowerKw: number | null;
            sort: "nearest" | "cheapest" | "open_now" | "best";
            search: {
              requestedRadiusMetres: number;
              usedRadiusMetres: number;
              attemptedRadiiMetres: number[];
              expanded: boolean;
              minimumCandidatesMet: boolean;
              stopReason: "minimum_candidates_met" | "maximum_radius_reached";
            };
            ranking: {
              requestedSort: "nearest" | "cheapest" | "open_now" | "best";
              appliedSort: "nearest" | "cheapest" | "open_now" | "best";
              capability: {
                state:
                  | "enabled"
                  | "conditional"
                  | "unavailable"
                  | "source_unhealthy"
                  | "legally_blocked";
                reason:
                  | (
                      | "fuel_type_required"
                      | "price_not_available_for_service"
                      | "no_eligible_fuel_price"
                      | "decision_evidence_unavailable"
                      | "availability_not_supported_in_country"
                      | "availability_source_unhealthy"
                      | "service_hours_unknown"
                      | "equipment_status_unknown"
                      | "experimental_coverage_area"
                      | "eta_provider_unavailable"
                    )
                  | null;
              };
              degraded: boolean;
              reason:
                | (
                    | "fuel_type_required"
                    | "price_not_available_for_service"
                    | "decision_evidence_unavailable"
                    | "no_eligible_fuel_price"
                    | "service_hours_unknown"
                    | "eta_provider_unavailable"
                  )
                | null;
            };
            /** SearchOutcome */
            outcome: {
              /** SearchOutcomeState */
              state: "results" | "empty";
              /** SearchSort */
              sort: "nearest" | "cheapest" | "open_now" | "best";
              /** DecisionCapability */
              capability: {
                /** CapabilityState */
                state:
                  | "enabled"
                  | "conditional"
                  | "unavailable"
                  | "source_unhealthy"
                  | "legally_blocked";
                reason:
                  | (
                      | "fuel_type_required"
                      | "price_not_available_for_service"
                      | "no_eligible_fuel_price"
                      | "decision_evidence_unavailable"
                      | "availability_not_supported_in_country"
                      | "availability_source_unhealthy"
                      | "service_hours_unknown"
                      | "equipment_status_unknown"
                      | "experimental_coverage_area"
                      | "eta_provider_unavailable"
                    )
                  | null;
              };
              candidateCount: number;
              resultCount: number;
              priceUnknownCount: number;
              openingStatusUnknownCount: number;
              holidayHoursUnknownCount: number;
              equipmentStatusUnknownCount: number;
              routeEtaUnavailableCount: number;
              warnings: (
                | "price_unknown"
                | "opening_status_unknown"
                | "holiday_hours_unknown"
                | "equipment_status_unknown"
                | "route_eta_unavailable"
              )[];
              emptyReason:
                | (
                    | "no_service_points_in_radius"
                    | "no_comparable_prices"
                    | "no_open_service_points"
                    | "opening_status_unknown"
                    | "capability_unavailable"
                    | "no_matching_service_points"
                  )
                | null;
              fallbackAction: ("expand_radius" | "show_nearest") | null;
            };
            resultCount: number;
            results: {
              address: string | null;
              id: string;
              country: "FR" | "ES";
              name: string | null;
              brand: string | null;
              location: {
                latitude: number;
                longitude: number;
              };
              lifecycleStatus:
                "active" | "permanently_closed" | "temporarily_closed" | "unverified";
              straightLineDistanceM: number;
              route: {
                status: "calculated" | "not_requested" | "unavailable" | "unreachable";
                roadDistanceM: number | null;
                etaSeconds: number | null;
                calculatedAt: string | null;
                provider: string | null;
                profile: "driving" | "driving-traffic" | null;
                trafficAware: boolean | null;
                reason:
                  | (
                      | "budget_exceeded"
                      | "invalid_response"
                      | "provider_unavailable"
                      | "rate_limited"
                      | "timeout"
                      | "unreachable"
                    )
                  | null;
              };
              recommendation: {
                formulaVersion:
                  "fuel-best-v1" | "ev-best-v1" | "limited-service-best-v1";
                score: number;
                /** RecommendationReasons */
                reasons: {
                  /** RecommendationReasonCode */
                  code:
                    | "best_lower_estimated_trip_cost"
                    | "best_lower_price"
                    | "best_shorter_distance"
                    | "best_faster_arrival"
                    | "best_open_now"
                    | "best_opens_soon"
                    | "best_live_charger_availability"
                    | "best_compatible_rated_power"
                    | "best_public_access"
                    | "best_recent_data"
                    | "best_reliable_data"
                    | "best_price_not_comparable"
                    | "best_availability_unknown"
                    | "best_service_hours_unknown"
                    | "best_service_access_unknown"
                    | "best_wash_type_unknown"
                    | "best_matches_nearest"
                    | "best_eta_unavailable"
                    | "best_time_to_solution_incomplete"
                    | "best_data_stale"
                    | "best_data_low_confidence"
                    | "best_data_expired";
                  /** RecommendationReasonKind */
                  kind: "strength" | "limitation";
                  metric: {
                    /** RecommendationMetricName */
                    name:
                      | "estimated_trip_cost_eur"
                      | "price_eur"
                      | "distance_m"
                      | "eta_seconds"
                      | "available_evse_count"
                      | "rated_power_kw"
                      | "confidence_score";
                    value: number;
                  } | null;
                }[];
              } | null;
              evidence: {
                status: {
                  opening: {
                    state:
                      "open" | "closed" | "closing_soon" | "opening_soon" | "unknown";
                    evaluatedAt: string | null;
                    basis: "site_schedule" | "service_schedule";
                  };
                  availability: {
                    state: "available" | "unavailable" | "unknown";
                    observedAt: string | null;
                    availableUnits: number | null;
                    totalUnits: number | null;
                  };
                };
                price: {
                  amount: number;
                  /** @enum {string} */
                  currency: "EUR";
                  unit: "liter" | "kilogram" | "use" | "wash_program";
                  taxIncluded: boolean | null;
                  membershipRequired: boolean | null;
                  observedAt: string | null;
                  freshness: "live" | "verified" | "recent" | "stale" | "unknown";
                  confidence: "high" | "medium" | "low";
                } | null;
                source: {
                  id: string;
                  name: string;
                  url: string;
                  licenceName: string;
                  licenceUrl: string;
                  attributionText: string;
                  observedAt: string | null;
                  publishedAt: string | null;
                  fetchedAt: string;
                } | null;
                freshness: "live" | "verified" | "recent" | "stale" | "unknown";
                confidence: {
                  level: "high" | "medium" | "low";
                  score: number | null;
                };
                details: {
                  fuel: {
                    availableFuelTypes: (
                      | "sp95"
                      | "sp95_e10"
                      | "sp98"
                      | "e85"
                      | "diesel"
                      | "premium_diesel"
                      | "lpg"
                      | "cng"
                      | "lng"
                    )[];
                    requestedFuel: {
                      fuelType:
                        | "sp95"
                        | "sp95_e10"
                        | "sp98"
                        | "e85"
                        | "diesel"
                        | "premium_diesel"
                        | "lpg"
                        | "cng"
                        | "lng";
                      available: boolean | null;
                      outOfStock: boolean | null;
                      unavailableReason:
                        | "temporary_shortage"
                        | "permanent_non_offering"
                        | "unknown"
                        | null;
                    } | null;
                  } | null;
                  charging: {
                    operator: string | null;
                    network: string | null;
                    connectorTypes: (
                      | "ccs_combo_2"
                      | "type_2"
                      | "type_2_attached"
                      | "chademo"
                      | "domestic_socket"
                      | "tesla_eu"
                      | "unknown"
                    )[];
                    maximumRatedPowerKw: number | null;
                    totalEvses: number;
                  } | null;
                  air: {
                    workingStatus:
                      "working" | "broken" | "temporarily_unavailable" | "unknown";
                    free: boolean | null;
                    access: "public" | "customers_only" | "unknown";
                  } | null;
                  wash: {
                    workingStatus:
                      "working" | "closed" | "temporarily_unavailable" | "unknown";
                    washTypes: (
                      | "automatic_rollers"
                      | "automatic_touchless"
                      | "high_pressure_self_service"
                      | "hand_wash"
                      | "interior_cleaning"
                      | "vacuum"
                      | "unknown"
                    )[];
                  } | null;
                };
              };
            }[];
          };
        };
      };
      /** @description Default Response */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
      /** @description Default Response */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
      /** @description Default Response */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
      /** @description Default Response */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
    };
  };
  getServicePoint: {
    parameters: {
      query?: {
        fuelType?:
          | "sp95"
          | "sp95_e10"
          | "sp98"
          | "e85"
          | "diesel"
          | "premium_diesel"
          | "lpg"
          | "cng"
          | "lng";
      };
      header?: never;
      path: {
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Default Response */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            servicePoint: {
              id: string;
              country: "FR" | "ES";
              serviceTypes: ("fuel" | "charging" | "air" | "wash")[];
              name: string | null;
              brand: string | null;
              location: {
                latitude: number;
                longitude: number;
              };
              address: {
                street: string | null;
                houseNumber: string | null;
                postalCode: string | null;
                locality: string | null;
                administrativeArea: string | null;
                countryCode: "FR" | "ES";
                formatted: string | null;
              } | null;
              timezone: string | null;
              opening: {
                hours: {
                  parseStatus: "parsed" | "partial";
                  days: {
                    day: number;
                    status: "open" | "closed" | "unknown";
                    intervals: {
                      opensAt: string;
                      closesAt: string;
                      spansFullDay: boolean;
                    }[];
                  }[];
                  siteSchedule24Seven: boolean;
                  unattendedFuelPayment24Seven: boolean | null;
                  raw: string;
                } | null;
                /** OpeningStatus */
                status: "open" | "closed" | "closing_soon" | "opening_soon" | "unknown";
                evaluatedAt: string | null;
              };
              temporaryClosure: boolean | null;
              lifecycle: {
                status:
                  "active" | "permanently_closed" | "temporarily_closed" | "unverified";
                /** @description ISO 8601 timestamp normalized to UTC */
                changedAt: string;
                closureReason: string | null;
              };
              /** @description ISO 8601 timestamp normalized to UTC */
              createdAt: string;
              /** @description ISO 8601 timestamp normalized to UTC */
              updatedAt: string;
              services: {
                serviceType: "fuel" | "charging" | "air" | "wash";
                evidence: {
                  status: {
                    opening: {
                      state:
                        "open" | "closed" | "closing_soon" | "opening_soon" | "unknown";
                      evaluatedAt: string | null;
                      basis: "site_schedule" | "service_schedule";
                    };
                    availability: {
                      state: "available" | "unavailable" | "unknown";
                      observedAt: string | null;
                      availableUnits: number | null;
                      totalUnits: number | null;
                    };
                  };
                  price: {
                    amount: number;
                    /** @enum {string} */
                    currency: "EUR";
                    unit: "liter" | "kilogram" | "use" | "wash_program";
                    taxIncluded: boolean | null;
                    membershipRequired: boolean | null;
                    observedAt: string | null;
                    freshness: "live" | "verified" | "recent" | "stale" | "unknown";
                    confidence: "high" | "medium" | "low";
                  } | null;
                  source: {
                    id: string;
                    name: string;
                    url: string;
                    licenceName: string;
                    licenceUrl: string;
                    attributionText: string;
                    observedAt: string | null;
                    publishedAt: string | null;
                    fetchedAt: string;
                  } | null;
                  freshness: "live" | "verified" | "recent" | "stale" | "unknown";
                  confidence: {
                    level: "high" | "medium" | "low";
                    score: number | null;
                  };
                  details: {
                    fuel: {
                      availableFuelTypes: (
                        | "sp95"
                        | "sp95_e10"
                        | "sp98"
                        | "e85"
                        | "diesel"
                        | "premium_diesel"
                        | "lpg"
                        | "cng"
                        | "lng"
                      )[];
                      requestedFuel: {
                        fuelType:
                          | "sp95"
                          | "sp95_e10"
                          | "sp98"
                          | "e85"
                          | "diesel"
                          | "premium_diesel"
                          | "lpg"
                          | "cng"
                          | "lng";
                        available: boolean | null;
                        outOfStock: boolean | null;
                        unavailableReason:
                          | "temporary_shortage"
                          | "permanent_non_offering"
                          | "unknown"
                          | null;
                      } | null;
                    } | null;
                    charging: {
                      operator: string | null;
                      network: string | null;
                      connectorTypes: (
                        | "ccs_combo_2"
                        | "type_2"
                        | "type_2_attached"
                        | "chademo"
                        | "domestic_socket"
                        | "tesla_eu"
                        | "unknown"
                      )[];
                      maximumRatedPowerKw: number | null;
                      totalEvses: number;
                    } | null;
                    air: {
                      workingStatus:
                        "working" | "broken" | "temporarily_unavailable" | "unknown";
                      free: boolean | null;
                      access: "public" | "customers_only" | "unknown";
                    } | null;
                    wash: {
                      workingStatus:
                        "working" | "closed" | "temporarily_unavailable" | "unknown";
                      washTypes: (
                        | "automatic_rollers"
                        | "automatic_touchless"
                        | "high_pressure_self_service"
                        | "hand_wash"
                        | "interior_cleaning"
                        | "vacuum"
                        | "unknown"
                      )[];
                    } | null;
                  };
                };
              }[];
            };
          };
        };
      };
      /** @description Default Response */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
      /** @description Default Response */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            /** @enum {string} */
            code: "service_point_not_found";
            /** @enum {string} */
            message: "Service point not found";
            /** @enum {boolean} */
            retryable: false;
          };
        };
      };
      /** @description Default Response */
      413: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
      /** @description Default Response */
      429: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
      /** @description Default Response */
      500: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": {
            requestId: string;
            code:
              | "invalid_request"
              | "invalid_filter_combination"
              | "request_too_large"
              | "rate_limit_exceeded"
              | "secure_transport_required"
              | "route_not_found"
              | "service_point_not_found"
              | "internal_server_error";
            message: string;
            retryable: boolean;
          };
        };
      };
    };
  };
}

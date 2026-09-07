import type { Language } from "../i18n/preferences";
import type { CapabilityReason, FuelType } from "../search/sorts";
interface SortCopy {
  fuel: string;
  anyFuel: string;
  requested: string;
  scheduled: string;
  limited: string;
  states: Record<
    "enabled" | "conditional" | "unavailable" | "source_unhealthy" | "legally_blocked",
    string
  >;
  reasons: Record<CapabilityReason | "loading", string>;
  fuels: Record<FuelType, string>;
}
export const sortMessages: Record<Language, SortCopy> = {
  en: {
    fuel: "Fuel type",
    anyFuel: "No fuel filter",
    requested: "Requested order",
    scheduled:
      "Open now is based on published schedules, not live equipment availability.",
    limited:
      "Best uses available evidence only. Missing prices or live status do not improve a recommendation.",
    states: {
      enabled: "Supported",
      conditional: "Conditional on available evidence",
      unavailable: "Unavailable",
      source_unhealthy: "Data source unavailable",
      legally_blocked: "Not enabled: usage rights restricted",
    },
    reasons: {
      loading: "Load results to check this capability.",
      fuel_type_required: "Select a fuel type first.",
      price_not_available_for_service:
        "Comparable prices are not available for this service in V1.",
      no_eligible_fuel_price: "No eligible comparable fuel prices in these results.",
      decision_evidence_unavailable:
        "There is not enough eligible evidence for this decision.",
      availability_not_supported_in_country:
        "Live availability is not enabled in this country.",
      availability_source_unhealthy: "The availability source is unavailable.",
      service_hours_unknown: "Usable service opening hours are unknown.",
      equipment_status_unknown: "Equipment status is unknown.",
      experimental_coverage_area: "Coverage is experimental in this area.",
      eta_provider_unavailable:
        "Driving time is unavailable; distance-based fallback is shown.",
    },
    fuels: {
      sp95: "Petrol 95 (E5)",
      sp95_e10: "Petrol 95 (E10)",
      sp98: "Petrol 98",
      e85: "E85",
      diesel: "Diesel",
      premium_diesel: "Premium diesel",
      lpg: "LPG",
      cng: "CNG",
      lng: "LNG",
    },
  },
  fr: {
    fuel: "Carburant",
    anyFuel: "Sans filtre carburant",
    requested: "Classement demandé",
    scheduled:
      "Ouvert maintenant repose sur les horaires publiés, pas sur la disponibilité en temps réel des équipements.",
    limited:
      "Le meilleur choix utilise uniquement les données disponibles. Un prix ou un état inconnu n’améliore pas la recommandation.",
    states: {
      enabled: "Pris en charge",
      conditional: "Selon les données disponibles",
      unavailable: "Indisponible",
      source_unhealthy: "Source de données indisponible",
      legally_blocked: "Non activé : droits d’utilisation restreints",
    },
    reasons: {
      loading: "Chargez les résultats pour vérifier cette fonction.",
      fuel_type_required: "Choisissez d’abord un carburant.",
      price_not_available_for_service:
        "Les prix de ce service ne sont pas comparables dans la V1.",
      no_eligible_fuel_price:
        "Aucun prix de carburant comparable et admissible dans ces résultats.",
      decision_evidence_unavailable:
        "Les données admissibles sont insuffisantes pour cette décision.",
      availability_not_supported_in_country:
        "La disponibilité en temps réel n’est pas activée dans ce pays.",
      availability_source_unhealthy: "La source de disponibilité est indisponible.",
      service_hours_unknown: "Les horaires utilisables du service sont inconnus.",
      equipment_status_unknown: "L’état des équipements est inconnu.",
      experimental_coverage_area: "La couverture est expérimentale dans cette zone.",
      eta_provider_unavailable:
        "Le temps de trajet est indisponible ; un classement par distance est affiché.",
    },
    fuels: {
      sp95: "SP95 (E5)",
      sp95_e10: "SP95 (E10)",
      sp98: "SP98",
      e85: "E85",
      diesel: "Gazole",
      premium_diesel: "Gazole premium",
      lpg: "GPL",
      cng: "GNC",
      lng: "GNL",
    },
  },
  es: {
    fuel: "Combustible",
    anyFuel: "Sin filtro de combustible",
    requested: "Orden solicitado",
    scheduled:
      "Abierto ahora se basa en horarios publicados, no en la disponibilidad de equipos en tiempo real.",
    limited:
      "La mejor opción usa solo los datos disponibles. Los precios o estados desconocidos no mejoran una recomendación.",
    states: {
      enabled: "Compatible",
      conditional: "Según los datos disponibles",
      unavailable: "No disponible",
      source_unhealthy: "Fuente de datos no disponible",
      legally_blocked: "No activado: derechos de uso restringidos",
    },
    reasons: {
      loading: "Carga los resultados para comprobar esta función.",
      fuel_type_required: "Selecciona primero un combustible.",
      price_not_available_for_service:
        "Este servicio no tiene precios comparables en la V1.",
      no_eligible_fuel_price:
        "No hay precios de combustible comparables y válidos en estos resultados.",
      decision_evidence_unavailable:
        "No hay suficientes datos válidos para esta decisión.",
      availability_not_supported_in_country:
        "La disponibilidad en tiempo real no está activada en este país.",
      availability_source_unhealthy: "La fuente de disponibilidad no está disponible.",
      service_hours_unknown: "Se desconocen los horarios utilizables del servicio.",
      equipment_status_unknown: "Se desconoce el estado de los equipos.",
      experimental_coverage_area: "La cobertura es experimental en esta zona.",
      eta_provider_unavailable:
        "El tiempo de conducción no está disponible; se muestra un orden por distancia.",
    },
    fuels: {
      sp95: "Gasolina 95 (E5)",
      sp95_e10: "Gasolina 95 (E10)",
      sp98: "Gasolina 98",
      e85: "E85",
      diesel: "Gasóleo",
      premium_diesel: "Gasóleo premium",
      lpg: "GLP",
      cng: "GNC",
      lng: "GNL",
    },
  },
};

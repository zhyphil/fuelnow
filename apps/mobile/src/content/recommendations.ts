import type { NearbyPoint } from "../search/presentation";
import type { Language } from "../i18n/preferences";
type Code = NonNullable<NearbyPoint["recommendation"]>["reasons"][number]["code"];
const translations = {
  best_lower_estimated_trip_cost: [
    "Lower estimated trip cost",
    "Coût total estimé plus bas",
    "Menor coste estimado del trayecto",
  ],
  best_lower_price: [
    "Lower comparable price",
    "Prix comparable plus bas",
    "Precio comparable más bajo",
  ],
  best_shorter_distance: [
    "Shorter distance",
    "Distance plus courte",
    "Menor distancia",
  ],
  best_faster_arrival: [
    "Faster estimated arrival",
    "Arrivée estimée plus rapide",
    "Llegada estimada más rápida",
  ],
  best_open_now: [
    "Open according to schedule",
    "Ouvert selon les horaires",
    "Abierto según el horario",
  ],
  best_opens_soon: [
    "Opening soon according to schedule",
    "Ouvre bientôt selon les horaires",
    "Abre pronto según el horario",
  ],
  best_live_charger_availability: [
    "Eligible live charger availability",
    "Disponibilité en direct admissible",
    "Disponibilidad de carga en directo válida",
  ],
  best_compatible_rated_power: [
    "Compatible rated power",
    "Puissance nominale compatible",
    "Potencia nominal compatible",
  ],
  best_public_access: [
    "Confirmed public access",
    "Accès public confirmé",
    "Acceso público confirmado",
  ],
  best_recent_data: ["Recent evidence", "Données récentes", "Datos recientes"],
  best_reliable_data: [
    "Reliable source evidence",
    "Données de source fiables",
    "Datos de fuente fiables",
  ],
  best_price_not_comparable: [
    "Price cannot be compared",
    "Prix non comparable",
    "Precio no comparable",
  ],
  best_availability_unknown: [
    "Availability unknown",
    "Disponibilité inconnue",
    "Disponibilidad desconocida",
  ],
  best_service_hours_unknown: [
    "Service hours unknown",
    "Horaires du service inconnus",
    "Horario del servicio desconocido",
  ],
  best_service_access_unknown: [
    "Service access unknown",
    "Accès au service inconnu",
    "Acceso al servicio desconocido",
  ],
  best_wash_type_unknown: [
    "Wash type unknown",
    "Type de lavage inconnu",
    "Tipo de lavado desconocido",
  ],
  best_matches_nearest: [
    "Best currently matches Nearest",
    "Le meilleur choix correspond actuellement au plus proche",
    "La mejor opción coincide ahora con la más cercana",
  ],
  best_eta_unavailable: [
    "Driving time unavailable",
    "Temps de trajet indisponible",
    "Tiempo de conducción no disponible",
  ],
  best_time_to_solution_incomplete: [
    "Queue and charging duration are unknown",
    "Attente et durée de recharge inconnues",
    "Espera y duración de recarga desconocidas",
  ],
  best_data_stale: ["Evidence is stale", "Données anciennes", "Datos desactualizados"],
  best_data_low_confidence: [
    "Low-confidence evidence",
    "Données à faible confiance",
    "Datos de baja confianza",
  ],
  best_data_expired: ["Evidence has expired", "Données expirées", "Datos caducados"],
} satisfies Record<Code, [string, string, string]>;
export function recommendationCopy(language: Language) {
  const index = { en: 0, fr: 1, es: 2 }[language];
  return Object.fromEntries(
    Object.entries(translations).map(([key, values]) => [key, values[index]!]),
  ) as Record<Code, string>;
}

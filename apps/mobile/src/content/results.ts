import type { Language } from "../i18n/preferences";

const en = {
  search: "Find nearby services",
  back: "Change service or location",
  title: "Nearby services",
  missing: "Choose a service and a search location first.",
  loading: "Finding nearby services…",
  error: "We could not load results. Your location has not been saved.",
  retry: "Try again",
  empty:
    "No matching results were returned in this search area. Try a different location.",
  count: "Results",
  unnamed: "Unnamed service point",
  refresh: "Refresh results",
  nearest: "Nearest",
  cheapest: "Cheapest",
  open_now: "Open now",
  best: "Best",
  ordered: "Order",
  degraded:
    "Some decision data is unavailable. The order shown is the fallback returned by the service.",
  warning:
    "Some prices, opening hours, equipment status or journey times are unknown. Do not assume availability.",
  expanded: "The search area was expanded to find more candidates.",
};
export const resultMessages: Record<Language, typeof en> = {
  en,
  fr: {
    search: "Trouver des services à proximité",
    back: "Changer de service ou de lieu",
    title: "Services à proximité",
    missing: "Choisissez d’abord un service et un lieu de recherche.",
    loading: "Recherche de services à proximité…",
    error:
      "Impossible de charger les résultats. Votre position n’a pas été enregistrée.",
    retry: "Réessayer",
    empty:
      "Aucun résultat correspondant dans cette zone de recherche. Essayez un autre lieu.",
    count: "Résultats",
    unnamed: "Point de service sans nom",
    refresh: "Actualiser les résultats",
    nearest: "Le plus proche",
    cheapest: "Le moins cher",
    open_now: "Ouvert maintenant",
    best: "Meilleur choix",
    ordered: "Classement",
    degraded:
      "Certaines données de décision sont indisponibles. Le classement affiché est celui de repli renvoyé par le service.",
    warning:
      "Certains prix, horaires, états des équipements ou temps de trajet sont inconnus. La disponibilité n’est pas garantie.",
    expanded: "La zone de recherche a été élargie pour trouver plus de candidats.",
  },
  es: {
    search: "Buscar servicios cercanos",
    back: "Cambiar servicio o ubicación",
    title: "Servicios cercanos",
    missing: "Elige primero un servicio y una ubicación de búsqueda.",
    loading: "Buscando servicios cercanos…",
    error: "No se pudieron cargar los resultados. Tu ubicación no se ha guardado.",
    retry: "Reintentar",
    empty:
      "No hay resultados coincidentes en esta zona de búsqueda. Prueba otra ubicación.",
    count: "Resultados",
    unnamed: "Punto de servicio sin nombre",
    refresh: "Actualizar resultados",
    nearest: "Más cercano",
    cheapest: "Más barato",
    open_now: "Abierto ahora",
    best: "Mejor opción",
    ordered: "Orden",
    degraded:
      "Faltan algunos datos para decidir. Se muestra el orden alternativo devuelto por el servicio.",
    warning:
      "Algunos precios, horarios, estados de equipos o tiempos de viaje son desconocidos. No se garantiza la disponibilidad.",
    expanded: "Se ha ampliado la zona de búsqueda para encontrar más candidatos.",
  },
};

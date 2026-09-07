const en = {
  useLocation: "Use my location",
  retry: "Try location again",
  cancel: "Cancel",
  settings: "Open settings",
  explanation:
    "Use your location to find nearby services. We use it for your search and route estimates, without saving a location history.",
  idle: "Location is only requested when you choose to use it.",
  requesting: "Finding your location…",
  ready: "Location ready",
  approximate: "Approximate location — distances may be less precise.",
  denied: "Location was not allowed. You can try again or choose a location manually.",
  blocked:
    "Location permission is off. You can enable it in settings or choose a location manually.",
  services_disabled: "Location services are off on this device.",
  unavailable:
    "We could not get your location. Try again or choose a location manually.",
  timeout:
    "Finding your location took too long. Try again or choose a location manually.",
};
export const locationMessages: Record<"en" | "fr" | "es", typeof en> = {
  en,
  fr: {
    useLocation: "Utiliser ma position",
    retry: "Réessayer la localisation",
    cancel: "Annuler",
    settings: "Ouvrir les réglages",
    explanation:
      "Votre position sert à trouver les services proches et à estimer les trajets, sans enregistrer d’historique de localisation.",
    idle: "Votre position n’est demandée que lorsque vous le choisissez.",
    requesting: "Recherche de votre position…",
    ready: "Position disponible",
    approximate: "Position approximative — les distances peuvent être moins précises.",
    denied: "Localisation refusée. Réessayez ou choisissez un lieu manuellement.",
    blocked:
      "Autorisation désactivée. Activez-la dans les réglages ou choisissez un lieu manuellement.",
    services_disabled: "Les services de localisation sont désactivés.",
    unavailable: "Position introuvable. Réessayez ou choisissez un lieu manuellement.",
    timeout:
      "La localisation a pris trop de temps. Réessayez ou choisissez un lieu manuellement.",
  },
  es: {
    useLocation: "Usar mi ubicación",
    retry: "Reintentar ubicación",
    cancel: "Cancelar",
    settings: "Abrir ajustes",
    explanation:
      "Usamos tu ubicación para buscar servicios cercanos y estimar rutas, sin guardar un historial de ubicaciones.",
    idle: "Solo pedimos tu ubicación cuando tú lo eliges.",
    requesting: "Buscando tu ubicación…",
    ready: "Ubicación disponible",
    approximate: "Ubicación aproximada: las distancias pueden ser menos precisas.",
    denied: "Ubicación no autorizada. Reintenta o elige un lugar manualmente.",
    blocked: "Permiso desactivado. Actívalo en ajustes o elige un lugar manualmente.",
    services_disabled: "Los servicios de ubicación están desactivados.",
    unavailable:
      "No se pudo obtener tu ubicación. Reintenta o elige un lugar manualmente.",
    timeout: "La ubicación tardó demasiado. Reintenta o elige un lugar manualmente.",
  },
};

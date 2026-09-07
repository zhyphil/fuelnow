const en = {
  choose: "Choose a location",
  heading: "Where do you need a stop?",
  search: "Find a listed city",
  notice:
    "Search starts from the selected city centre, not your current location. No location permission is needed.",
  coordinates: "Or enter coordinates",
  latitude: "Latitude",
  longitude: "Longitude",
  apply: "Use these coordinates",
  invalid: "Enter a latitude from −90 to 90 and a longitude from −180 to 180.",
  empty: "No listed city matches. You can enter coordinates below.",
  close: "Close",
  selected: "Selected search location",
  custom: "Entered coordinates",
};
export const manualMessages: Record<"en" | "fr" | "es", typeof en> = {
  en,
  fr: {
    choose: "Choisir un lieu",
    heading: "Où souhaitez-vous vous arrêter ?",
    search: "Rechercher une ville proposée",
    notice:
      "La recherche part du centre de la ville choisie, pas de votre position. Aucune autorisation de localisation n’est nécessaire.",
    coordinates: "Ou saisir des coordonnées",
    latitude: "Latitude",
    longitude: "Longitude",
    apply: "Utiliser ces coordonnées",
    invalid: "Saisissez une latitude de −90 à 90 et une longitude de −180 à 180.",
    empty:
      "Aucune ville correspondante. Vous pouvez saisir des coordonnées ci-dessous.",
    close: "Fermer",
    selected: "Lieu de recherche choisi",
    custom: "Coordonnées saisies",
  },
  es: {
    choose: "Elegir ubicación",
    heading: "¿Dónde necesitas parar?",
    search: "Buscar una ciudad de la lista",
    notice:
      "La búsqueda parte del centro de la ciudad elegida, no de tu ubicación actual. No se necesita permiso de ubicación.",
    coordinates: "O introduce coordenadas",
    latitude: "Latitud",
    longitude: "Longitud",
    apply: "Usar estas coordenadas",
    invalid: "Introduce una latitud entre −90 y 90 y una longitud entre −180 y 180.",
    empty: "No hay ciudades coincidentes. Puedes introducir coordenadas abajo.",
    close: "Cerrar",
    selected: "Ubicación de búsqueda elegida",
    custom: "Coordenadas introducidas",
  },
};

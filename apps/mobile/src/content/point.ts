import type { Language } from "../i18n/preferences";
const en = {
  addressUnknown: "Address unknown",
  straight: "Straight-line distance",
  road: "Driving distance",
  eta: "Estimated drive",
  unknown: "Unknown",
  minutes: "min",
};
export const pointMessages: Record<Language, typeof en> = {
  en,
  fr: {
    addressUnknown: "Adresse inconnue",
    straight: "Distance à vol d’oiseau",
    road: "Distance routière",
    eta: "Trajet estimé",
    unknown: "Inconnu",
    minutes: "min",
  },
  es: {
    addressUnknown: "Dirección desconocida",
    straight: "Distancia en línea recta",
    road: "Distancia por carretera",
    eta: "Trayecto estimado",
    unknown: "Desconocido",
    minutes: "min",
  },
};

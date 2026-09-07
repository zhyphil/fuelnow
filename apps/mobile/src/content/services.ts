import type { SearchService } from "../search/selection";
import type { Language } from "../i18n/preferences";

interface ServiceCopy {
  choose: string;
  selected: string;
  descriptions: Record<SearchService, string>;
  names: Record<SearchService, string>;
}
export const serviceMessages: Record<Language, ServiceCopy> = {
  en: {
    choose: "What do you need?",
    selected: "Selected service",
    names: { fuel: "Fuel", charging: "Charge", air: "Air", wash: "Wash" },
    descriptions: {
      fuel: "Find a fuel stop",
      charging: "Find a charging point",
      air: "Find tyre inflation",
      wash: "Find a car wash",
    },
  },
  fr: {
    choose: "De quoi avez-vous besoin ?",
    selected: "Service choisi",
    names: { fuel: "Carburant", charging: "Recharge", air: "Gonflage", wash: "Lavage" },
    descriptions: {
      fuel: "Trouver une station",
      charging: "Trouver une borne",
      air: "Gonfler les pneus",
      wash: "Laver la voiture",
    },
  },
  es: {
    choose: "¿Qué necesitas?",
    selected: "Servicio elegido",
    names: { fuel: "Combustible", charging: "Recarga", air: "Aire", wash: "Lavado" },
    descriptions: {
      fuel: "Buscar una gasolinera",
      charging: "Buscar un punto de recarga",
      air: "Inflar los neumáticos",
      wash: "Lavar el coche",
    },
  },
};

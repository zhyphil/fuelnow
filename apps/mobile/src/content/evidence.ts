import type { Language } from "../i18n/preferences";
const translations = {
  unknown: ["Unknown", "Inconnu", "Desconocido"],
  price: ["Price", "Prix", "Precio"],
  opening: ["Scheduled opening", "Ouverture selon horaires", "Apertura según horario"],
  availability: ["Service status", "État du service", "Estado del servicio"],
  open: ["Open", "Ouvert", "Abierto"],
  closed: ["Closed", "Fermé", "Cerrado"],
  closing_soon: ["Closing soon", "Ferme bientôt", "Cierra pronto"],
  opening_soon: ["Opening soon", "Ouvre bientôt", "Abre pronto"],
  available: [
    "Available according to source",
    "Disponible selon la source",
    "Disponible según la fuente",
  ],
  unavailable: ["Unavailable", "Indisponible", "No disponible"],
  liter: ["litre", "litre", "litro"],
  kilogram: ["kg", "kg", "kg"],
  use: ["use", "utilisation", "uso"],
  wash_program: ["wash programme", "programme de lavage", "programa de lavado"],
  membership: ["Membership required", "Adhésion requise", "Requiere membresía"],
  membershipUnknown: [
    "Membership conditions unknown",
    "Conditions d’adhésion inconnues",
    "Condiciones de membresía desconocidas",
  ],
  tax: ["Tax included", "Taxes incluses", "Impuestos incluidos"],
  noTax: ["Tax not included", "Hors taxes", "Impuestos no incluidos"],
  taxUnknown: ["Tax treatment unknown", "Taxes inconnues", "Impuestos desconocidos"],
  stale: ["Stale", "Ancien", "Desactualizado"],
  live: ["Live", "En direct", "En directo"],
  verified: ["Verified", "Vérifié", "Verificado"],
  recent: ["Recent", "Récent", "Reciente"],
} satisfies Record<string, [string, string, string]>;
export function evidenceCopy(language: Language) {
  const index = { en: 0, fr: 1, es: 2 }[language];
  return Object.fromEntries(
    Object.entries(translations).map(([key, values]) => [key, values[index]!]),
  ) as Record<keyof typeof translations, string>;
}

// Keep all visible application copy in the typed locale catalog.
const en = {
  appName: "Fuel Now",
  eyebrow: "A BETTER STOP, AHEAD",
  title: "Your next stop.\nMade simple.",
  introduction:
    "Fuel, charging and everyday car care. Find the right place, then get on your way.",
  coverage: "France & Spain",
};
export type Messages = typeof en;
export const messages: Record<"en" | "fr" | "es", Messages> = {
  en,
  fr: {
    appName: "Fuel Now",
    eyebrow: "LE BON ARRÊT, SUR VOTRE ROUTE",
    title: "Votre prochain arrêt.\nTout simplement.",
    introduction:
      "Carburant, recharge et entretien au quotidien. Trouvez le bon endroit et reprenez la route.",
    coverage: "France et Espagne",
  },
  es: {
    appName: "Fuel Now",
    eyebrow: "TU PRÓXIMA PARADA, MEJOR",
    title: "Tu próxima parada.\nAsí de fácil.",
    introduction:
      "Combustible, recarga y cuidado diario del coche. Encuentra el lugar adecuado y sigue tu camino.",
    coverage: "Francia y España",
  },
};

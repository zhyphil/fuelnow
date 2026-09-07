import type { Language } from "../i18n/preferences";

export const sourceNotices = [
  {
    id: "fr-fuel-realtime-v2",
    name: "DGCCRF — Prix des carburants",
    scope: "FR · Fuel / Air / Wash",
    state: "development",
    url: "https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/",
    licence: "Licence Ouverte 2.0",
    licenceUrl: "https://www.data.gouv.fr/pages/legal/licences/etalab-2.0",
  },
  {
    id: "es-miteco-fuel-prices",
    name: "MITECO — Precios de carburantes",
    scope: "ES · Fuel",
    state: "development",
    url: "https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    id: "fr-irve-static-pan",
    name: "Point d’Accès National — IRVE",
    scope: "FR · Charge",
    state: "development",
    url: "https://www.data.gouv.fr/datasets/beta-bases-nationales-des-points-de-recharge-pour-vehicules-electriques-en-france-irve",
    licence: "Licence Ouverte 2.0",
    licenceUrl: "https://www.data.gouv.fr/pages/legal/licences/etalab-2.0",
  },
  {
    id: "es-miteco-ripree",
    name: "MITECO — RIPREE",
    scope: "ES · Charge",
    state: "development",
    url: "https://catalogo.datosabiertos.miteco.gob.es/catalogo/es/dataset/6ee8d46f-93bd-478f-8e29-3ba4f6d8405c",
    licence: "MITECO — Aviso legal",
    licenceUrl: "https://www.datosabiertos.miteco.gob.es/es/aviso-legal.html",
  },
  {
    id: "openstreetmap",
    name: "© OpenStreetMap contributors",
    scope: "FR / ES · Air / Wash",
    state: "development",
    url: "https://www.openstreetmap.org/copyright",
    licence: "ODbL 1.0",
    licenceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  },
  {
    id: "fr-qualicharge-irve",
    name: "DGEC — QualiCharge",
    scope: "FR · Charge",
    state: "planned",
    url: "https://www.data.gouv.fr/datasets/infrastructures-de-recharge-pour-vehicules-electriques-donnees-ouvertes",
    licence: "Licence Ouverte 2.0",
    licenceUrl: "https://www.data.gouv.fr/pages/legal/licences/etalab-2.0",
  },
  {
    id: "fr-irve-dynamic-pan",
    name: "PAN — IRVE dynamique",
    scope: "FR · Charge",
    state: "disabled",
    url: "https://www.data.gouv.fr/datasets/beta-bases-nationales-des-points-de-recharge-pour-vehicules-electriques-en-france-irve",
    licence: "Licence Ouverte 2.0",
    licenceUrl: "https://www.data.gouv.fr/pages/legal/licences/etalab-2.0",
  },
  {
    id: "es-ree-reve",
    name: "Red Eléctrica — Reve / SGV",
    scope: "ES · Charge",
    state: "authorization",
    url: "https://www.mapareve.es",
    licence: "Red Eléctrica — Aviso legal",
    licenceUrl: "https://www.ree.es/es/aviso-legal",
  },
] as const;

export const sourcePageCopy: Record<
  Language,
  {
    title: string;
    back: string;
    introduction: string;
    transformation: string;
    uncertainty: string;
    source: string;
    licence: string;
    linkFailure: string;
    states: Record<(typeof sourceNotices)[number]["state"], string>;
  }
> = {
  en: {
    title: "Data sources & licences",
    back: "Back",
    introduction:
      "Source catalogue, not a live coverage guarantee. Results show the source and update information actually available for each service.",
    transformation:
      "Fuel Now normalizes and combines source fields. Publishers do not endorse Fuel Now. Source dates are not equipment verification dates.",
    uncertainty:
      "Development validation is not public release approval. OSM database-sharing obligations and final provider terms remain release gates. Missing prices, hours and equipment status stay unknown.",
    source: "Open source page",
    licence: "Read licence / terms",
    linkFailure: "Could not open the link. Please try again.",
    states: {
      development: "Validated for bounded development",
      planned: "Planned supplement — not connected",
      disabled: "Disabled pending quality review",
      authorization: "Disabled — written authorization required",
    },
  },
  fr: {
    title: "Sources de données et licences",
    back: "Retour",
    introduction:
      "Catalogue des sources, sans garantie de couverture en temps réel. Chaque résultat indique la source et les dates disponibles pour le service.",
    transformation:
      "Fuel Now normalise et combine les champs des sources, sans approbation de leurs producteurs. La date source n’est pas une vérification de l’équipement.",
    uncertainty:
      "La validation de développement ne vaut pas autorisation de publication. Les obligations OSM et les conditions finales des fournisseurs restent à vérifier. Prix, horaires et état manquants restent inconnus.",
    source: "Ouvrir la source",
    licence: "Lire la licence / les conditions",
    linkFailure: "Impossible d’ouvrir le lien. Réessayez.",
    states: {
      development: "Validée pour un développement limité",
      planned: "Complément prévu — non connecté",
      disabled: "Désactivée, qualité à vérifier",
      authorization: "Désactivée — autorisation écrite requise",
    },
  },
  es: {
    title: "Fuentes de datos y licencias",
    back: "Volver",
    introduction:
      "Catálogo de fuentes, sin garantía de cobertura en tiempo real. Cada resultado muestra la fuente y las fechas disponibles para el servicio.",
    transformation:
      "Fuel Now normaliza y combina campos de las fuentes, sin respaldo de sus editores. La fecha de la fuente no verifica el estado del equipo.",
    uncertainty:
      "La validación de desarrollo no autoriza la publicación. Las obligaciones de OSM y las condiciones finales de proveedores siguen pendientes. Los precios, horarios y estados ausentes siguen siendo desconocidos.",
    source: "Abrir la fuente",
    licence: "Leer licencia / condiciones",
    linkFailure: "No se pudo abrir el enlace. Inténtalo de nuevo.",
    states: {
      development: "Validada para desarrollo limitado",
      planned: "Complemento previsto — no conectado",
      disabled: "Desactivada, calidad pendiente",
      authorization: "Desactivada — autorización escrita necesaria",
    },
  },
};

const allowedLinks = new Set<string>(
  sourceNotices.flatMap((source) => [source.url, source.licenceUrl]),
);
export async function openSourceNotice(
  url: string,
  open: (url: string) => Promise<unknown>,
): Promise<boolean> {
  if (!allowedLinks.has(url)) return false;
  try {
    await open(url);
    return true;
  } catch {
    return false;
  }
}

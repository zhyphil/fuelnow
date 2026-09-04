import type { SourceSummary } from "../src/index.js";

export const franceSourceSummary: SourceSummary = {
  primarySourceId: "fr-fuel-realtime-v2",
  sourceName: "DGCCRF — Prix des carburants",
  sourceUrl:
    "https://data.economie.gouv.fr/explore/dataset/prix-des-carburants-en-france-flux-instantane-v2/",
  sourceObservedAt: "2026-09-03T20:20:00Z",
  sourcePublishedAt: null,
  sourceUpdatedAt: "2026-09-03T20:20:00Z",
  sourceUpdatedAtBasis: "observed",
  verifiedAt: null,
  fetchedAt: "2026-09-03T20:25:48Z",
  computedAt: "2026-09-03T20:26:00Z",
  expiresAt: "2026-09-10T20:20:00Z",
  freshness: "live",
  confidence: "high",
  confidenceScore: 90,
  licenceName: "Licence Ouverte",
  licenceUrl: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
  attributionText: "Source: DGCCRF — Prix des carburants",
};

export const spainSourceSummary: SourceSummary = {
  primarySourceId: "es-miteco-fuel-prices",
  sourceName: "MITECO — Instalaciones de suministro",
  sourceUrl:
    "https://datos.gob.es/es/catalogo/e05068001-instalaciones-de-suministro-de-combustibles-a-vehiculos-con-venta-publica",
  sourceObservedAt: null,
  sourcePublishedAt: "2026-09-03T20:45:00Z",
  sourceUpdatedAt: "2026-09-03T20:45:00Z",
  sourceUpdatedAtBasis: "published",
  verifiedAt: null,
  fetchedAt: "2026-09-03T20:52:20Z",
  computedAt: "2026-09-03T20:53:00Z",
  expiresAt: "2026-09-10T20:45:00Z",
  freshness: "recent",
  confidence: "high",
  confidenceScore: 80,
  licenceName: "Aviso legal de datos.gob.es",
  licenceUrl: "https://datos.gob.es/es/aviso-legal",
  attributionText: "Source: MITECO — Instalaciones de suministro",
};

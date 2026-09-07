import type { NearbyPoint } from "./presentation";
import type { Language } from "../i18n/preferences";
import { evidenceCopy } from "../content/evidence";
import { sortMessages } from "../content/sorts";
export type Evidence = NearbyPoint["evidence"];
export type EvidenceRow = { label: string; value: string };
export function fuelRows(evidence: Evidence, language: Language): EvidenceRow[] {
  const detail = evidence.details.fuel;
  if (!detail) return [];
  const c = evidenceCopy(language),
    fuels = sortMessages[language].fuels,
    selected = detail.requestedFuel;
  return [
    {
      label: c.fuelTypes,
      value:
        detail.availableFuelTypes.map((fuel) => fuels[fuel]).join(", ") || c.unknown,
    },
    { label: c.selectedFuel, value: selected ? fuels[selected.fuelType] : c.unknown },
    {
      label: c.fuelAvailability,
      value:
        selected?.available == null ? c.unknown : selected.available ? c.yes : c.no,
    },
    {
      label: c.stock,
      value:
        selected?.outOfStock == null
          ? c.unknown
          : selected.outOfStock
            ? c.outOfStock
            : c.notOutOfStock,
    },
    { label: c.priceObserved, value: timestamp(evidence.price?.observedAt, language) },
  ];
}
export function timestamp(value: string | null | undefined, language: Language) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime())
    ? `${date.toLocaleString(language, { timeZone: "UTC" })} UTC`
    : evidenceCopy(language).unknown;
}
export function provenanceRows(evidence: Evidence, language: Language): EvidenceRow[] {
  const c = evidenceCopy(language),
    source = evidence.source;
  return [
    { label: c.freshness, value: c[evidence.freshness] },
    { label: c.confidence, value: c[evidence.confidence.level] },
    { label: c.observed, value: timestamp(source?.observedAt, language) },
    { label: c.published, value: timestamp(source?.publishedAt, language) },
    { label: c.fetched, value: timestamp(source?.fetchedAt, language) },
    {
      label: c.source,
      value: source
        ? `${source.name} · ${source.attributionText}\n${source.url}\n${source.licenceName}\n${source.licenceUrl}`
        : c.unknown,
    },
  ];
}
export function priceText(price: Evidence["price"], language: Language) {
  const c = evidenceCopy(language);
  if (!price || !Number.isFinite(price.amount) || price.amount < 0) return c.unknown;
  const amount = price.amount.toLocaleString(language, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
  return `${amount} / ${c[price.unit]} · ${price.membershipRequired === true ? c.membership : price.membershipRequired === null ? c.membershipUnknown : ""} · ${price.taxIncluded === null ? c.taxUnknown : price.taxIncluded ? c.tax : c.noTax} · ${c[price.freshness]}`.replace(
    " ·  · ",
    " · ",
  );
}
export function statusRows(evidence: Evidence, language: Language): EvidenceRow[] {
  const c = evidenceCopy(language);
  return [
    { label: c.price, value: priceText(evidence.price, language) },
    { label: c.opening, value: c[evidence.status.opening.state] },
    { label: c.availability, value: c[evidence.status.availability.state] },
  ];
}

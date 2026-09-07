import type { NearbyPoint } from "./presentation";
import type { Language } from "../i18n/preferences";
import { evidenceCopy } from "../content/evidence";
export type Evidence = NearbyPoint["evidence"];
export type EvidenceRow = { label: string; value: string };
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

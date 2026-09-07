import type { Evidence } from "./evidence";
export function evidenceWarnings(evidence: Evidence, now = Date.now()) {
  const warnings: Array<"staleData" | "missingData" | "lowConfidence" | "expiredLive"> =
    [];
  if (evidence.freshness === "stale" || evidence.price?.freshness === "stale")
    warnings.push("staleData");
  if (
    evidence.freshness === "unknown" ||
    evidence.price === null ||
    evidence.status.opening.state === "unknown" ||
    evidence.status.availability.state === "unknown"
  )
    warnings.push("missingData");
  if (evidence.confidence.level === "low" || evidence.price?.confidence === "low")
    warnings.push("lowConfidence");
  const age = now - Date.parse(evidence.status.availability.observedAt ?? "");
  if (
    evidence.details.charging &&
    evidence.freshness === "live" &&
    (!Number.isFinite(age) || age < 0 || age > 300_000)
  )
    warnings.push("expiredLive");
  return warnings;
}

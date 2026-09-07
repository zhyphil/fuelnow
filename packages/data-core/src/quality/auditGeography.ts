import { assertValidGeoPoint, haversineDistanceMeters } from "../geo/haversine.js";
import {
  matchCanonicalServicePoint,
  type CanonicalServicePointMatchCandidate,
} from "../merge/matchServicePoint.js";

export function auditGeography(points: readonly CanonicalServicePointMatchCandidate[]) {
  if (points.length > 2000)
    throw new Error("Geography audit requires a scope of at most 2000 points");
  const findings: {
    ids: string[];
    code:
      | "invalid_coordinates"
      | "outside_v1_region"
      | "repeated_id"
      | "possible_duplicate";
    disposition: "review_required";
  }[] = [];
  const valid: CanonicalServicePointMatchCandidate[] = [],
    ids = new Set<string>();
  for (const point of points) {
    if (ids.has(point.id)) {
      findings.push({
        ids: [point.id],
        code: "repeated_id",
        disposition: "review_required",
      });
      continue;
    }
    ids.add(point.id);
    try {
      assertValidGeoPoint(point);
    } catch {
      findings.push({
        ids: [point.id],
        code: "invalid_coordinates",
        disposition: "review_required",
      });
      continue;
    }
    // Broad review envelopes, not geopolitical boundary polygons. Islands/overseas
    // outside the mainland timezone scope need review, not automatic coordinate repair.
    const inside =
      point.country === "FR"
        ? point.latitude >= 41 &&
          point.latitude <= 51.5 &&
          point.longitude >= -5.5 &&
          point.longitude <= 10
        : point.country === "ES" &&
          point.latitude >= 35.5 &&
          point.latitude <= 44 &&
          point.longitude >= -10 &&
          point.longitude <= 5;
    if (!inside) {
      findings.push({
        ids: [point.id],
        code: "outside_v1_region",
        disposition: "review_required",
      });
      continue;
    }
    valid.push(point);
  }
  const ordered = valid.sort((a, b) => a.id.localeCompare(b.id));
  for (let left = 0; left < ordered.length; left++)
    for (let right = left + 1; right < ordered.length; right++) {
      const a = ordered[left]!,
        b = ordered[right]!;
      if (
        a.country !== b.country ||
        Math.abs(a.latitude - b.latitude) > 0.01 ||
        Math.abs(a.longitude - b.longitude) > 0.02 ||
        haversineDistanceMeters(a, b) > 1000
      )
        continue;
      const match = matchCanonicalServicePoint(a, [b]);
      if (match.outcome !== "unmatched")
        findings.push({
          ids: [a.id, b.id],
          code: "possible_duplicate",
          disposition: "review_required",
        });
    }
  findings.sort(
    (a, b) =>
      a.ids.join(":").localeCompare(b.ids.join(":")) || a.code.localeCompare(b.code),
  );
  return { scanned: points.length, findingCount: findings.length, findings };
}

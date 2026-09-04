import { haversineDistanceMeters, type GeoPoint } from "../geo/haversine.js";

const MAX_ADDRESS_MATCH_DISTANCE_M = 100;
const MAX_TRUSTED_ID_DISTANCE_M = 1_000;
const AUTO_MATCH_SCORE = 75;
const AMBIGUITY_SCORE_DELTA = 5;

export interface ServicePointMatchAddress {
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  locality: string | null;
}

export interface TrustedServicePointIdentifier {
  scheme: string;
  value: string;
}

export interface ServicePointMatchSubject extends GeoPoint {
  country: "FR" | "ES";
  name: string | null;
  brand: string | null;
  address: ServicePointMatchAddress;
  trustedIdentifiers: readonly TrustedServicePointIdentifier[];
}

export interface CanonicalServicePointMatchCandidate extends ServicePointMatchSubject {
  id: string;
}

export type ServicePointMatchReason =
  | "address_exact"
  | "address_house_number_conflict"
  | "brand_exact"
  | "country_mismatch"
  | "distance_over_limit"
  | "name_exact"
  | "nearby_100m"
  | "nearby_25m"
  | "nearby_50m"
  | "proximity_without_strong_identity"
  | "trusted_identifier_exact";

export interface ScoredServicePointCandidate {
  id: string;
  distanceMeters: number;
  score: number;
  autoMatchEligible: boolean;
  reasons: readonly ServicePointMatchReason[];
}

export type ServicePointMatchDecision =
  | {
      outcome: "matched";
      servicePointId: string;
      score: number;
      reasons: readonly ServicePointMatchReason[];
      candidates: readonly ScoredServicePointCandidate[];
    }
  | {
      outcome: "review_required";
      candidateServicePointIds: readonly string[];
      score: number;
      reasons: readonly ServicePointMatchReason[];
      candidates: readonly ScoredServicePointCandidate[];
    }
  | {
      outcome: "unmatched";
      candidates: readonly ScoredServicePointCandidate[];
    };

export interface CanonicalField<T> {
  value: T | null;
  evidenceAt: string;
  confidenceScore: number;
  sourceId: string;
}

function normalizeIdentityPart(value: string | null): string | null {
  if (value === null) return null;

  const normalized = value
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

  return normalized.length === 0 ? null : normalized;
}

function equalKnown(left: string | null, right: string | null): boolean {
  const normalizedLeft = normalizeIdentityPart(left);
  const normalizedRight = normalizeIdentityPart(right);
  return normalizedLeft !== null && normalizedLeft === normalizedRight;
}

function equalKnownCompact(left: string | null, right: string | null): boolean {
  const normalizedLeft = normalizeIdentityPart(left)?.replace(/\s/g, "") ?? null;
  const normalizedRight = normalizeIdentityPart(right)?.replace(/\s/g, "") ?? null;
  return normalizedLeft !== null && normalizedLeft === normalizedRight;
}

function addressComparison(
  incoming: ServicePointMatchAddress,
  candidate: ServicePointMatchAddress,
): { exact: boolean; houseNumberConflict: boolean } {
  const baseMatches =
    equalKnownCompact(incoming.postalCode, candidate.postalCode) &&
    equalKnown(incoming.locality, candidate.locality) &&
    equalKnown(incoming.street, candidate.street);
  if (!baseMatches) {
    return { exact: false, houseNumberConflict: false };
  }

  const incomingHouseNumber =
    normalizeIdentityPart(incoming.houseNumber)?.replace(/\s/g, "") ?? null;
  const candidateHouseNumber =
    normalizeIdentityPart(candidate.houseNumber)?.replace(/\s/g, "") ?? null;
  const houseNumberConflict =
    incomingHouseNumber !== null &&
    candidateHouseNumber !== null &&
    incomingHouseNumber !== candidateHouseNumber;

  return { exact: !houseNumberConflict, houseNumberConflict };
}

function trustedIdentifierMatches(
  incoming: readonly TrustedServicePointIdentifier[],
  candidate: readonly TrustedServicePointIdentifier[],
): boolean {
  const key = ({ scheme, value }: TrustedServicePointIdentifier): string | null => {
    const normalizedScheme = normalizeIdentityPart(scheme);
    const normalizedValue = normalizeIdentityPart(value);
    return normalizedScheme === null || normalizedValue === null
      ? null
      : `${normalizedScheme}:${normalizedValue}`;
  };
  const candidateKeys = new Set(
    candidate
      .map(key)
      .filter((identifierKey): identifierKey is string => identifierKey !== null),
  );

  return incoming.some((identifier) => {
    const identifierKey = key(identifier);
    return identifierKey !== null && candidateKeys.has(identifierKey);
  });
}

function distanceReason(distanceMeters: number): {
  reason: ServicePointMatchReason;
  score: number;
} {
  if (distanceMeters <= 25) return { reason: "nearby_25m", score: 25 };
  if (distanceMeters <= 50) return { reason: "nearby_50m", score: 20 };
  return { reason: "nearby_100m", score: 10 };
}

function scoreCandidate(
  incoming: ServicePointMatchSubject,
  candidate: CanonicalServicePointMatchCandidate,
): ScoredServicePointCandidate {
  const distanceMeters = haversineDistanceMeters(incoming, candidate);
  const reasons: ServicePointMatchReason[] = [];

  if (incoming.country !== candidate.country) {
    return {
      id: candidate.id,
      distanceMeters,
      score: 0,
      autoMatchEligible: false,
      reasons: ["country_mismatch"],
    };
  }

  const identifierExact = trustedIdentifierMatches(
    incoming.trustedIdentifiers,
    candidate.trustedIdentifiers,
  );
  const address = addressComparison(incoming.address, candidate.address);

  if (address.houseNumberConflict) {
    reasons.push("address_house_number_conflict");
  }
  if (identifierExact) {
    reasons.push("trusted_identifier_exact");
  }

  const allowedDistance = identifierExact
    ? MAX_TRUSTED_ID_DISTANCE_M
    : MAX_ADDRESS_MATCH_DISTANCE_M;
  if (distanceMeters > allowedDistance) {
    reasons.push("distance_over_limit");
    return {
      id: candidate.id,
      distanceMeters,
      score: identifierExact ? 70 : 0,
      autoMatchEligible: false,
      reasons,
    };
  }

  let score = 0;
  if (identifierExact) score += 75;
  if (address.exact) {
    score += 60;
    reasons.push("address_exact");
  }

  if (distanceMeters <= MAX_ADDRESS_MATCH_DISTANCE_M) {
    const proximity = distanceReason(distanceMeters);
    score += proximity.score;
    reasons.push(proximity.reason);
  }
  if (equalKnown(incoming.name, candidate.name)) {
    score += 15;
    reasons.push("name_exact");
  }
  if (equalKnown(incoming.brand, candidate.brand)) {
    score += 10;
    reasons.push("brand_exact");
  }

  const hasStrongIdentity = identifierExact || address.exact;
  if (!hasStrongIdentity) {
    reasons.push("proximity_without_strong_identity");
  }

  const cappedScore = Math.min(score, 100);
  return {
    id: candidate.id,
    distanceMeters,
    score: cappedScore,
    autoMatchEligible: hasStrongIdentity && cappedScore >= AUTO_MATCH_SCORE,
    reasons,
  };
}

export function matchCanonicalServicePoint(
  incoming: ServicePointMatchSubject,
  candidates: readonly CanonicalServicePointMatchCandidate[],
): ServicePointMatchDecision {
  const candidateIds = candidates.map(({ id }) => id);
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new Error("Canonical match candidate IDs must be unique");
  }

  const scored = candidates.map((candidate) => scoreCandidate(incoming, candidate));
  scored.sort(
    (left, right) =>
      Number(right.autoMatchEligible) - Number(left.autoMatchEligible) ||
      right.score - left.score ||
      left.distanceMeters - right.distanceMeters ||
      left.id.localeCompare(right.id),
  );

  const eligible = scored.filter(({ autoMatchEligible }) => autoMatchEligible);
  const best = eligible[0];
  if (best === undefined) {
    return { outcome: "unmatched", candidates: scored };
  }

  const second = eligible[1];
  if (second !== undefined && best.score - second.score <= AMBIGUITY_SCORE_DELTA) {
    return {
      outcome: "review_required",
      candidateServicePointIds: [best.id, second.id],
      score: best.score,
      reasons: best.reasons,
      candidates: scored,
    };
  }

  return {
    outcome: "matched",
    servicePointId: best.id,
    score: best.score,
    reasons: best.reasons,
    candidates: scored,
  };
}

function evidenceTimestamp<T>(field: CanonicalField<T>, label: string): number {
  const timestamp = Date.parse(field.evidenceAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`${label}.evidenceAt must be a valid timestamp`);
  }
  if (
    !Number.isInteger(field.confidenceScore) ||
    field.confidenceScore < 0 ||
    field.confidenceScore > 100
  ) {
    throw new Error(`${label}.confidenceScore must be an integer from 0 to 100`);
  }
  if (field.sourceId.trim().length === 0) {
    throw new Error(`${label}.sourceId must not be blank`);
  }
  return timestamp;
}

export function selectCanonicalField<T>(
  current: CanonicalField<T>,
  incoming: CanonicalField<T>,
): CanonicalField<T> {
  const currentTimestamp = evidenceTimestamp(current, "current");
  const incomingTimestamp = evidenceTimestamp(incoming, "incoming");

  if (current.value === null && incoming.value !== null) return incoming;
  if (incoming.value === null) return current;

  if (
    incomingTimestamp > currentTimestamp &&
    incoming.confidenceScore >= current.confidenceScore
  ) {
    return incoming;
  }
  if (
    incomingTimestamp === currentTimestamp &&
    (incoming.confidenceScore > current.confidenceScore ||
      (incoming.confidenceScore === current.confidenceScore &&
        incoming.sourceId.localeCompare(current.sourceId) < 0))
  ) {
    return incoming;
  }

  return current;
}

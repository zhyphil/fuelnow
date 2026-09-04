import type { Confidence, Freshness } from "@fuel-now/contracts";

import { scoreFreshness, scoreReliability } from "./scoreDataQuality.js";

export type BestEvidenceState = "present" | "missing" | "expired";
export type BestEvidenceCriticality = "supporting" | "price" | "availability";
export type BestEvidenceDisposition = "full" | "downweighted" | "excluded";
export type BestEvidenceAdjustmentReason =
  | "missing_evidence"
  | "expired_evidence"
  | "freshness_unknown"
  | "confidence_unknown"
  | "stale_evidence"
  | "stale_critical_evidence"
  | "medium_confidence"
  | "low_confidence";

export interface BestEvidenceScoreInput {
  baseScore: number | null;
  evidenceState: BestEvidenceState;
  criticality: BestEvidenceCriticality;
  freshness: Freshness | null;
  confidence: Confidence | null;
  confidenceScore: number | null;
}

export interface BestEvidenceScoreResult {
  adjustedScore: number;
  disposition: BestEvidenceDisposition;
  freshnessMultiplier: number;
  confidenceMultiplier: number;
  reasons: BestEvidenceAdjustmentReason[];
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function excluded(reason: BestEvidenceAdjustmentReason): BestEvidenceScoreResult {
  return {
    adjustedScore: 0,
    disposition: "excluded",
    freshnessMultiplier: 0,
    confidenceMultiplier: 0,
    reasons: [reason],
  };
}

function validateEvidenceShape({
  baseScore,
  evidenceState,
  freshness,
  confidence,
  confidenceScore,
}: BestEvidenceScoreInput): void {
  if (
    baseScore !== null &&
    (!Number.isFinite(baseScore) || baseScore < 0 || baseScore > 1)
  ) {
    throw new RangeError("Best evidence base score must be null or between 0 and 1");
  }
  if (evidenceState === "missing") {
    if (
      baseScore !== null ||
      freshness !== null ||
      confidence !== null ||
      confidenceScore !== null
    ) {
      throw new Error("Missing Best evidence cannot carry a value or quality claims");
    }
    return;
  }
  if (baseScore === null) {
    throw new Error("Present or expired Best evidence must retain its base score");
  }
  if (evidenceState === "present") {
    if ((confidence === null) !== (confidenceScore === null)) {
      throw new Error("Confidence label and score must be present together");
    }
    if (freshness !== null) scoreFreshness(freshness);
    if (confidence !== null && confidenceScore !== null) {
      scoreReliability({ confidence, confidenceScore });
    }
    return;
  }
  if (freshness !== null) scoreFreshness(freshness);
  if ((confidence === null) !== (confidenceScore === null)) {
    throw new Error("Expired confidence label and score must be present together");
  }
  if (confidence !== null && confidenceScore !== null) {
    scoreReliability({ confidence, confidenceScore });
  }
}

export function adjustBestEvidenceScore(
  input: BestEvidenceScoreInput,
): BestEvidenceScoreResult {
  validateEvidenceShape(input);
  if (input.evidenceState === "missing") return excluded("missing_evidence");
  if (input.evidenceState === "expired") return excluded("expired_evidence");
  if (input.freshness === null || input.freshness === "unknown") {
    return excluded("freshness_unknown");
  }
  if (input.confidence === null || input.confidenceScore === null) {
    return excluded("confidence_unknown");
  }
  if (
    input.freshness === "stale" &&
    (input.criticality === "price" || input.criticality === "availability")
  ) {
    return excluded("stale_critical_evidence");
  }

  const reasons: BestEvidenceAdjustmentReason[] = [];
  const freshnessMultiplier = input.freshness === "stale" ? 0.5 : 1;
  if (freshnessMultiplier < 1) reasons.push("stale_evidence");

  const confidenceMultiplier =
    input.confidence === "high" ? 1 : input.confidenceScore / 100;
  if (input.confidence === "medium") reasons.push("medium_confidence");
  if (input.confidence === "low") reasons.push("low_confidence");

  return {
    adjustedScore: rounded(
      input.baseScore! * freshnessMultiplier * confidenceMultiplier,
    ),
    disposition:
      freshnessMultiplier < 1 || confidenceMultiplier < 1 ? "downweighted" : "full",
    freshnessMultiplier,
    confidenceMultiplier,
    reasons,
  };
}

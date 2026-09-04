import type { Confidence, Freshness } from "@fuel-now/contracts";

export type FreshnessScoreBasis = Freshness;
export type ReliabilityScoreBasis = Confidence;

export interface FreshnessScoreResult {
  freshnessScore: number;
  freshnessScoreBasis: FreshnessScoreBasis;
}

export interface ReliabilityScoreInput {
  confidence: Confidence;
  confidenceScore: number;
}

export interface ReliabilityScoreResult {
  reliabilityScore: number;
  reliabilityScoreBasis: ReliabilityScoreBasis;
  confidenceScore: number;
}

export const FRESHNESS_SCORE_BY_LEVEL: Readonly<Record<Freshness, number>> = {
  live: 1,
  verified: 1,
  recent: 1,
  stale: 0.5,
  unknown: 0,
};

function confidenceMatchesScore(confidence: Confidence, score: number): boolean {
  if (confidence === "high") return score >= 80;
  if (confidence === "medium") return score >= 50 && score <= 79;
  return confidence === "low" && score <= 49;
}

export function scoreFreshness(freshness: Freshness): FreshnessScoreResult {
  const freshnessScore = FRESHNESS_SCORE_BY_LEVEL[freshness];
  if (freshnessScore === undefined) {
    throw new Error(`Unsupported freshness level: ${String(freshness)}`);
  }
  return { freshnessScore, freshnessScoreBasis: freshness };
}

export function scoreReliability({
  confidence,
  confidenceScore,
}: ReliabilityScoreInput): ReliabilityScoreResult {
  if (
    !Number.isInteger(confidenceScore) ||
    confidenceScore < 0 ||
    confidenceScore > 100
  ) {
    throw new RangeError("Confidence score must be an integer from 0 to 100");
  }
  if (!confidenceMatchesScore(confidence, confidenceScore)) {
    throw new Error("Confidence label does not match its score band");
  }
  return {
    reliabilityScore: confidenceScore / 100,
    reliabilityScoreBasis: confidence,
    confidenceScore,
  };
}

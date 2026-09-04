export const PRICE_SCORE_MIN = 0;
export const PRICE_SCORE_MAX = 1;

export type PriceScoreBasis =
  "lowest_comparable_price" | "relative_to_lowest_price" | "price_unknown";

export interface PriceScoreCandidate {
  id: string;
  comparablePrice: number | null;
}

export interface ScoredPriceCandidate<
  TCandidate extends PriceScoreCandidate = PriceScoreCandidate,
> {
  candidate: TCandidate;
  priceScore: number;
  priceScoreBasis: PriceScoreBasis;
}

export interface PriceScoreResult<
  TCandidate extends PriceScoreCandidate = PriceScoreCandidate,
> {
  lowestComparablePrice: number | null;
  comparableCandidateCount: number;
  candidates: ScoredPriceCandidate<TCandidate>[];
}

function roundedScore(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function scorePrices<TCandidate extends PriceScoreCandidate>(
  candidates: readonly TCandidate[],
): PriceScoreResult<TCandidate> {
  const candidateIds = new Set<string>();
  const comparablePrices: number[] = [];
  for (const candidate of candidates) {
    if (candidateIds.has(candidate.id)) {
      throw new Error(`Duplicate PriceScore candidate id: ${candidate.id}`);
    }
    candidateIds.add(candidate.id);

    const { comparablePrice } = candidate;
    if (
      comparablePrice !== null &&
      (!Number.isFinite(comparablePrice) || comparablePrice < 0)
    ) {
      throw new RangeError("Comparable price must be finite and non-negative");
    }
    if (comparablePrice !== null) comparablePrices.push(comparablePrice);
  }

  const lowestComparablePrice =
    comparablePrices.length === 0 ? null : Math.min(...comparablePrices);

  return {
    lowestComparablePrice,
    comparableCandidateCount: comparablePrices.length,
    candidates: candidates.map((candidate) => {
      const { comparablePrice } = candidate;
      if (comparablePrice === null || lowestComparablePrice === null) {
        return {
          candidate,
          priceScore: PRICE_SCORE_MIN,
          priceScoreBasis: "price_unknown",
        };
      }
      if (comparablePrice === lowestComparablePrice) {
        return {
          candidate,
          priceScore: PRICE_SCORE_MAX,
          priceScoreBasis: "lowest_comparable_price",
        };
      }

      return {
        candidate,
        priceScore:
          lowestComparablePrice === 0
            ? PRICE_SCORE_MIN
            : roundedScore(lowestComparablePrice / comparablePrice),
        priceScoreBasis: "relative_to_lowest_price",
      };
    }),
  };
}

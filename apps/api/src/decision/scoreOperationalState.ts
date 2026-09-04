import type { AvailabilityState, OpeningStatus } from "@fuel-now/contracts";

export type OpenScoreBasis = OpeningStatus | "temporary_closure";
export type AvailabilityScoreBasis = AvailabilityState;

export interface OpenScoreInput {
  openingStatus: OpeningStatus;
  temporaryClosure?: boolean | null;
}

export interface OpenScoreResult {
  openScore: number;
  openScoreBasis: OpenScoreBasis;
}

export interface AvailabilityScoreResult {
  availabilityScore: number;
  availabilityScoreBasis: AvailabilityScoreBasis;
}

export const OPEN_SCORE_BY_STATUS: Readonly<Record<OpeningStatus, number>> = {
  open: 1,
  closing_soon: 0.75,
  opening_soon: 0.25,
  closed: 0,
  unknown: 0,
};

export const AVAILABILITY_SCORE_BY_STATE: Readonly<Record<AvailabilityState, number>> =
  {
    available: 1,
    unavailable: 0,
    out_of_stock: 0,
    occupied: 0,
    reserved: 0,
    out_of_service: 0,
    not_offered: 0,
    unknown: 0,
  };

export function scoreOpeningState({
  openingStatus,
  temporaryClosure = null,
}: OpenScoreInput): OpenScoreResult {
  if (temporaryClosure === true) {
    return { openScore: 0, openScoreBasis: "temporary_closure" };
  }
  const openScore = OPEN_SCORE_BY_STATUS[openingStatus];
  if (openScore === undefined) {
    throw new Error(`Unsupported opening status: ${String(openingStatus)}`);
  }
  return { openScore, openScoreBasis: openingStatus };
}

export function scoreAvailabilityState(
  availabilityState: AvailabilityState,
): AvailabilityScoreResult {
  const availabilityScore = AVAILABILITY_SCORE_BY_STATE[availabilityState];
  if (availabilityScore === undefined) {
    throw new Error(`Unsupported availability state: ${String(availabilityState)}`);
  }
  return { availabilityScore, availabilityScoreBasis: availabilityState };
}

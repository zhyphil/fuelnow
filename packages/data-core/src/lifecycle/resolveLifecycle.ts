export const SOURCE_RECORD_LIFECYCLE_STATUSES = [
  "active",
  "missing",
  "deleted",
  "withdrawn",
] as const;

export type SourceRecordLifecycleStatus =
  (typeof SOURCE_RECORD_LIFECYCLE_STATUSES)[number];

export type SourceRecordLifecycleEventType =
  "seen" | "omitted_from_complete_snapshot" | "explicitly_deleted" | "source_withdrawn";

export interface SourceRecordLifecycleState {
  status: SourceRecordLifecycleStatus;
  statusAt: string;
}

export interface SourceRecordLifecycleEvent {
  type: SourceRecordLifecycleEventType;
  effectiveAt: string;
}

export type ServicePointLifecycleStatus =
  "active" | "temporarily_closed" | "permanently_closed" | "unverified";

export interface ServicePointLifecycleEvidence {
  hasActiveSource: boolean;
  temporaryClosure: boolean;
  permanentClosure: boolean;
}

export type FuelAvailabilityEvidence =
  "available" | "temporary_shortage" | "permanent_non_offering" | "unknown";

export interface FuelAvailabilityState {
  available: boolean | null;
  outOfStock: boolean | null;
  unavailableReason: "temporary_shortage" | "permanent_non_offering" | null;
}

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid timestamp`);
  }
  return parsed;
}

export function resolveSourceRecordLifecycle(
  current: SourceRecordLifecycleState,
  event: SourceRecordLifecycleEvent,
): SourceRecordLifecycleState {
  const currentAt = timestamp(current.statusAt, "current.statusAt");
  const effectiveAt = timestamp(event.effectiveAt, "event.effectiveAt");

  if (effectiveAt < currentAt || current.status === "withdrawn") {
    return current;
  }

  const statusByEvent: Record<
    SourceRecordLifecycleEventType,
    SourceRecordLifecycleStatus
  > = {
    seen: "active",
    omitted_from_complete_snapshot: "missing",
    explicitly_deleted: "deleted",
    source_withdrawn: "withdrawn",
  };

  return { status: statusByEvent[event.type], statusAt: event.effectiveAt };
}

export function deriveServicePointLifecycle({
  hasActiveSource,
  temporaryClosure,
  permanentClosure,
}: ServicePointLifecycleEvidence): ServicePointLifecycleStatus {
  if (permanentClosure) return "permanently_closed";
  if (temporaryClosure) return "temporarily_closed";
  return hasActiveSource ? "active" : "unverified";
}

export function deriveFuelAvailability(
  evidence: FuelAvailabilityEvidence,
): FuelAvailabilityState {
  switch (evidence) {
    case "available":
      return { available: true, outOfStock: false, unavailableReason: null };
    case "temporary_shortage":
      return {
        available: false,
        outOfStock: true,
        unavailableReason: "temporary_shortage",
      };
    case "permanent_non_offering":
      return {
        available: false,
        outOfStock: true,
        unavailableReason: "permanent_non_offering",
      };
    case "unknown":
      return { available: null, outOfStock: null, unavailableReason: null };
  }
}

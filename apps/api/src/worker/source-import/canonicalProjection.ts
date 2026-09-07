import {
  isChargingServicePoint,
  isFuelServicePoint,
  isServicePoint,
  type ChargingCapability,
  type FuelOffer,
  type ServicePoint,
} from "@fuel-now/contracts";
import type { AdapterIssue } from "@fuel-now/data-core";
import { fuelSourcePointId } from "./projectFuelSource.js";

export interface CanonicalProjection {
  sourceRecordId: string;
  point: ServicePoint & { fuels?: FuelOffer[]; charging?: ChargingCapability };
  air: { sourceLabel: string; free?: boolean | null } | null;
  wash: { sourceLabels: string[] } | null;
  issues: AdapterIssue[];
}
export interface CanonicalProjectionEntry {
  rawPayload: unknown;
  projection: CanonicalProjection;
}

export function assertCanonicalProjection({
  rawPayload,
  projection,
}: CanonicalProjectionEntry) {
  const { point } = projection;
  if (
    point.serviceTypes.includes("fuel") !== (point.fuels !== undefined) ||
    point.serviceTypes.includes("charging") !== (point.charging !== undefined)
  )
    throw new Error("Service capability is missing");
  if (
    projection.air !== null &&
    (!projection.air.sourceLabel.trim() ||
      (projection.air.free !== undefined &&
        projection.air.free !== null &&
        typeof projection.air.free !== "boolean"))
  )
    throw new Error("Invalid Air evidence");
  if (
    projection.wash !== null &&
    (!projection.wash.sourceLabels.length ||
      projection.wash.sourceLabels.some((label) => !label.trim()))
  )
    throw new Error("Invalid Wash evidence");
  const valid =
    point.fuels !== undefined
      ? isFuelServicePoint(point)
      : point.charging !== undefined
        ? isChargingServicePoint(point)
        : isServicePoint(point);
  if (
    !valid ||
    !projection.sourceRecordId.trim() ||
    projection.sourceRecordId.length > 200 ||
    rawPayload === null ||
    typeof rawPayload !== "object" ||
    point.id !==
      fuelSourcePointId(
        point.country,
        point.sourceSummary.primarySourceId,
        projection.sourceRecordId,
      ) ||
    point.serviceTypes.includes("air") !== (projection.air !== null) ||
    point.serviceTypes.includes("wash") !== (projection.wash !== null)
  )
    throw new Error("Invalid canonical source projection");
  if (
    point.charging &&
    (point.charging.price !== null ||
      point.charging.evses.some(
        (evse) =>
          evse.status !== "unknown" ||
          evse.operational !== null ||
          evse.sourceObservedAt !== null ||
          evse.connectors.some(
            (connector) => connector.operational !== null || connector.tariffs !== null,
          ),
      ))
  )
    throw new Error("Static importer cannot publish dynamic charging evidence");
}

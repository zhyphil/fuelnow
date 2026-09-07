import { ApiFailure } from "../api/client";
export type ErrorReason =
  | "network"
  | "timeout"
  | "rateLimited"
  | "serverError"
  | "notFound"
  | "invalidResponse"
  | "requestError";
export function errorReason(error: unknown): ErrorReason {
  if (!(error instanceof ApiFailure)) return "requestError";
  if (error.kind === "network" || error.kind === "timeout") return error.kind;
  if (error.kind === "invalid_response") return "invalidResponse";
  if (error.status === 429) return "rateLimited";
  if (error.status === 404) return "notFound";
  if ((error.status ?? 0) >= 500) return "serverError";
  return "requestError";
}

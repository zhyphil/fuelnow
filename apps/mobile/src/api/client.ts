import type { operations } from "./generated";
import type { MobileConfig } from "../config/environment";
import { validNearby, validDetail } from "./generated-validation";

export type NearbyQuery = NonNullable<
  operations["searchNearbyServicePoints"]["parameters"]["query"]
>;
export type NearbyResponse =
  operations["searchNearbyServicePoints"]["responses"][200]["content"]["application/json"];
export type ServicePointResponse =
  operations["getServicePoint"]["responses"][200]["content"]["application/json"];
export type ApiFailureKind =
  "network" | "timeout" | "cancelled" | "http" | "invalid_response";

export class ApiFailure extends Error {
  public constructor(
    public readonly kind: ApiFailureKind,
    public readonly status: number | null = null,
    public readonly requestId: string | null = null,
    public readonly code: string | null = null,
  ) {
    // Do not expose precise coordinates, request URLs or arbitrary server bodies.
    super(`API request failed: ${kind}`);
    this.name = "ApiFailure";
  }
  public get retryable(): boolean {
    return (
      this.kind === "network" ||
      this.kind === "timeout" ||
      (this.kind === "http" && (this.status === 429 || (this.status ?? 0) >= 500))
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createApiClient(config: MobileConfig, fetcher: typeof fetch = fetch) {
  if (!Number.isSafeInteger(config.requestTimeoutMs) || config.requestTimeoutMs < 1) {
    throw new Error("API timeout must be a positive integer");
  }

  async function get<T>(
    path: string,
    valid: (value: Record<string, unknown>) => boolean,
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted) throw new ApiFailure("cancelled");
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, config.requestTimeoutMs);
    try {
      const response = await fetcher(`${config.apiBaseUrl}${path}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "omit",
        signal: controller.signal,
      });
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        if (controller.signal.aborted)
          throw new ApiFailure(timedOut ? "timeout" : "cancelled");
        throw new ApiFailure(
          response.ok ? "invalid_response" : "http",
          response.status,
        );
      }
      if (controller.signal.aborted)
        throw new ApiFailure(timedOut ? "timeout" : "cancelled");
      if (!response.ok) {
        const safeToken = (value: unknown) =>
          typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value)
            ? value
            : null;
        throw new ApiFailure(
          "http",
          response.status,
          isRecord(body) ? safeToken(body.requestId) : null,
          isRecord(body) ? safeToken(body.code) : null,
        );
      }
      let accepted = false;
      try {
        accepted = isRecord(body) && valid(body);
      } catch {
        /* Malformed deep responses fail closed. */
      }
      if (!accepted) throw new ApiFailure("invalid_response", response.status);
      return body as T;
    } catch (error) {
      if (error instanceof ApiFailure) throw error;
      if (controller.signal.aborted)
        throw new ApiFailure(timedOut ? "timeout" : "cancelled");
      throw new ApiFailure("network");
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
    }
  }

  return {
    nearby(query: NearbyQuery, signal?: AbortSignal): Promise<NearbyResponse> {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, String(value));
      }
      return get(
        `/v1/nearby?${params.toString()}`,
        (body) =>
          validNearby(body) &&
          typeof body.requestId === "string" &&
          body.service === query.service &&
          Array.isArray(body.results) &&
          body.resultCount === body.results.length &&
          isRecord(body.ranking) &&
          ["nearest", "cheapest", "open_now", "best"].includes(
            String(body.ranking.appliedSort),
          ) &&
          typeof body.ranking.degraded === "boolean" &&
          isRecord(body.ranking.capability) &&
          [
            "enabled",
            "conditional",
            "unavailable",
            "source_unhealthy",
            "legally_blocked",
          ].includes(String(body.ranking.capability.state)) &&
          isRecord(body.outcome) &&
          Array.isArray(body.outcome.warnings) &&
          isRecord(body.search) &&
          typeof body.search.expanded === "boolean" &&
          body.results.every(
            (point: unknown) =>
              isRecord(point) &&
              typeof point.id === "string" &&
              (point.name === null || typeof point.name === "string") &&
              (point.brand === null || typeof point.brand === "string") &&
              (point.country === "FR" || point.country === "ES"),
          ),
        signal,
      );
    },
    servicePoint(id: string, signal?: AbortSignal): Promise<ServicePointResponse> {
      if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) {
        throw new Error("Invalid service point ID");
      }
      return get(
        `/v1/service-points/${encodeURIComponent(id)}`,
        (body) =>
          validDetail(body) &&
          typeof body.requestId === "string" &&
          isRecord(body.servicePoint) &&
          body.servicePoint.id === id,
        signal,
      );
    },
  };
}

export type RouteUnavailableReason =
  | "budget_exceeded"
  | "invalid_response"
  | "provider_unavailable"
  | "rate_limited"
  | "timeout"
  | "unreachable";

export class RoutingProviderError extends Error {
  public constructor(
    public readonly reason: Exclude<
      RouteUnavailableReason,
      "budget_exceeded" | "unreachable"
    >,
    public readonly requestSent: boolean,
    public readonly retryAfterSeconds: number | null = null,
    public readonly billableElementCount: number | null = null,
  ) {
    super(`Routing provider unavailable: ${reason}`);
    this.name = "RoutingProviderError";
  }
}

export class RouteBudgetExceededError extends Error {
  public readonly code = "route_budget_exceeded";
  public readonly reason = "budget_exceeded" as const;
  public readonly requestSent = false;
  public readonly billableElementCount = 0;

  public constructor() {
    super("Route provider element budget is unavailable");
    this.name = "RouteBudgetExceededError";
  }
}

export function routingFailure(
  error: unknown,
): RouteBudgetExceededError | RoutingProviderError | null {
  if (
    error instanceof RouteBudgetExceededError ||
    error instanceof RoutingProviderError
  ) {
    return error;
  }
  return null;
}

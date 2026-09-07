import type { NearbyQuery, NearbyResponse } from "../api/client";
import type { SearchPort } from "../search/results";
import { errorReason, type ErrorReason } from "../search/errors";

type Attempt = {
  id: number;
  service: NearbyQuery["service"];
  status: "pending" | "success" | "failure" | "cancelled";
  resultCount: number | null;
  exposed: boolean;
  clicked: boolean;
  handedOff: boolean;
  startedMs: number;
  selectionMs: number | null;
  decisionMs: number | null;
  failureReason: ErrorReason | null;
};
export type BetaSnapshot = {
  enabled: boolean;
  discarded: number;
  attempts: readonly Readonly<Attempt>[];
};
export function navigationMetrics(snapshot: BetaSnapshot) {
  const eligible = snapshot.attempts.filter(
    (a) => a.exposed && a.status === "success" && (a.resultCount ?? 0) > 0,
  );
  const clicks = eligible.filter((a) => a.clicked).length;
  const handoffs = eligible.filter((a) => a.handedOff).length;
  return {
    exposedSearches: eligible.length,
    clickedSearches: clicks,
    handedOffSearches: handoffs,
    clickRate: eligible.length ? clicks / eligible.length : null,
    handoffRate: eligible.length ? handoffs / eligible.length : null,
    truncated: snapshot.discarded > 0,
    scope: "local_opt_in_session" as const,
  };
}

export function decisionMetrics(snapshot: BetaSnapshot) {
  const values = snapshot.attempts
    .flatMap((a) => (a.decisionMs === null ? [] : [a.decisionMs]))
    .sort((a, b) => a - b);
  return {
    samples: values.length,
    medianMs: values.length
      ? (values[Math.floor((values.length - 1) / 2)]! +
          values[Math.floor(values.length / 2)]!) /
        2
      : null,
    p95Ms: values.length ? values[Math.ceil(values.length * 0.95) - 1]! : null,
    undecidedSearches: snapshot.attempts.filter(
      (a) => a.exposed && (a.resultCount ?? 0) > 0 && a.decisionMs === null,
    ).length,
    appOpenToDecisionMs: null,
    definition: "request_start_to_first_navigation_click" as const,
  };
}

export function searchHealthMetrics(
  snapshot: BetaSnapshot,
  service?: NearbyQuery["service"],
) {
  const attempts = snapshot.attempts.filter((a) => !service || a.service === service);
  const succeeded = attempts.filter((a) => a.status === "success").length;
  const failed = attempts.filter((a) => a.status === "failure").length;
  const empty = attempts.filter(
    (a) => a.status === "success" && a.resultCount === 0,
  ).length;
  const failures = {
    network: 0,
    timeout: 0,
    rateLimited: 0,
    serverError: 0,
    notFound: 0,
    invalidResponse: 0,
    requestError: 0,
  };
  for (const attempt of attempts)
    if (attempt.status === "failure" && attempt.failureReason)
      failures[attempt.failureReason]++;
  return {
    attempted: attempts.length,
    succeeded,
    failed,
    empty,
    cancelled: attempts.filter((a) => a.status === "cancelled").length,
    pending: attempts.filter((a) => a.status === "pending").length,
    noResultRate: succeeded ? empty / succeeded : null,
    failureRate: succeeded + failed ? failed / (succeeded + failed) : null,
    failures,
  };
}

/** No disk, network, location, request IDs or persistent identity. */
export class BetaSession {
  private state: BetaSnapshot = { enabled: false, discarded: 0, attempts: [] };
  private sequence = 0;
  private responses = new WeakMap<NearbyResponse, number>();
  private selected: { id: number; pointId: string } | undefined;
  private listeners = new Set<() => void>();
  private epoch = 0;
  public constructor(private readonly clock: () => number = () => performance.now()) {}
  private elapsed() {
    return this.clock() - this.epoch;
  }
  private duration(start: number) {
    const value = this.elapsed() - start;
    return Number.isFinite(value) && value >= 0 && value <= 15 * 60_000
      ? Math.round(value)
      : null;
  }
  public getSnapshot = () => this.state;
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private notify() {
    this.listeners.forEach((listener) => listener());
  }
  public setEnabled(enabled: boolean) {
    this.epoch = enabled ? this.clock() : 0;
    this.state = { enabled, discarded: 0, attempts: [] };
    this.responses = new WeakMap();
    this.selected = undefined;
    this.notify();
  }
  private update(id: number | undefined, change: (a: Readonly<Attempt>) => Attempt) {
    if (!this.state.enabled || id === undefined) return;
    this.state = {
      ...this.state,
      attempts: this.state.attempts.map((a) =>
        a.id === id ? Object.freeze(change(a)) : a,
      ),
    };
    this.notify();
  }
  public begin(query: NearbyQuery): number | undefined {
    if (!this.state.enabled) return undefined;
    const id = ++this.sequence;
    this.selected = undefined;
    this.state = {
      enabled: true,
      discarded: this.state.discarded + (this.state.attempts.length === 100 ? 1 : 0),
      attempts: [
        ...this.state.attempts.slice(-99),
        Object.freeze({
          id,
          service: query.service,
          status: "pending" as const,
          resultCount: null,
          exposed: false,
          clicked: false,
          handedOff: false,
          startedMs: this.elapsed(),
          selectionMs: null,
          decisionMs: null,
          failureReason: null,
        }),
      ],
    };
    this.notify();
    return id;
  }
  public finish(
    id: number | undefined,
    outcome: "success" | "failure" | "cancelled",
    response?: NearbyResponse,
    reason?: ErrorReason,
  ) {
    this.update(id, (a) =>
      a.status !== "pending"
        ? { ...a }
        : {
            ...a,
            status: outcome,
            resultCount: response?.resultCount ?? null,
            failureReason: outcome === "failure" ? (reason ?? "requestError") : null,
          },
    );
    if (
      response &&
      id !== undefined &&
      this.state.enabled &&
      this.state.attempts.some((a) => a.id === id && a.status === "success")
    )
      this.responses.set(response, id);
  }
  public expose(response: NearbyResponse) {
    this.update(this.responses.get(response), (a) => ({ ...a, exposed: true }));
  }
  public select(response: NearbyResponse, pointId: string) {
    const id = this.responses.get(response);
    if (
      id !== undefined &&
      response.results.some((p) => p.id === pointId) &&
      this.state.attempts.some((a) => a.id === id && a.exposed)
    ) {
      this.selected = { id, pointId };
      this.update(id, (a) => ({
        ...a,
        selectionMs: a.selectionMs ?? this.duration(a.startedMs),
      }));
    }
  }
  public click(pointId: string, response?: NearbyResponse): number | undefined {
    const id = response
      ? response.results.some((p) => p.id === pointId)
        ? this.responses.get(response)
        : undefined
      : this.selected?.pointId === pointId
        ? this.selected.id
        : undefined;
    this.update(id, (a) => ({
      ...a,
      clicked: a.exposed || a.clicked,
      decisionMs: a.exposed
        ? (a.decisionMs ?? this.duration(a.startedMs))
        : a.decisionMs,
    }));
    return id;
  }
  public handoff(id: number | undefined, accepted: boolean) {
    this.update(id, (a) => ({
      ...a,
      handedOff: a.handedOff || (a.clicked && accepted),
    }));
  }
}

export function observeSearch(port: SearchPort, session: BetaSession): SearchPort {
  return async (query, signal) => {
    if (signal.aborted) return port(query, signal);
    const id = session.begin(query);
    const cancel = () => session.finish(id, "cancelled");
    signal.addEventListener("abort", cancel, { once: true });
    try {
      const response = await port(query, signal);
      session.finish(id, signal.aborted ? "cancelled" : "success", response);
      return response;
    } catch (error) {
      session.finish(
        id,
        signal.aborted ? "cancelled" : "failure",
        undefined,
        errorReason(error),
      );
      throw error;
    } finally {
      signal.removeEventListener("abort", cancel);
    }
  };
}

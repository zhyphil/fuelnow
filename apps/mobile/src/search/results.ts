import { ApiFailure, type NearbyQuery, type NearbyResponse } from "../api/client";

export type ResourceState<T> =
  | { status: "idle" }
  | { status: "loading"; refreshing?: boolean }
  | { status: "ready"; response: T }
  | { status: "error"; retryable: boolean };
export type SearchState = ResourceState<NearbyResponse>;
export type SearchPort = (
  query: NearbyQuery,
  signal: AbortSignal,
) => Promise<NearbyResponse>;

export class ResourceController<Query, Response> {
  private state: ResourceState<Response> = { status: "idle" };
  private listeners = new Set<() => void>();
  private active: AbortController | null = null;
  public constructor(
    private readonly search: (query: Query, signal: AbortSignal) => Promise<Response>,
  ) {}
  public getSnapshot = () => this.state;
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: ResourceState<Response>) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  public clear = () => {
    this.active?.abort();
    this.active = null;
    this.set({ status: "idle" });
  };
  public run = async (query: Query) => {
    this.active?.abort();
    const request = new AbortController();
    this.active = request;
    this.set(
      this.state.status === "ready"
        ? { status: "loading", refreshing: true }
        : { status: "loading" },
    );
    try {
      const response = await this.search(query, request.signal);
      if (!request.signal.aborted) this.set({ status: "ready", response });
    } catch (error) {
      if (!request.signal.aborted)
        this.set({
          status: "error",
          retryable: error instanceof ApiFailure && error.retryable,
        });
    } finally {
      if (this.active === request) this.active = null;
    }
  };
}
export class SearchController extends ResourceController<NearbyQuery, NearbyResponse> {}

export function resultTitle(
  point: NearbyResponse["results"][number],
  fallback: string,
) {
  return point.name?.trim() || point.brand?.trim() || fallback;
}

import { ApiFailure, type NearbyQuery, type NearbyResponse } from "../api/client";

export type SearchState =
  | { status: "idle" | "loading" }
  | { status: "ready"; response: NearbyResponse }
  | { status: "error"; retryable: boolean };
export type SearchPort = (
  query: NearbyQuery,
  signal: AbortSignal,
) => Promise<NearbyResponse>;

export class SearchController {
  private state: SearchState = { status: "idle" };
  private listeners = new Set<() => void>();
  private active: AbortController | null = null;
  public constructor(private readonly search: SearchPort) {}
  public getSnapshot = () => this.state;
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private set(state: SearchState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  public clear = () => {
    this.active?.abort();
    this.active = null;
    this.set({ status: "idle" });
  };
  public run = async (query: NearbyQuery) => {
    this.active?.abort();
    const request = new AbortController();
    this.active = request;
    this.set({ status: "loading" });
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

export function resultTitle(
  point: NearbyResponse["results"][number],
  fallback: string,
) {
  return point.name?.trim() || point.brand?.trim() || fallback;
}

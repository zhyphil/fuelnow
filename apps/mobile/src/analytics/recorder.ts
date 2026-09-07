import { validPointId } from "../search/detail";
import { BetaSession } from "./beta";
export type ProductEvent = {
  type:
    "search_exposure" | "result_selection" | "navigation_click" | "navigation_handoff";
  service?: "fuel" | "charging" | "air" | "wash";
  sort?: "nearest" | "cheapest" | "open_now" | "best";
  resultCount?: number;
  pointId?: string;
  success?: boolean;
};
export class SessionRecorder {
  public readonly beta = new BetaSession();
  private state: { enabled: boolean; events: readonly ProductEvent[] } = {
    enabled: false,
    events: [],
  };
  private seen = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();
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
  public setEnabled = (enabled: boolean) => {
    this.beta.setEnabled(enabled);
    clearTimeout(this.timer);
    this.seen.clear();
    this.state = { enabled, events: [] };
    if (enabled) this.timer = setTimeout(() => this.setEnabled(false), 15 * 60_000);
    this.notify();
  };
  public record = (event: ProductEvent, exposureId?: string) => {
    if (!this.state.enabled) return;
    if (exposureId && this.seen.has(exposureId)) return;
    if (exposureId) {
      this.seen.add(exposureId);
      if (this.seen.size > 100) this.seen.delete(this.seen.values().next().value!);
    }
    // Reconstruct an allowlisted event: never spread caller data or request bodies.
    const safe: ProductEvent = { type: event.type };
    if (
      ![
        "search_exposure",
        "result_selection",
        "navigation_click",
        "navigation_handoff",
      ].includes(event.type)
    )
      return;
    if (event.service && ["fuel", "charging", "air", "wash"].includes(event.service))
      safe.service = event.service;
    if (event.sort && ["nearest", "cheapest", "open_now", "best"].includes(event.sort))
      safe.sort = event.sort;
    if (
      Number.isSafeInteger(event.resultCount) &&
      event.resultCount! >= 0 &&
      event.resultCount! <= 500
    )
      safe.resultCount = event.resultCount!;
    if (validPointId(event.pointId)) safe.pointId = event.pointId;
    if (typeof event.success === "boolean") safe.success = event.success;
    this.state = {
      enabled: true,
      events: [...this.state.events.slice(-99), Object.freeze(safe)],
    };
    this.notify();
  };
}
export const analytics = new SessionRecorder();

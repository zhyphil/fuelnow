export interface Origin {
  latitude: number;
  longitude: number;
  accuracyMetres: number | null;
  source: "gps";
}

export type LocationFailure =
  "denied" | "blocked" | "services_disabled" | "unavailable" | "timeout";
export type LocationState =
  | { status: "idle" | "requesting" }
  | { status: "ready"; origin: Origin }
  | { status: LocationFailure };

export interface LocationPort {
  permission(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  requestPermission(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  servicesEnabled(): Promise<boolean>;
  position(
    signal: AbortSignal,
  ): Promise<{ latitude: number; longitude: number; accuracyMetres: number | null }>;
}

export class LocationError extends Error {
  public constructor(public readonly reason: LocationFailure) {
    super(reason);
  }
}

export class LocationController {
  private state: LocationState = { status: "idle" };
  private listeners = new Set<() => void>();
  private active: AbortController | null = null;
  public constructor(private readonly port: LocationPort) {}
  public getSnapshot = (): LocationState => this.state;
  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(state: LocationState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
  public clear = () => {
    this.active?.abort();
    this.active = null;
    this.update({ status: "idle" });
  };
  public request = async () => {
    if (this.active) return;
    const controller = new AbortController();
    this.active = controller;
    this.update({ status: "requesting" });
    try {
      let permission = await this.port.permission();
      if (controller.signal.aborted) return;
      if (!permission.granted && permission.canAskAgain) {
        permission = await this.port.requestPermission();
      }
      if (controller.signal.aborted) return;
      if (!permission.granted)
        throw new LocationError(permission.canAskAgain ? "denied" : "blocked");
      if (!(await this.port.servicesEnabled()))
        throw new LocationError("services_disabled");
      if (controller.signal.aborted) return;
      const position = await this.port.position(controller.signal);
      if (controller.signal.aborted) return;
      if (
        !Number.isFinite(position.latitude) ||
        Math.abs(position.latitude) > 90 ||
        !Number.isFinite(position.longitude) ||
        Math.abs(position.longitude) > 180 ||
        (position.accuracyMetres !== null &&
          (!Number.isFinite(position.accuracyMetres) || position.accuracyMetres < 0))
      ) {
        throw new LocationError("unavailable");
      }
      this.update({ status: "ready", origin: { ...position, source: "gps" } });
    } catch (error) {
      if (!controller.signal.aborted)
        this.update({
          status: error instanceof LocationError ? error.reason : "unavailable",
        });
    } finally {
      if (this.active === controller) this.active = null;
    }
  };
}

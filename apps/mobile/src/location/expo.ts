import * as Location from "expo-location";
import { LocationError, type LocationPort } from "./controller";

export const expoLocation: LocationPort = {
  permission: Location.getForegroundPermissionsAsync,
  requestPermission: Location.requestForegroundPermissionsAsync,
  servicesEnabled: Location.hasServicesEnabledAsync,
  position(signal) {
    return new Promise((resolve, reject) => {
      let subscription: Location.LocationSubscription | undefined;
      let settled = false;
      const finish = (failure?: LocationError, position?: Location.LocationObject) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
        subscription?.remove();
        if (failure) reject(failure);
        else if (position)
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMetres: position.coords.accuracy,
          });
      };
      const cancel = () => finish(new LocationError("unavailable"));
      const timer = setTimeout(() => finish(new LocationError("timeout")), 10_000);
      signal.addEventListener("abort", cancel, { once: true });
      if (signal.aborted) {
        cancel();
        return;
      }
      // One foreground fix at balanced accuracy. Remove the listener on every
      // exit, including an early callback before subscription creation resolves.
      void Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced },
        (position) => finish(undefined, position),
        () => finish(new LocationError("unavailable")),
      )
        .then((value) => {
          subscription = value;
          if (settled) value.remove();
        })
        .catch(() => finish(new LocationError("unavailable")));
    });
  },
};

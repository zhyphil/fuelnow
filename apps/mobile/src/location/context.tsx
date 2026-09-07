import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { LocationController } from "./controller";
import { expoLocation } from "./expo";

const Context = createContext<LocationController | null>(null);
export function LocationProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new LocationController(expoLocation));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") controller.clear();
    });
    return () => {
      subscription.remove();
      controller.clear();
    };
  }, [controller]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}
export function useLocation() {
  const controller = useContext(Context);
  if (!controller) throw new Error("LocationProvider is required");
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return {
    state,
    request: controller.request,
    clear: controller.clear,
    selectManual: controller.selectManual,
  };
}

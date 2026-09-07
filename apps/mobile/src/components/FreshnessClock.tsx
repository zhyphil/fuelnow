import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
const Clock = createContext<number | null>(null);
export function FreshnessClock({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <Clock.Provider value={now}>{children}</Clock.Provider>;
}
export function useFreshnessClock() {
  return useContext(Clock) ?? Date.now();
}

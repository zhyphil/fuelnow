import { createContext, useContext, useState, type ReactNode } from "react";
import type { SearchService } from "./selection";

const Context = createContext<{
  service: SearchService | null;
  selectService: (service: SearchService) => void;
} | null>(null);
export function SearchProvider({ children }: { children: ReactNode }) {
  const [service, selectService] = useState<SearchService | null>(null);
  return (
    <Context.Provider value={{ service, selectService }}>{children}</Context.Provider>
  );
}
export function useSearchSelection() {
  const context = useContext(Context);
  if (!context) throw new Error("SearchProvider is required");
  return context;
}

import React, { createContext } from "react";
import { Dependencies } from "../dependencies/Dependencies.type";

export const DependenciesContext = createContext<Dependencies | null>(null);

interface DependenciesProviderProps {
  dependencies: Dependencies;
  children: React.ReactNode;
}

export function DependenciesProvider({ dependencies, children }: DependenciesProviderProps) {
  return <DependenciesContext.Provider value={dependencies}>{children}</DependenciesContext.Provider>;
}

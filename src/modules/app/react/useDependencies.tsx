import { useContext } from "react";
import { DependenciesContext } from "./DependenciesProvider";

export const useDependencies = () => {
  const deps = useContext(DependenciesContext);
  if (!deps) throw new Error("useDependencies must be used within a DependenciesProvider");
  return deps;
};

import { buildDevDependencies } from "./dependencies.dev";
import { Dependencies } from "./Dependencies.type";

// Same in-memory shape as dev today; kept as its own profile so component
// tests can override individual adapters without touching dev wiring.
export const buildTestDependencies = (): Dependencies => buildDevDependencies();

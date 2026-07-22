import { ISO8601 } from "@/types/common";

export interface AppReadiness {
  lastSyncAt: ISO8601 | null;
  languageSetByProfile: boolean;
}

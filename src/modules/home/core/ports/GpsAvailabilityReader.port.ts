import { Result } from "@/types/Result";

export interface GpsAvailabilityReader {
  isAvailable(): Promise<Result<boolean, { type: "READ_FAILED" }>>;
  /** Returns an unsubscribe function. */
  subscribe(onChange: (available: boolean) => void): () => void;
}

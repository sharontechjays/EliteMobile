import { Result } from "@/types/Result";

export interface BatteryReader {
  getLevelPercent(): Promise<Result<number, { type: "READ_FAILED" }>>;
  /** Returns an unsubscribe function. */
  subscribe(onChange: (percent: number) => void): () => void;
}

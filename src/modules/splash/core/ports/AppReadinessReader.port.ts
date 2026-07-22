import { Result } from "@/types/Result";
import { AppReadiness } from "../entities/AppReadiness.entity";

export interface AppReadinessReader {
  read(): Promise<Result<AppReadiness, { type: "READ_FAILED" }>>;
}

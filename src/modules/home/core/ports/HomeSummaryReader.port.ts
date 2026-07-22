import { Result } from "@/types/Result";
import { HomeSummary } from "../entities/HomeSummary.entity";

export interface HomeSummaryReader {
  today(): Promise<Result<HomeSummary, { type: "READ_FAILED" }>>;
}

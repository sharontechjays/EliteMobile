import { Result } from "@/types/Result";
import { DailyTimesheet } from "../entities/TimesheetEntry.entity";

export interface TimesheetReader {
  read(): Promise<Result<DailyTimesheet, { type: "READ_FAILED" }>>;
}

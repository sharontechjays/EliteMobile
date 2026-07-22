import { Result } from "@/types/Result";
import { DailyTimesheet } from "../entities/TimesheetEntry.entity";
import { TimesheetReader } from "../ports/TimesheetReader.port";

export class GetDailyTimesheetUseCase {
  constructor(private readonly reader: TimesheetReader) {}

  async execute(): Promise<Result<DailyTimesheet, { type: "READ_FAILED" }>> {
    return this.reader.read();
  }
}

import { Result, ok } from "@/types/Result";
import { DailyTimesheet } from "../../core/entities/TimesheetEntry.entity";
import { TimesheetReader } from "../../core/ports/TimesheetReader.port";

// Stays language-neutral by design (see InMemoryHomeSummary.adapter.ts's own comment for the
// full rationale) — non-job entry `label`s below ("Clock-in"/"Clock-out"/"Lunch"/"Travel") are
// mock English content never actually displayed; useTimesheet.viewModel.tsx re-derives the
// real, translated label from `statusKind` (and entry position, for clock-in vs. clock-out).
// "job" entries are real ticket names (proper nouns) and are displayed as-is.
const MOCK_TIMESHEET: DailyTimesheet = {
  crew: [
    {
      id: "roy-brown",
      name: "Roy Brown",
      totalHoursLabel: "8.5h",
      entries: [
        { time: "7:02", label: "Clock-in", statusKind: "neutral" },
        { time: "7:02", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "11:00", label: "Lunch", statusKind: "idle" },
        { time: "11:30", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "3:15", label: "Travel", statusKind: "travel" },
        { time: "3:45", label: "Cornerstone Mall", statusKind: "job" },
        { time: "4:30", label: "Clock-out", statusKind: "neutral" },
      ],
    },
    {
      id: "brent-m",
      name: "Brent M.",
      totalHoursLabel: "7.0h",
      entries: [
        { time: "7:05", label: "Clock-in", statusKind: "neutral" },
        { time: "7:05", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "11:00", label: "Lunch", statusKind: "idle" },
        { time: "11:30", label: "Chesterfield Remodel", statusKind: "job" },
        { time: "2:05", label: "Clock-out", statusKind: "neutral" },
      ],
    },
  ],
};

export class InMemoryTimesheetAdapter implements TimesheetReader {
  async read(): Promise<Result<DailyTimesheet, { type: "READ_FAILED" }>> {
    return ok(MOCK_TIMESHEET);
  }
}

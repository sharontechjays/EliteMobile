import { Result, ok } from "@/types/Result";
import { HomeSummary } from "../../core/entities/HomeSummary.entity";
import { HomeSummaryReader } from "../../core/ports/HomeSummaryReader.port";

// Mirrors the "Today / Home" prototype's mock data until the local SQLite
// read-model for the clock/sync modules lands.
//
// This adapter (and its port) stays language-neutral by design — a real backend would already
// return content in the user's language, so there's no `language` parameter to thread through
// here. Language-bearing display text (day-entry names/locations/status, the date label, the
// next job's estimate line) is intentionally re-derived from this record's language-neutral
// fields (id, statusKind, estimatedHours) in useHome.viewModel.tsx using the current language's
// dictionary — the specific English strings below for those fields are placeholders that are
// never actually read by the UI. Only genuine proper nouns (crew leader name, branch, job/ticket
// names like "Chesterfield Remodel") are real, displayed values.
export class InMemoryHomeSummaryAdapter implements HomeSummaryReader {
  async today(): Promise<Result<HomeSummary, { type: "READ_FAILED" }>> {
    return ok({
      dateLabel: "Tue Jun 23",
      crewLeaderLine: "H. Jackson · Chesterfield",
      crewLeaderInitials: "HJ",
      batteryPercent: 62,
      gpsAvailable: true,
      crewStatus: "out",
      nextJob: {
        id: "chesterfield-remodel",
        name: "Chesterfield Remodel",
        sub: "Job site · est 6.5h",
        status: "pending",
        requiresTravelFirst: true,
        estimatedHours: 6.5,
      },
      dayEntries: [
        {
          id: "yard",
          name: "Yard prep",
          statusText: "Not started",
          statusKind: "idle",
          timer: "00:00",
          buttonLabel: "▶ Start",
          buttonEnabled: true,
          location: "Yard — Chesterfield",
          startTime: "—",
          endTime: "—",
        },
        {
          id: "training",
          name: "Safety training",
          statusText: "Not started",
          statusKind: "idle",
          timer: "00:00",
          buttonLabel: "▶ Start",
          buttonEnabled: true,
          location: "Yard — Chesterfield",
          startTime: "—",
          endTime: "—",
        },
        {
          id: "shop",
          name: "Shop time",
          statusText: "Not started",
          statusKind: "idle",
          timer: "00:00",
          buttonLabel: "▶ Start",
          buttonEnabled: true,
          location: "Shop — Chesterfield",
          startTime: "—",
          endTime: "—",
        },
      ],
    });
  }
}

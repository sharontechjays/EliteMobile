import { Result, ok } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { RosterWorker } from "../../core/entities/RosterWorker.entity";
import { DirectoryWorker } from "../../core/entities/DirectoryWorker.entity";
import { RosterReader } from "../../core/ports/RosterReader.port";

// Stays language-neutral by design (see InMemoryHomeSummary.adapter.ts's own comment for the
// full rationale) — `statusText` below is mock English content never actually displayed;
// useRoster.viewModel.tsx re-derives the real, translated status text from `statusKind`.
const MOCK_ROSTER: RosterWorker[] = [
  { id: "roy-brown" as WorkerId, name: "Roy Brown", initials: "RB", statusText: "Clocked in — Job 1", statusKind: "job", employeeCode: "4821" },
  { id: "brent-m" as WorkerId, name: "Brent M.", initials: "BM", statusText: "On travel", statusKind: "travel", employeeCode: "7734" },
  { id: "luis-t" as WorkerId, name: "Luis T.", initials: "LT", statusText: "Not clocked in", statusKind: "idle", employeeCode: "1029" },
  { id: "dana-k" as WorkerId, name: "Dana K.", initials: "DK", statusText: "Off today", statusKind: "off", employeeCode: "5566" },
];

const MOCK_DIRECTORY: DirectoryWorker[] = [
  { id: "maria-g", name: "Maria Gonzalez", assignedTo: null },
  { id: "kevin-t", name: "Kevin Tran", assignedTo: "North Ridge HOA crew" },
  { id: "jake-p", name: "Jake Porter", assignedTo: null },
  { id: "luis-r", name: "Luis Reyes", assignedTo: "Westgate Plaza crew" },
  { id: "anna-k", name: "Anna Kim", assignedTo: null },
];

export class InMemoryCrewRosterAdapter implements RosterReader {
  async read(): Promise<Result<RosterWorker[], { type: "READ_FAILED" }>> {
    return ok(MOCK_ROSTER);
  }

  async readDirectory(): Promise<Result<DirectoryWorker[], { type: "READ_FAILED" }>> {
    return ok(MOCK_DIRECTORY);
  }
}

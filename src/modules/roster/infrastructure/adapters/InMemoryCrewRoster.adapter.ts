import { Result, ok, fail } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { PunchDirection } from "@modules/clock/core/entities/AttestationWorker.entity";
import { WorkerStatusRecorder } from "@modules/clock/core/ports/WorkerStatusRecorder.port";
import { RosterWorker } from "../../core/entities/RosterWorker.entity";
import { DirectoryWorker } from "../../core/entities/DirectoryWorker.entity";
import { RosterReader } from "../../core/ports/RosterReader.port";

// Stays language-neutral by design (see InMemoryHomeSummary.adapter.ts's own comment for the
// full rationale) — `statusText` below is mock English content never actually displayed;
// useRoster.viewModel.tsx re-derives the real, translated status text from `statusKind`.
const MOCK_ROSTER: RosterWorker[] = [
  {
    id: "roy-brown" as WorkerId,
    name: "Roy Brown",
    initials: "RB",
    statusText: "Clocked in — Job 1",
    statusKind: "job",
    employeeCode: "4821",
  },
  {
    id: "brent-m" as WorkerId,
    name: "Brent M.",
    initials: "BM",
    statusText: "On travel",
    statusKind: "travel",
    employeeCode: "7734",
  },
  {
    id: "luis-t" as WorkerId,
    name: "Luis T.",
    initials: "LT",
    statusText: "Not clocked in",
    statusKind: "idle",
    employeeCode: "1029",
  },
  {
    id: "dana-k" as WorkerId,
    name: "Dana K.",
    initials: "DK",
    statusText: "Off today",
    statusKind: "off",
    employeeCode: "5566",
  },
];

const MOCK_DIRECTORY: DirectoryWorker[] = [
  { id: "maria-g", name: "Maria Gonzalez", assignedTo: null },
  { id: "kevin-t", name: "Kevin Tran", assignedTo: "North Ridge HOA crew" },
  { id: "jake-p", name: "Jake Porter", assignedTo: null },
  { id: "luis-r", name: "Luis Reyes", assignedTo: "Westgate Plaza crew" },
  { id: "anna-k", name: "Anna Kim", assignedTo: null },
];

// Mock English content for the two statusKinds a punch can produce — never actually displayed,
// same rationale as MOCK_ROSTER's own statusText above.
const STATUS_TEXT_FOR_PUNCHED_KIND: Record<"job" | "idle", string> = {
  job: "Clocked in — Job 1",
  idle: "Not clocked in",
};

export class InMemoryCrewRosterAdapter implements RosterReader, WorkerStatusRecorder {
  async read(): Promise<Result<RosterWorker[], { type: "READ_FAILED" }>> {
    return ok(MOCK_ROSTER);
  }

  async readDirectory(): Promise<Result<DirectoryWorker[], { type: "READ_FAILED" }>> {
    return ok(MOCK_DIRECTORY);
  }

  // Mutates the same in-memory MOCK_ROSTER array `read()` returns, so a punch confirmed via the
  // attestation flow is immediately reflected the next time the roster is read — see
  // ConfirmAttestation.usecase.ts, which calls this right after recording the punch itself.
  async applyPunch(workerId: WorkerId, direction: PunchDirection): Promise<Result<void, { type: "UPDATE_FAILED" }>> {
    const index = MOCK_ROSTER.findIndex((worker) => worker.id === workerId);
    if (index === -1) return fail({ type: "UPDATE_FAILED" });

    const statusKind = direction === "IN" ? "job" : "idle";
    MOCK_ROSTER[index] = { ...MOCK_ROSTER[index], statusKind, statusText: STATUS_TEXT_FOR_PUNCHED_KIND[statusKind] };
    return ok(undefined);
  }
}

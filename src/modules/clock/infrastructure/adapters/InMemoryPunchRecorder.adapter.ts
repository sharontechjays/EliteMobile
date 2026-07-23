import { Result, ok } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { PunchDirection } from "../../core/entities/AttestationWorker.entity";
import { PunchRecorder } from "../../core/ports/PunchRecorder.port";

// Deliberately a no-op stub, not a broken implementation — there's no real punch ledger yet
// (see elite-mobile-clean-architecture: every adapter today is an in-memory mock), so recording a
// punch here only ever needs to satisfy the PunchRecorder contract for the attestation flow's own
// UI/timing to work, not to actually persist anything.
export class InMemoryPunchRecorderAdapter implements PunchRecorder {
  async recordPunch(_workerId: WorkerId, _direction: PunchDirection): Promise<Result<void, { type: "RECORD_FAILED" }>> {
    return ok(undefined);
  }
}

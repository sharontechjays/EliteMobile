import { Result } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { PunchDirection } from "../entities/AttestationWorker.entity";
import { PunchRecorder } from "../ports/PunchRecorder.port";
import { WorkerStatusRecorder } from "../ports/WorkerStatusRecorder.port";

export class ConfirmAttestationUseCase {
  constructor(
    private readonly recorder: PunchRecorder,
    private readonly statusRecorder: WorkerStatusRecorder,
  ) {}

  async execute(workerId: WorkerId, direction: PunchDirection): Promise<Result<void, { type: "RECORD_FAILED" }>> {
    const result = await this.recorder.recordPunch(workerId, direction);
    if (!result.success) return result;
    // The punch ledger (recorder) and the roster's displayed status (statusRecorder) are two
    // separate concerns today — a failure updating the latter shouldn't roll back a punch that
    // was already successfully recorded, so its result isn't folded into this method's own.
    await this.statusRecorder.applyPunch(workerId, direction);
    return result;
  }
}

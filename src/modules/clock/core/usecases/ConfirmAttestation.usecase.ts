import { Result } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { PunchDirection } from "../entities/AttestationWorker.entity";
import { PunchRecorder } from "../ports/PunchRecorder.port";

export class ConfirmAttestationUseCase {
  constructor(private readonly recorder: PunchRecorder) {}

  async execute(workerId: WorkerId, direction: PunchDirection): Promise<Result<void, { type: "RECORD_FAILED" }>> {
    return this.recorder.recordPunch(workerId, direction);
  }
}

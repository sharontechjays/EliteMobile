import { Result, ok } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { PunchDirection } from "../../core/entities/AttestationWorker.entity";
import { PunchRecorder } from "../../core/ports/PunchRecorder.port";

export class InMemoryPunchRecorderAdapter implements PunchRecorder {
  async recordPunch(_workerId: WorkerId, _direction: PunchDirection): Promise<Result<void, { type: "RECORD_FAILED" }>> {
    return ok(undefined);
  }
}

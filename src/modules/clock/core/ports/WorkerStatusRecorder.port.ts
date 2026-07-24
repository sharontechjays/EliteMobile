import { Result } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { PunchDirection } from "../entities/AttestationWorker.entity";

export interface WorkerStatusRecorder {
  applyPunch(workerId: WorkerId, direction: PunchDirection): Promise<Result<void, { type: "UPDATE_FAILED" }>>;
}

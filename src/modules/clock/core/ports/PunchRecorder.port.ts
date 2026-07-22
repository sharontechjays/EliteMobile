import { Result } from "@/types/Result";
import { WorkerId } from "@/types/ids";
import { PunchDirection } from "../entities/AttestationWorker.entity";

export interface PunchRecorder {
  recordPunch(workerId: WorkerId, direction: PunchDirection): Promise<Result<void, { type: "RECORD_FAILED" }>>;
}

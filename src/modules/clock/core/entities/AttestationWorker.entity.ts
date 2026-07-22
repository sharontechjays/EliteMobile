import { WorkerId } from "@/types/ids";

export type PunchDirection = "IN" | "OUT";

export interface AttestationWorker {
  id: WorkerId;
  name: string;
  initials: string;
  direction: PunchDirection;
  employeeCode: string;
}

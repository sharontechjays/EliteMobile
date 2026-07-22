import { WorkerId } from "@/types/ids";

export interface RosterWorker {
  id: WorkerId;
  name: string;
  initials: string;
  statusText: string;
  statusKind: "job" | "travel" | "idle" | "off";
  employeeCode: string;
}

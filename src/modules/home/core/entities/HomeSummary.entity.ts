import { WorkerId } from "@/types/ids";

export type CrewStatus = "out" | "in" | "travel" | "job" | "lunch";
export type JobStatus = "pending" | "active" | "done";

export interface NextJob {
  id: string;
  name: string;
  sub: string;
  status: JobStatus;
  /** GPS-based: crew hasn't arrived at this job's site yet, so travel must be logged first. */
  requiresTravelFirst: boolean;
  estimatedHours: number;
}

export interface DayEntry {
  id: string;
  name: string;
  statusText: string;
  statusKind: "job" | "travel" | "idle" | "off";
  timer: string;
  buttonLabel: string;
  buttonEnabled: boolean;
  location: string;
  startTime: string;
  endTime: string;
}

export interface HomeSummary {
  dateLabel: string;
  crewLeaderLine: string;
  crewLeaderInitials: WorkerId | string;
  batteryPercent: number;
  gpsAvailable: boolean;
  crewStatus: CrewStatus;
  nextJob: NextJob;
  dayEntries: DayEntry[];
}

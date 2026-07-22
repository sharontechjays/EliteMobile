export interface TimesheetEntry {
  time: string;
  label: string;
  statusKind: "job" | "travel" | "idle" | "off" | "neutral";
}

export interface CrewMemberTimesheet {
  id: string;
  name: string;
  entries: TimesheetEntry[];
  totalHoursLabel: string;
}

export interface DailyTimesheet {
  crew: CrewMemberTimesheet[];
}

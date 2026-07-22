export interface JobTicketCrewMember {
  id: string;
  name: string;
  initials: string;
  onJob: boolean;
}

export interface JobTicket {
  id: string;
  name: string;
  tag: string;
  sub: string;
  statusLabel: string;
  statusKind: "job" | "travel" | "idle" | "off";
  site: string;
  address: string;
  estimatedHours: number;
  crew: JobTicketCrewMember[];
  nextTicketId?: string;
}

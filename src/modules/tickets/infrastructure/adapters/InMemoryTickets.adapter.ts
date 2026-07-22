import { Result, ok, fail } from "@/types/Result";
import { JobTicket } from "../../core/entities/JobTicket.entity";
import { TicketsReader } from "../../core/ports/TicketsReader.port";

// Stays language-neutral by design (see InMemoryHomeSummary.adapter.ts's own comment for the
// full rationale) — `sub`/`statusLabel` below are mock English content never actually
// displayed; useTickets.viewModel.tsx and useTicketDetail.viewModel.tsx re-derive the real,
// translated text from `site`/`statusKind`/`estimatedHours`. `name`/`address` are genuine
// proper nouns and are displayed as-is.
const MOCK_TICKETS: JobTicket[] = [
  {
    id: "chesterfield-remodel",
    name: "Chesterfield Remodel",
    tag: "M",
    sub: "Job site · est 6.5h",
    statusLabel: "In progress",
    statusKind: "job",
    site: "chesterfield",
    address: "412 Chesterfield Ave",
    estimatedHours: 6.5,
    crew: [
      { id: "roy-brown", name: "Roy Brown", initials: "RB", onJob: true },
      { id: "brent-m", name: "Brent M.", initials: "BM", onJob: true },
    ],
    nextTicketId: "cornerstone-mall",
  },
  {
    id: "cornerstone-mall",
    name: "Cornerstone Mall",
    tag: "E",
    sub: "Job site · est 3h",
    statusLabel: "Not started",
    statusKind: "idle",
    site: "cornerstone",
    address: "100 Main St",
    estimatedHours: 3,
    crew: [
      { id: "roy-brown", name: "Roy Brown", initials: "RB", onJob: false },
      { id: "brent-m", name: "Brent M.", initials: "BM", onJob: false },
    ],
  },
  {
    id: "yard-prep",
    name: "Yard prep",
    tag: "M",
    sub: "Yard · est 1h",
    statusLabel: "Not started",
    statusKind: "idle",
    site: "yard",
    address: "Company Yard",
    estimatedHours: 1,
    crew: [],
  },
];

export class InMemoryTicketsAdapter implements TicketsReader {
  async read(): Promise<Result<JobTicket[], { type: "READ_FAILED" }>> {
    return ok(MOCK_TICKETS);
  }

  async readOne(id: string): Promise<Result<JobTicket, { type: "NOT_FOUND" } | { type: "READ_FAILED" }>> {
    const found = MOCK_TICKETS.find((t) => t.id === id);
    return found ? ok(found) : fail({ type: "NOT_FOUND" });
  }
}

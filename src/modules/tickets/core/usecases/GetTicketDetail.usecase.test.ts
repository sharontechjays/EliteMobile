import { GetTicketDetailUseCase } from "./GetTicketDetail.usecase";
import { TicketsReader } from "../ports/TicketsReader.port";
import { ok, fail } from "@/types/Result";
import { JobTicket } from "../entities/JobTicket.entity";

const TICKET: JobTicket = {
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
};

describe("GetTicketDetailUseCase", () => {
  it("returns the ticket when found", async () => {
    const reader: TicketsReader = { read: async () => ok([]), readOne: async () => ok(TICKET) };
    const result = await new GetTicketDetailUseCase(reader).execute("yard-prep");
    expect(result).toEqual(ok(TICKET));
  });

  it("passes through a NOT_FOUND failure", async () => {
    const reader: TicketsReader = { read: async () => ok([]), readOne: async () => fail({ type: "NOT_FOUND" }) };
    const result = await new GetTicketDetailUseCase(reader).execute("missing-id");
    expect(result).toEqual(fail({ type: "NOT_FOUND" }));
  });
});

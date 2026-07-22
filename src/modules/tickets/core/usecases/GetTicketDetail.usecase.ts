import { Result } from "@/types/Result";
import { JobTicket } from "../entities/JobTicket.entity";
import { TicketsReader } from "../ports/TicketsReader.port";

export class GetTicketDetailUseCase {
  constructor(private readonly reader: TicketsReader) {}

  async execute(id: string): Promise<Result<JobTicket, { type: "NOT_FOUND" } | { type: "READ_FAILED" }>> {
    return this.reader.readOne(id);
  }
}

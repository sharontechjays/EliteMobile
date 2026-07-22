import { Result } from "@/types/Result";
import { JobTicket } from "../entities/JobTicket.entity";
import { TicketsReader } from "../ports/TicketsReader.port";

export class GetTodaysTicketsUseCase {
  constructor(private readonly reader: TicketsReader) {}

  async execute(): Promise<Result<JobTicket[], { type: "READ_FAILED" }>> {
    return this.reader.read();
  }
}

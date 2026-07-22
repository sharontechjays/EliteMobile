import { Result } from "@/types/Result";
import { RosterWorker } from "../entities/RosterWorker.entity";
import { RosterReader } from "../ports/RosterReader.port";

export class GetCrewRosterUseCase {
  constructor(private readonly reader: RosterReader) {}

  async execute(): Promise<Result<RosterWorker[], { type: "READ_FAILED" }>> {
    return this.reader.read();
  }
}

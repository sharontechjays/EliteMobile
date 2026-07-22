import { Result } from "@/types/Result";
import { DirectoryWorker } from "../entities/DirectoryWorker.entity";
import { RosterReader } from "../ports/RosterReader.port";

export class GetDirectoryUseCase {
  constructor(private readonly reader: RosterReader) {}

  async execute(): Promise<Result<DirectoryWorker[], { type: "READ_FAILED" }>> {
    return this.reader.readDirectory();
  }
}

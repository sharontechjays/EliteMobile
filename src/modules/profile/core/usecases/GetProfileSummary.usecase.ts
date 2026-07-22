import { Result } from "@/types/Result";
import { ProfileSummary } from "../entities/ProfileSummary.entity";
import { ProfileReader } from "../ports/ProfileReader.port";

export class GetProfileSummaryUseCase {
  constructor(private readonly reader: ProfileReader) {}

  async execute(): Promise<Result<ProfileSummary, { type: "READ_FAILED" }>> {
    return this.reader.read();
  }
}

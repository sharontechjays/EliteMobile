import { Result } from "@/types/Result";
import { HomeSummary } from "../entities/HomeSummary.entity";
import { HomeSummaryReader } from "../ports/HomeSummaryReader.port";

export class GetHomeSummaryUseCase {
  constructor(private readonly reader: HomeSummaryReader) {}

  async execute(): Promise<Result<HomeSummary, { type: "READ_FAILED" }>> {
    return this.reader.today();
  }
}

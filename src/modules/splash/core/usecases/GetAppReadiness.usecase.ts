import { Result } from "@/types/Result";
import { AppReadiness } from "../entities/AppReadiness.entity";
import { AppReadinessReader } from "../ports/AppReadinessReader.port";

export class GetAppReadinessUseCase {
  constructor(private readonly reader: AppReadinessReader) {}

  async execute(): Promise<Result<AppReadiness, { type: "READ_FAILED" }>> {
    return this.reader.read();
  }
}

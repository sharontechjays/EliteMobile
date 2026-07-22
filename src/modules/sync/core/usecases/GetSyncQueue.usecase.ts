import { Result } from "@/types/Result";
import { SyncQueueItem } from "../entities/SyncQueueItem.entity";
import { SyncQueueReader } from "../ports/SyncQueueReader.port";

export class GetSyncQueueUseCase {
  constructor(private readonly reader: SyncQueueReader) {}

  async execute(): Promise<Result<SyncQueueItem[], { type: "READ_FAILED" }>> {
    return this.reader.read();
  }
}

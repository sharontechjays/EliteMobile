import { Result } from "@/types/Result";
import { SyncQueueItem } from "../entities/SyncQueueItem.entity";

export interface SyncQueueReader {
  read(): Promise<Result<SyncQueueItem[], { type: "READ_FAILED" }>>;
}

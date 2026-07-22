import { Result, ok } from "@/types/Result";
import { ISO8601 } from "@/types/common";
import { AppReadiness } from "../../core/entities/AppReadiness.entity";
import { AppReadinessReader } from "../../core/ports/AppReadinessReader.port";
import { KeyValueStore } from "@modules/shared/storage/KeyValueStore.port";

const LAST_SYNC_KEY = "app.lastSyncAt";

export class LocalAppReadinessAdapter implements AppReadinessReader {
  constructor(private readonly store: KeyValueStore) {}

  async read(): Promise<Result<AppReadiness, { type: "READ_FAILED" }>> {
    const lastSyncAt = this.store.getString(LAST_SYNC_KEY) as ISO8601 | null;
    return ok({ lastSyncAt, languageSetByProfile: true });
  }
}

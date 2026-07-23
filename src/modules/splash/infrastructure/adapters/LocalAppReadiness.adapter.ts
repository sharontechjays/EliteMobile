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
    // languageSetByProfile is always true today — there's no real employee-profile backend to
    // derive it from yet, so the splash copy's "Language set by employee profile" note is
    // presented unconditionally rather than gated on a real signal.
    return ok({ lastSyncAt, languageSetByProfile: true });
  }
}

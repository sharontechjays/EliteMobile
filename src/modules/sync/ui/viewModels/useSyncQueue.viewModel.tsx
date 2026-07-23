import { useCallback, useEffect, useState } from "react";
import { useDependencies } from "@app/react/useDependencies";
import { useLanguage } from "@app/react/language/useLanguage";
import { GetSyncQueueUseCase } from "../../core/usecases/GetSyncQueue.usecase";
import { SyncQueueItem } from "../../core/entities/SyncQueueItem.entity";

export const useSyncQueueViewModel = () => {
  const { syncQueueReader } = useDependencies();
  const { strings } = useLanguage();
  const mock = strings.mockData;
  const [items, setItems] = useState<SyncQueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    new GetSyncQueueUseCase(syncQueueReader).execute().then((result) => {
      if (result.success) setItems(result.data);
    });
  }, [syncQueueReader]);

  useEffect(() => {
    load();
  }, [load]);

  const onSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    // No real sync engine exists yet (see elite-mobile-clean-architecture: the Sync Queue screen
    // is read-only over mock data) — this fixed 400ms delay only simulates "syncing" long enough
    // for the button's own loading state to be visible, it isn't tied to any real network timing
    // and the queue's contents never actually change as a result.
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSyncing(false);
  }, [syncing]);

  // item.label is mock English content (see InMemorySyncQueue.adapter.ts's own comment) — the
  // real translated text is derived here from `kind` plus the language-neutral data fields.
  const rows = items.map((item) => {
    let label = item.label;
    switch (item.kind) {
      case "clockIn":
        label = mock.syncClockIn(item.personName ?? "");
        break;
      case "photo":
        label = mock.syncPhoto(item.photoCount ?? 0, item.place ?? "");
        break;
      case "note":
        label = mock.syncNote;
        break;
      case "rejectedOverlap":
        label = mock.syncRejectedOverlap(item.personName ?? "");
        break;
    }
    return { ...item, label };
  });

  return {
    state: { items: rows, syncing },
    handlers: { onSyncNow },
  };
};

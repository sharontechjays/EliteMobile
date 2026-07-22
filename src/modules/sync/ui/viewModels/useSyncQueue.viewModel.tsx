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

import { Result, ok } from "@/types/Result";
import { SyncQueueItem } from "../../core/entities/SyncQueueItem.entity";
import { SyncQueueReader } from "../../core/ports/SyncQueueReader.port";

// Stays language-neutral by design (see InMemoryHomeSummary.adapter.ts's own comment for the
// full rationale) — `label` below is mock English content never actually displayed;
// useSyncQueue.viewModel.tsx re-derives the real, translated label from `kind` plus the
// language-neutral `personName`/`photoCount`/`place` fields.
const MOCK_QUEUE: SyncQueueItem[] = [
  { id: "1", time: "7:02", label: "Clock-in — Roy B.", status: "queued", kind: "clockIn", personName: "Roy B." },
  { id: "2", time: "9:14", label: "Photo ×2 — Mall", status: "queued", kind: "photo", photoCount: 2, place: "Mall" },
  { id: "3", time: "9:15", label: "Note (extra work)", status: "queued", kind: "note" },
  {
    id: "4",
    time: "11:00",
    label: "✗ Rejected — punch overlap, Brent M.",
    status: "rejected",
    rejectionReason: "OVERLAP",
    kind: "rejectedOverlap",
    personName: "Brent M.",
  },
];

export class InMemorySyncQueueAdapter implements SyncQueueReader {
  async read(): Promise<Result<SyncQueueItem[], { type: "READ_FAILED" }>> {
    return ok(MOCK_QUEUE);
  }
}

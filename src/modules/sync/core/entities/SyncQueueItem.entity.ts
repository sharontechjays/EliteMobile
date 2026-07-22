export type SyncQueueStatus = "queued" | "rejected";

// Distinguishes what kind of record this queue entry represents — needed because `label` alone
// (mock English text) doesn't carry enough language-neutral structure for the UI to derive a
// translated label from (unlike statusKind-style fields elsewhere in this app).
export type SyncQueueItemKind = "clockIn" | "photo" | "note" | "rejectedOverlap";

export interface SyncQueueItem {
  id: string;
  time: string;
  label: string;
  status: SyncQueueStatus;
  rejectionReason?: string;
  kind: SyncQueueItemKind;
  /** clockIn, rejectedOverlap: the worker's name (a proper noun, not translated). */
  personName?: string;
  /** photo: number of photos and the place name (a proper noun, not translated). */
  photoCount?: number;
  place?: string;
}

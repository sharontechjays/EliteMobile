import { SyncQueueItem } from "../entities/SyncQueueItem.entity";

export interface SyncStatus {
  state: "synced" | "pending";
  pendingCount: number;
  rejectedCount: number;
}

// Any item not cleanly synced — queued or rejected — surfaces as "pending" on the topbar
// pill; rejected items still need action, so they count toward the same visible total.
export function deriveSyncStatus(items: SyncQueueItem[]): SyncStatus {
  const pendingCount = items.filter((item) => item.status === "queued").length;
  const rejectedCount = items.filter((item) => item.status === "rejected").length;
  return {
    state: pendingCount + rejectedCount > 0 ? "pending" : "synced",
    pendingCount,
    rejectedCount,
  };
}
